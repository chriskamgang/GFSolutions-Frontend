import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message, Modal, Form, Input, InputNumber,
  Statistic, Descriptions, Tabs, Alert, Popconfirm,
} from 'antd';
import {
  PlusOutlined, BankOutlined, EyeOutlined, TeamOutlined, DollarOutlined,
  SendOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [salaryVisible, setSalaryVisible] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [salaryPayments, setSalaryPayments] = useState<{ employeeName: string; employeePhone: string; amount: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { canCreate, isReadOnly } = usePermissions();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/companies');
      setCompanies(data.data || data);
    } catch { message.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post('/companies', values);
      message.success('Entreprise creee');
      setCreateVisible(false);
      form.resetFields();
      fetchCompanies();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleViewDetail = async (companyId: string) => {
    try {
      const [detail, empRes, histRes] = await Promise.all([
        api.get(`/companies/${companyId}`),
        api.get(`/companies/${companyId}/employees`),
        api.get(`/companies/${companyId}/salary-history`),
      ]);
      setSelectedCompany(detail.data);
      setEmployees(empRes.data || []);
      setSalaryHistory(histRes.data || []);
      setDetailVisible(true);
    } catch { message.error('Erreur chargement detail'); }
  };

  const openSalaryModal = () => {
    // Pre-remplir avec les employes
    setSalaryPayments(employees.map(e => ({
      employeeName: `${e.firstName} ${e.lastName}`,
      employeePhone: e.phone,
      amount: 0,
    })));
    setSalaryVisible(true);
  };

  const handleProcessSalary = async () => {
    const validPayments = salaryPayments.filter(p => p.amount > 0);
    if (validPayments.length === 0) {
      message.warning('Aucun montant saisi');
      return;
    }
    try {
      setSubmitting(true);
      await api.post(`/companies/${selectedCompany.id}/salary-batch`, {
        payments: validPayments,
      });
      message.success(`Virement traite : ${validPayments.length} employe(s)`);
      setSalaryVisible(false);
      handleViewDetail(selectedCompany.id);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur virement');
    } finally { setSubmitting(false); }
  };

  const totalEmployees = companies.reduce((sum, c) => sum + (c._count?.employees || 0), 0);

  const columns = [
    { title: 'Raison sociale', dataIndex: 'name', render: (v: string) => <strong><BankOutlined style={{ marginRight: 6 }} />{v}</strong> },
    { title: 'N° Enregistrement', dataIndex: 'registrationNumber' },
    { title: 'Ville', dataIndex: 'city' },
    { title: 'Contact', dataIndex: 'contactPerson' },
    { title: 'Telephone', dataIndex: 'phone' },
    { title: 'Employes', key: 'employees', width: 90, align: 'center' as const,
      render: (_: any, r: any) => <Tag icon={<TeamOutlined />}>{r._count?.employees || 0}</Tag>,
    },
    { title: 'Virements', key: 'batches', width: 90, align: 'center' as const,
      render: (_: any, r: any) => <Tag>{r._count?.salaryBatches || 0}</Tag>,
    },
    { title: 'Statut', dataIndex: 'isActive', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    { title: 'Actions', key: 'actions', width: 100,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)}>Detail</Button>
      ),
    },
  ];

  const employeeColumns = [
    { title: 'Nom', key: 'name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'N° Client', dataIndex: 'clientNumber' },
    { title: 'Telephone', dataIndex: 'phone' },
    { title: 'Compte courant', key: 'account',
      render: (_: any, r: any) => {
        const acc = r.accounts?.find((a: any) => a.type === 'CURRENT');
        return acc ? `${acc.accountNumber} (${Number(acc.balance).toLocaleString('fr-FR')} F)` : <Text type="secondary">Aucun</Text>;
      },
    },
  ];

  const batchColumns = [
    { title: 'Reference', dataIndex: 'reference' },
    { title: 'Employes', dataIndex: 'totalEmployees' },
    { title: 'Montant total', dataIndex: 'totalAmount',
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} FCFA`,
    },
    { title: 'Frais', dataIndex: 'fees', render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F` },
    { title: 'Statut', dataIndex: 'status',
      render: (s: string) => <Tag color={s === 'COMPLETED' ? 'green' : 'orange'}>{s}</Tag>,
    },
    { title: 'Date', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}><BankOutlined /> Entreprises & Salaires</Title>
            <Text type="secondary">Gestion des entreprises et virements salaires groupes</Text>
          </Col>
          <Col>
            {canCreate('COMPANIES') && !isReadOnly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateVisible(true); }}>
                Nouvelle entreprise
              </Button>
            )}
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Entreprises" value={companies.length} /></Card></Col>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Employes total" value={totalEmployees} valueStyle={{ color: '#52c41a' }} /></Card></Col>
      </Row>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Table dataSource={companies} columns={columns} loading={loading} rowKey="id" size="small" />
      </Card>

      {/* Modal creation */}
      <Modal title="Nouvelle entreprise" open={createVisible} onCancel={() => setCreateVisible(false)}
        onOk={handleCreate} confirmLoading={submitting} okText="Creer" width={550}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Raison sociale" rules={[{ required: true }]}>
            <Input placeholder="Ex: SABC, MTN Cameroon..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="registrationNumber" label="N° Enregistrement (RCCM)" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="Personne contact" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Adresse" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="Ville" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Telephone" rules={[{ required: true }]}>
                <Input placeholder="+237..." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detail entreprise */}
      <Modal title={`${selectedCompany?.name}`} open={detailVisible}
        onCancel={() => setDetailVisible(false)} footer={null} width={900}>
        {selectedCompany && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Raison sociale">{selectedCompany.name}</Descriptions.Item>
              <Descriptions.Item label="RCCM">{selectedCompany.registrationNumber}</Descriptions.Item>
              <Descriptions.Item label="Adresse">{selectedCompany.address}</Descriptions.Item>
              <Descriptions.Item label="Ville">{selectedCompany.city}</Descriptions.Item>
              <Descriptions.Item label="Contact">{selectedCompany.contactPerson}</Descriptions.Item>
              <Descriptions.Item label="Telephone">{selectedCompany.phone}</Descriptions.Item>
            </Descriptions>

            <Tabs items={[
              {
                key: 'employees',
                label: <span><TeamOutlined /> Employes ({employees.length})</span>,
                children: (
                  <Table dataSource={employees} columns={employeeColumns} rowKey="id" size="small" pagination={{ pageSize: 10 }} />
                ),
              },
              {
                key: 'salary',
                label: <span><DollarOutlined /> Virements salaires</span>,
                children: (
                  <div>
                    {!isReadOnly && (
                      <Button type="primary" icon={<SendOutlined />} style={{ marginBottom: 16 }}
                        onClick={openSalaryModal} disabled={employees.length === 0}>
                        Nouveau virement de salaires
                      </Button>
                    )}
                    {employees.length === 0 && (
                      <Alert type="info" showIcon message="Aucun employe enregistre. Les employes sont des clients avec un lien vers cette entreprise." style={{ marginBottom: 16 }} />
                    )}
                    <Table dataSource={salaryHistory} columns={batchColumns} rowKey="id" size="small" />
                  </div>
                ),
              },
            ]} />
          </>
        )}
      </Modal>

      {/* Modal virement salaires */}
      <Modal title={`Virement de salaires — ${selectedCompany?.name}`} open={salaryVisible}
        onCancel={() => setSalaryVisible(false)} onOk={handleProcessSalary}
        confirmLoading={submitting} okText="Executer le virement" width={600}>
        <Alert type="warning" showIcon message="Les montants seront credites sur les comptes courants des employes." style={{ marginBottom: 16 }} />
        <Table
          dataSource={salaryPayments}
          rowKey="employeePhone"
          size="small"
          pagination={false}
          columns={[
            { title: 'Employe', dataIndex: 'employeeName' },
            { title: 'Telephone', dataIndex: 'employeePhone' },
            { title: 'Montant (FCFA)', key: 'amount', width: 180,
              render: (_: any, r: any, index: number) => (
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  step={10000}
                  value={r.amount}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={v => v!.replace(/\s/g, '') as any}
                  onChange={val => {
                    const updated = [...salaryPayments];
                    updated[index].amount = val || 0;
                    setSalaryPayments(updated);
                  }}
                />
              ),
            },
          ]}
          summary={() => {
            const total = salaryPayments.reduce((sum, p) => sum + p.amount, 0);
            const fees = Math.round(total * 0.005);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ fontWeight: 700 }}>
                  <Table.Summary.Cell index={0} colSpan={2}>Total + Frais (0.5%)</Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>{total.toLocaleString('fr-FR')} + {fees.toLocaleString('fr-FR')} = {(total + fees).toLocaleString('fr-FR')} FCFA</Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Modal>
    </div>
  );
}
