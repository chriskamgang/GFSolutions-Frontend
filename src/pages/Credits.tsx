import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Button, Statistic, Space,
  Tabs, Form, InputNumber, Select, DatePicker, Descriptions, Alert, message,
  Modal, Input, Popconfirm, Tooltip,
} from 'antd';
import {
  PlusOutlined, CalculatorOutlined, UnorderedListOutlined,
  ClockCircleOutlined, DollarOutlined, PercentageOutlined,
  SafetyOutlined, BankOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, DownloadOutlined, FilePdfOutlined,
  RadarChartOutlined, RetweetOutlined,
  WarningOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { Progress } from 'antd';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// ===================== SIMULATEUR TAB =====================
function SimulateurTab() {
  const [simulation, setSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSimulate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const { data } = await api.post('/credits/simulate', {
        amount: values.amount,
        interestRate: values.rateType === 'monthly' ? values.rate * 12 : values.rate,
        durationMonths: values.duration,
        repaymentType: values.method,
      });
      setSimulation(data);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    form.resetFields();
    setSimulation(null);
  };

  const insurance = simulation ? Math.round(simulation.amount * 0.02) : 0;

  const scheduleColumns = [
    { title: '#', dataIndex: 'month', key: 'month', width: 40 },
    { title: 'Date echeance', key: 'date',
      render: (_: any, r: any) => {
        const d = dayjs().add(r.month, 'month');
        return d.format('DD/MM/YYYY');
      },
    },
    { title: 'Capital', dataIndex: 'principal', key: 'principal',
      render: (v: number) => `${v.toLocaleString('fr-FR')} FCFA`,
    },
    { title: 'Interets', dataIndex: 'interest', key: 'interest',
      render: (v: number) => `${v.toLocaleString('fr-FR')} FCFA`,
    },
    { title: 'Assurance', key: 'assurance',
      render: (_: any, r: any) => r.month === 1 ? `${insurance.toLocaleString('fr-FR')} FCFA` : '-',
    },
    { title: 'Total du', dataIndex: 'payment', key: 'payment',
      render: (v: number, r: any) => {
        const total = r.month === 1 ? v + insurance : v;
        return <strong>{total.toLocaleString('fr-FR')} FCFA</strong>;
      },
    },
    { title: 'Solde restant', dataIndex: 'remainingBalance', key: 'remaining',
      render: (v: number) => `${v.toLocaleString('fr-FR')} FCFA`,
    },
  ];

  return (
    <div>
      <Row gutter={24}>
        {/* Colonne gauche : formulaire */}
        <Col xs={24} lg={8}>
          {/* Parametres du pret */}
          <Card
            title={
              <span style={{ color: '#fff' }}>
                <BankOutlined /> PARAMETRES DU PRET
              </span>
            }
            headStyle={{ background: '#1B2A4A', color: '#fff', borderRadius: '8px 8px 0 0' }}
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                amount: 1000000,
                rate: 3,
                rateType: 'monthly',
                duration: 12,
                frequency: 'MONTHLY',
                method: 'DEGRESSIVE',
                startDate: dayjs(),
                grace: 0,
              }}
            >
              <Form.Item label="Produit de credit (optionnel)">
                <Select placeholder="-- Saisie libre --" allowClear>
                  <Select.Option value="personnel">Credit Personnel</Select.Option>
                  <Select.Option value="commercial">Credit Commercial</Select.Option>
                  <Select.Option value="agricole">Credit Agricole</Select.Option>
                  <Select.Option value="immobilier">Credit Immobilier</Select.Option>
                </Select>
              </Form.Item>

              <div style={{ background: '#f6f8fa', padding: '12px', borderRadius: 8, marginBottom: 16 }}>
                <Text strong style={{ color: '#1B2A4A', display: 'block', marginBottom: 8 }}>
                  <DollarOutlined /> Parametres financiers
                </Text>
                <Row gutter={12}>
                  <Col span={16}>
                    <Form.Item name="amount" label="Montant du pret" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                      <InputNumber
                        style={{ width: '100%' }}
                        min={50000}
                        step={50000}
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                        addonAfter="FCFA"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Devise">
                      <Select defaultValue="XAF" disabled>
                        <Select.Option value="XAF">FCFA</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={10}>
                    <Form.Item name="rate" label="Taux" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                      <InputNumber style={{ width: '100%' }} min={0.1} max={50} step={0.5} addonAfter="%" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="rateType" label="Periode" style={{ marginBottom: 8 }}>
                      <Select>
                        <Select.Option value="monthly">/mois</Select.Option>
                        <Select.Option value="annual">/an</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="duration" label="Duree (mois)" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                      <InputNumber style={{ width: '100%' }} min={1} max={60} addonAfter="mois" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div style={{ background: '#f6f8fa', padding: '12px', borderRadius: 8, marginBottom: 16 }}>
                <Text strong style={{ color: '#1B2A4A', display: 'block', marginBottom: 8 }}>
                  <ClockCircleOutlined /> Remboursement
                </Text>
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item name="frequency" label="Frequence" style={{ marginBottom: 8 }}>
                      <Select>
                        <Select.Option value="MONTHLY">Mensuel</Select.Option>
                        <Select.Option value="WEEKLY">Hebdo</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="startDate" label="Date debut" style={{ marginBottom: 8 }}>
                      <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="grace" label="Grace (j)" style={{ marginBottom: 8 }}>
                      <InputNumber style={{ width: '100%' }} min={0} max={90} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="method" label="Methode de calcul" style={{ marginBottom: 0 }}>
                  <Select>
                    <Select.Option value="DEGRESSIVE">Amortissement degressif</Select.Option>
                    <Select.Option value="CONSTANT">Annuite constante</Select.Option>
                  </Select>
                </Form.Item>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Interets calcules sur le capital restant du. Standard bancaire international.
                </Text>
              </div>

              <Space>
                <Button type="primary" onClick={handleSimulate} loading={loading} icon={<CalculatorOutlined />}>
                  Simuler
                </Button>
                <Button onClick={handleReset}>Reinitialiser</Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* Colonne droite : resultats */}
        <Col xs={24} lg={16}>
          {simulation ? (
            <>
              {/* 4 cartes KPI */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} md={6}>
                  <div style={{
                    background: 'linear-gradient(135deg, #1B2A4A 0%, #2a3f6a 100%)',
                    borderRadius: 8, padding: '16px 12px', textAlign: 'center', color: '#fff',
                  }}>
                    <BankOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {simulation.amount.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Capital</div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{
                    background: 'linear-gradient(135deg, #F5A623 0%, #d4900e 100%)',
                    borderRadius: 8, padding: '16px 12px', textAlign: 'center', color: '#fff',
                  }}>
                    <PercentageOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {simulation.totalInterest.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Interets</div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{
                    background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                    borderRadius: 8, padding: '16px 12px', textAlign: 'center', color: '#fff',
                  }}>
                    <SafetyOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {insurance.toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Assurance</div>
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <div style={{
                    background: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
                    borderRadius: 8, padding: '16px 12px', textAlign: 'center', color: '#fff',
                  }}>
                    <DollarOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {(simulation.totalAmount + insurance).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Total a rembourser</div>
                  </div>
                </Col>
              </Row>

              {/* Resume */}
              <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
                <Text strong style={{ color: '#1B2A4A', marginBottom: 8, display: 'block' }}>
                  Resume de la simulation
                </Text>
                <Row gutter={16}>
                  <Col span={12}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Echeance mensuelle">
                        <strong>{simulation.monthlyPayment.toLocaleString('fr-FR')} FCFA</strong>
                      </Descriptions.Item>
                      <Descriptions.Item label="Nombre d'echeances">
                        {simulation.durationMonths}
                      </Descriptions.Item>
                      <Descriptions.Item label="Taux periodique">
                        {(simulation.interestRate / 12).toFixed(1)}%
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col span={12}>
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="Methode">
                        {simulation.repaymentType === 'CONSTANT' ? 'Annuite constante' : 'Amortissement degressif'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Frequence">Mensuel</Descriptions.Item>
                      <Descriptions.Item label="Taux effectif annuel">
                        {simulation.interestRate}% / an
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                </Row>
              </Card>

              {/* Tableau d'amortissement */}
              <Card
                title={
                  <span>
                    <UnorderedListOutlined /> Tableau d'amortissement previsionnel
                  </span>
                }
                extra={
                  <Button size="small" type="primary" onClick={() => exportToPdf({
                    title: 'Tableau d\'amortissement previsionnel',
                    subtitle: `${simulation.amount.toLocaleString('fr-FR')} FCFA sur ${simulation.durationMonths} mois a ${simulation.interestRate}%`,
                    columns: [
                      { title: 'Mois', key: 'month' },
                      { title: 'Mensualite (FCFA)', key: 'payment', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                      { title: 'Capital', key: 'principal', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                      { title: 'Interets', key: 'interest', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                      { title: 'Reste du', key: 'remainingBalance', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                    ],
                    data: simulation.schedule,
                    filename: 'amortissement',
                    summary: [
                      { label: 'Montant', value: `${simulation.amount.toLocaleString('fr-FR')} FCFA` },
                      { label: 'Total interets', value: `${simulation.totalInterest.toLocaleString('fr-FR')} FCFA` },
                      { label: 'Total rembourse', value: `${simulation.totalAmount.toLocaleString('fr-FR')} FCFA` },
                    ],
                  })}>Export PDF</Button>
                }
                size="small"
                style={{ borderRadius: 8 }}
              >
                <Table
                  dataSource={simulation.schedule}
                  columns={scheduleColumns}
                  size="small"
                  pagination={false}
                  scroll={{ y: 350 }}
                  rowKey="month"
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row style={{ background: '#f0f2f5', fontWeight: 700 }}>
                        <Table.Summary.Cell index={0}>TOTAUX</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}></Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          {simulation.amount.toLocaleString('fr-FR')} FCFA
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          {simulation.totalInterest.toLocaleString('fr-FR')} FCFA
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          {insurance.toLocaleString('fr-FR')} FCFA
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>
                          {(simulation.totalAmount + insurance).toLocaleString('fr-FR')} FCFA
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6}></Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </Card>

              <Alert
                type="warning"
                showIcon
                style={{ marginTop: 12, borderRadius: 8 }}
                message="Cette simulation est fournie a titre indicatif uniquement. Les montants reels peuvent differer selon les conditions specifiques du contrat, les frais de dossier, et les politiques de l'institution."
              />
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#8c8c8c' }}>
              <CalculatorOutlined style={{ fontSize: 64, marginBottom: 16 }} />
              <Title level={5} type="secondary">Simulateur de Credit</Title>
              <Text type="secondary">Remplissez les parametres et cliquez "Simuler" pour generer le tableau d'amortissement previsionnel</Text>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}

// ===================== LISTE DES CREDITS TAB =====================
function DemandesTab() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/credits');
        setCredits(data.data || []);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const statusColors: Record<string, string> = {
    DRAFT: 'default', SUBMITTED: 'orange', UNDER_REVIEW: 'processing',
    APPROVED: 'blue', REJECTED: 'red', DISBURSED: 'cyan',
    ACTIVE: 'green', COMPLETED: 'success', DEFAULTED: 'error', RESTRUCTURED: 'purple',
  };
  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon', SUBMITTED: 'Soumis', UNDER_REVIEW: 'En examen',
    APPROVED: 'Approuve', REJECTED: 'Rejete', DISBURSED: 'Decaisse',
    ACTIVE: 'En cours', COMPLETED: 'Solde', DEFAULTED: 'Impaye', RESTRUCTURED: 'Restructure',
  };

  const columns = [
    { title: 'N° Credit', dataIndex: 'creditNumber', key: 'num' },
    { title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '-',
    },
    { title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount',
      render: (v: any) => Number(v).toLocaleString('fr-FR'), align: 'right' as const,
    },
    { title: 'Taux', dataIndex: 'interestRate', key: 'rate', render: (v: any) => `${Number(v)}%` },
    { title: 'Duree', dataIndex: 'durationMonths', key: 'dur', render: (v: number) => `${v} mois` },
    { title: 'Mensualite', dataIndex: 'monthlyPayment', key: 'mp',
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F`,
    },
    { title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
  ];

  const exportCols = [
    { title: 'N° Credit', key: 'creditNumber' },
    { title: 'Client', key: 'client', format: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '' },
    { title: 'Montant (FCFA)', key: 'amount', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Taux', key: 'interestRate', format: (v: any) => `${Number(v)}%` },
    { title: 'Duree', key: 'durationMonths', format: (v: any) => `${v} mois` },
    { title: 'Mensualite', key: 'monthlyPayment', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Statut', key: 'status', format: (v: any) => statusLabels[v] || v },
    { title: 'Date', key: 'createdAt', format: (v: any) => dayjs(v).format('DD/MM/YYYY') },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(credits, exportCols, 'credits')}>Excel</Button>
        <Button icon={<FilePdfOutlined />} onClick={() => exportToPdf({
          title: 'Liste des credits', subtitle: `${credits.length} credits`,
          columns: exportCols, data: credits, filename: 'credits', orientation: 'landscape',
        })}>PDF</Button>
      </Space>
      <Table dataSource={credits} columns={columns} loading={loading} rowKey="id" />
    </div>
  );
}

// ===================== NOUVELLE DEMANDE TAB =====================
function NouvelleDemandTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    api.get('/clients', { params: { limit: 200 } })
      .then(r => setClients(r.data.data || r.data || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post('/credits', {
        clientId: values.clientId,
        amount: values.amount,
        interestRate: values.rateType === 'monthly' ? values.rate * 12 : values.rate,
        durationMonths: values.duration,
        purpose: values.purpose,
        creditType: values.creditType,
        guarantees: values.guaranteeDesc ? [{
          type: values.guaranteeType || 'OTHER',
          description: values.guaranteeDesc,
          value: values.guaranteeValue || 0,
        }] : undefined,
      });
      message.success('Demande de credit creee avec succes');
      form.resetFields();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Row gutter={24}>
      <Col xs={24} lg={16}>
        <Card title="Formulaire de demande de credit" style={{ borderRadius: 8 }}>
          <Form form={form} layout="vertical" initialValues={{ rateType: 'monthly', rate: 3, duration: 12, creditType: 'PERSONNEL' }}>
            <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Selectionnez un client' }]}>
              <Select
                showSearch
                placeholder="Rechercher un client..."
                filterOption={(input, option) =>
                  (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                }
                options={clients.map(c => ({
                  value: c.id,
                  label: c.clientType === 'MORALE'
                    ? c.raisonSociale
                    : `${c.firstName} ${c.lastName} - ${c.clientNumber}`,
                }))}
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="creditType" label="Type de credit">
                  <Select>
                    <Select.Option value="PERSONNEL">Credit Personnel</Select.Option>
                    <Select.Option value="COMMERCIAL">Credit Commercial</Select.Option>
                    <Select.Option value="AGRICOLE">Credit Agricole</Select.Option>
                    <Select.Option value="IMMOBILIER">Credit Immobilier</Select.Option>
                    <Select.Option value="GROUPE">Credit de Groupe</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="purpose" label="Objet du credit" rules={[{ required: true }]}>
                  <Input placeholder="Ex: Achat materiel agricole, Fonds de roulement..." />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="amount" label="Montant (FCFA)" rules={[{ required: true }]}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={50000}
                    step={50000}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    parser={v => v!.replace(/\s/g, '') as any}
                  />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="rate" label="Taux" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={0.1} max={50} step={0.5} addonAfter="%" />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item name="rateType" label="Periode">
                  <Select>
                    <Select.Option value="monthly">/mois</Select.Option>
                    <Select.Option value="annual">/an</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="duration" label="Duree (mois)" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} max={60} />
                </Form.Item>
              </Col>
            </Row>

            <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#1B2A4A' }}>
              Garantie (optionnel)
            </Text>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="guaranteeType" label="Type">
                  <Select allowClear placeholder="Type de garantie">
                    <Select.Option value="REAL_ESTATE">Immobiliere</Select.Option>
                    <Select.Option value="VEHICLE">Vehicule</Select.Option>
                    <Select.Option value="SAVINGS">Epargne bloquee</Select.Option>
                    <Select.Option value="SURETY">Cautionnement</Select.Option>
                    <Select.Option value="SALARY">Domiciliation salaire</Select.Option>
                    <Select.Option value="OTHER">Autre</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="guaranteeDesc" label="Description">
                  <Input placeholder="Ex: Terrain a Douala, parcelle 12..." />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="guaranteeValue" label="Valeur estimee">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    parser={v => v!.replace(/\s/g, '') as any}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleSubmit} loading={submitting} icon={<PlusOutlined />}>
                Soumettre la demande
              </Button>
              <Button onClick={() => form.resetFields()}>Reinitialiser</Button>
            </Space>
          </Form>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card size="small" style={{ borderRadius: 8, background: '#f6f8fa' }}>
          <Text strong style={{ color: '#1B2A4A', display: 'block', marginBottom: 8 }}>
            Workflow d'approbation
          </Text>
          <div style={{ fontSize: 12, lineHeight: '22px' }}>
            <p>Apres soumission, la demande suit un circuit de validation selon le montant :</p>
            <p><Tag color="blue">{'< 500K'}</Tag> Agent valide seul</p>
            <p><Tag color="orange">500K - 2M</Tag> Agent + Chef d'agence</p>
            <p><Tag color="red">2M - 5M</Tag> + Directeur regional</p>
            <p><Tag color="purple">{'>= 5M'}</Tag> + DG + Comite de credit</p>
          </div>
        </Card>
      </Col>
    </Row>
  );
}

// ===================== EN ATTENTE D'APPROBATION TAB =====================
function AttenteTab() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [_detailModal, setDetailModal] = useState<any>(null);
  const [commentForm] = Form.useForm();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/credits', { params: { status: 'SUBMITTED', limit: 50 } });
      const { data: data2 } = await api.get('/credits', { params: { status: 'UNDER_REVIEW', limit: 50 } });
      setCredits([...(data.data || []), ...(data2.data || [])]);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleValidate = async (creditId: string, approved: boolean) => {
    try {
      const comment = commentForm.getFieldValue(`comment_${creditId}`) || '';
      const { data } = await api.patch(`/credits/${creditId}/validate`, { approved, comment });
      message.success(data.message);
      fetchPending();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleDisburse = async (creditId: string) => {
    try {
      const { data } = await api.patch(`/credits/${creditId}/disburse`);
      message.success(data.message);
      fetchPending();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const levelLabels: Record<string, string> = {
    AGENT: 'Agent',
    AGENCY_MANAGER: 'Chef d\'agence',
    REGIONAL_DIRECTOR: 'Directeur regional',
    GENERAL_DIRECTOR: 'Directeur general',
    CREDIT_COMMITTEE: 'Comite de credit',
  };

  const statusColors: Record<string, string> = {
    SUBMITTED: 'orange', UNDER_REVIEW: 'processing', APPROVED: 'blue',
  };

  const columns = [
    { title: 'N° Credit', dataIndex: 'creditNumber', width: 160, render: (v: string) => <strong>{v}</strong> },
    { title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '-',
    },
    { title: 'Montant', dataIndex: 'amount', align: 'right' as const, width: 130,
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F`,
    },
    { title: 'Duree', dataIndex: 'durationMonths', width: 80, render: (v: number) => `${v} mois` },
    { title: 'Statut', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{s}</Tag>,
    },
    { title: 'Niveau actuel', dataIndex: 'currentValidationLevel', width: 150,
      render: (v: string) => <Tag color="blue">{levelLabels[v] || v}</Tag>,
    },
    { title: 'Validations', key: 'validations', width: 80,
      render: (_: any, r: any) => (
        <Tooltip title={r.validations?.map((v: any) => `${v.user?.firstName}: ${v.approved ? 'OK' : 'NON'}`).join(', ')}>
          <Tag>{r.validations?.length || 0}</Tag>
        </Tooltip>
      ),
    },
    { title: 'Date', dataIndex: 'createdAt', width: 100, render: (d: string) => dayjs(d).format('DD/MM/YY') },
    { title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => setDetailModal(r)} />
          {r.status !== 'APPROVED' && (
            <>
              <Popconfirm title="Approuver ce credit ?" onConfirm={() => handleValidate(r.id, true)}>
                <Button size="small" type="primary" icon={<CheckCircleOutlined />}>OK</Button>
              </Popconfirm>
              <Popconfirm title="Rejeter ce credit ?" onConfirm={() => handleValidate(r.id, false)}>
                <Button size="small" danger icon={<CloseCircleOutlined />}>Non</Button>
              </Popconfirm>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Popconfirm title="Decaisser ce credit ? Le compte du client sera credite." onConfirm={() => handleDisburse(r.id)}>
              <Button size="small" style={{ background: '#52c41a', color: '#fff', borderColor: '#52c41a' }}>
                Decaisser
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Aussi charger les credits APPROVED non encore decaisses
  const [approved, setApproved] = useState<any[]>([]);
  useEffect(() => {
    api.get('/credits', { params: { status: 'APPROVED', limit: 50 } })
      .then(r => setApproved(r.data.data || []))
      .catch(() => {});
  }, [loading]); // re-fetch quand loading change (apres validation)

  const allCredits = [...credits, ...approved];

  return (
    <div>
      <Form form={commentForm} component={false} />
      <Alert
        type="info"
        showIcon
        message={`${credits.length} demande(s) en attente de validation, ${approved.length} approuve(s) pret(s) au decaissement`}
        style={{ marginBottom: 16 }}
      />
      <Table
        dataSource={allCredits}
        columns={columns}
        loading={loading}
        rowKey="id"
        size="small"
        expandable={{
          expandedRowRender: (record: any) => (
            <div style={{ padding: '8px 16px' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Objet">{record.purpose || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Mensualite">{Number(record.monthlyPayment).toLocaleString('fr-FR')} FCFA</Descriptions.Item>
                    <Descriptions.Item label="Total a rembourser">{Number(record.totalAmount).toLocaleString('fr-FR')} FCFA</Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Text strong>Historique des validations :</Text>
                  {record.validations?.map((v: any, i: number) => (
                    <div key={i} style={{ marginTop: 4 }}>
                      <Tag color={v.approved ? 'green' : 'red'}>{v.approved ? 'Approuve' : 'Rejete'}</Tag>
                      <Text type="secondary">{v.user?.firstName} {v.user?.lastName} - {v.comment || 'sans commentaire'}</Text>
                    </div>
                  ))}
                  <div style={{ marginTop: 8 }}>
                    <Input.TextArea
                      rows={1}
                      placeholder="Commentaire (optionnel)..."
                      onChange={e => commentForm.setFieldValue(`comment_${record.id}`, e.target.value)}
                    />
                  </div>
                  {record.guarantees?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text strong>Garanties :</Text>
                      {record.guarantees.map((g: any, i: number) => (
                        <div key={i}><Tag>{g.type}</Tag> {g.description} - {Number(g.value).toLocaleString('fr-FR')} FCFA</div>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </div>
          ),
        }}
      />
    </div>
  );
}

// ===================== SCORING TAB =====================
function ScoringTab() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [scoringResult, setScoringResult] = useState<any>(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get('/credits', { params: { limit: 100 } })
      .then(r => setCredits(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleScore = async (creditId: string) => {
    setSelectedCredit(creditId);
    setScoringLoading(true);
    try {
      const { data } = await api.get(`/credits/${creditId}/scoring`);
      setScoringResult(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur scoring');
    } finally {
      setScoringLoading(false);
    }
  };

  const riskColors: Record<string, string> = {
    FAIBLE: '#52c41a', MODERE: '#F5A623', ELEVE: '#ff4d4f', TRES_ELEVE: '#cf1322',
  };
  const riskLabels: Record<string, string> = {
    FAIBLE: 'Risque faible', MODERE: 'Risque modere', ELEVE: 'Risque eleve', TRES_ELEVE: 'Risque tres eleve',
  };

  const columns = [
    { title: 'N° Credit', dataIndex: 'creditNumber', width: 160 },
    { title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '-',
    },
    { title: 'Montant', dataIndex: 'amount', align: 'right' as const,
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F`,
    },
    { title: 'Statut', dataIndex: 'status', render: (s: string) => <Tag>{s}</Tag> },
    { title: 'Score', dataIndex: 'scoringTotal', width: 80,
      render: (v: any) => v != null ? <Tag color={v >= 75 ? 'green' : v >= 55 ? 'orange' : 'red'}>{v}/100</Tag> : '-',
    },
    { title: 'Action', key: 'action', width: 120,
      render: (_: any, r: any) => (
        <Button size="small" type="primary" icon={<RadarChartOutlined />} loading={scoringLoading && selectedCredit === r.id}
          onClick={() => handleScore(r.id)}>
          Scorer
        </Button>
      ),
    },
  ];

  return (
    <Row gutter={24}>
      <Col xs={24} lg={scoringResult ? 12 : 24}>
        <Table dataSource={credits} columns={columns} loading={loading} rowKey="id" size="small"
          pagination={{ pageSize: 10 }} />
      </Col>
      {scoringResult && (
        <Col xs={24} lg={12}>
          <Card
            title={<span><TrophyOutlined /> Score de credit : {scoringResult.total}/100</span>}
            extra={<Tag color={riskColors[scoringResult.risk]} style={{ fontSize: 14 }}>{riskLabels[scoringResult.risk]}</Tag>}
            style={{ borderRadius: 8 }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Progress
                type="dashboard"
                percent={scoringResult.total}
                strokeColor={riskColors[scoringResult.risk]}
                format={(p) => <span style={{ fontSize: 28, fontWeight: 700 }}>{p}</span>}
                size={150}
              />
            </div>

            <Alert message={scoringResult.recommendation} type={scoringResult.total >= 55 ? 'success' : 'warning'} showIcon style={{ marginBottom: 16 }} />

            {scoringResult.categories.map((cat: any, i: number) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Col><Text strong>{cat.name}</Text></Col>
                  <Col><Text>{cat.score}/{cat.max}</Text></Col>
                </Row>
                <Progress percent={Math.round(cat.score / cat.max * 100)} size="small"
                  strokeColor={cat.score / cat.max >= 0.7 ? '#52c41a' : cat.score / cat.max >= 0.4 ? '#F5A623' : '#ff4d4f'} />
                <Text type="secondary" style={{ fontSize: 11 }}>{cat.detail}</Text>
              </div>
            ))}
          </Card>
        </Col>
      )}
    </Row>
  );
}

// ===================== CONTRAT PDF =====================
function generateContractPdf(contract: any) {
  const doc = new jsPDF();

  // En-tete
  doc.setFillColor(27, 42, 74);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('CONTRAT DE CREDIT', 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Global Financial Solution - Etablissement de Microfinance', 105, 26, { align: 'center' });
  doc.text(`Contrat N° ${contract.creditNumber}`, 105, 33, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  let y = 50;

  // Parties
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ARTICLE 1 - PARTIES', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emprunteur : ${contract.clientName} (N° ${contract.clientNumber})`, 14, y); y += 6;
  doc.text(`Adresse : ${contract.clientAddress}`, 14, y); y += 6;
  doc.text(`Telephone : ${contract.clientPhone}`, 14, y); y += 6;
  if (contract.clientIdType) {
    doc.text(`Piece d'identite : ${contract.clientIdType} N° ${contract.clientIdNumber}`, 14, y); y += 6;
  }

  // Conditions
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ARTICLE 2 - CONDITIONS DU PRET', 14, y); y += 8;
  doc.setFont('helvetica', 'normal');

  const conditions = [
    ['Montant du pret', `${contract.amount.toLocaleString('fr-FR')} FCFA`],
    ['Taux d\'interet annuel', `${contract.interestRate}%`],
    ['Duree', `${contract.durationMonths} mois`],
    ['Mensualite', `${contract.monthlyPayment.toLocaleString('fr-FR')} FCFA`],
    ['Total a rembourser', `${contract.totalAmount.toLocaleString('fr-FR')} FCFA`],
    ['Assurance (2%)', `${contract.insurance.toLocaleString('fr-FR')} FCFA`],
    ['Objet', contract.purpose],
  ];
  conditions.forEach(([label, value]) => {
    doc.text(`${label} : ${value}`, 14, y); y += 6;
  });

  // Garanties
  if (contract.guarantees.length > 0) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('ARTICLE 3 - GARANTIES', 14, y); y += 8;
    doc.setFont('helvetica', 'normal');
    contract.guarantees.forEach((g: any, i: number) => {
      doc.text(`${i + 1}. ${g.type} - ${g.description} (valeur: ${g.value.toLocaleString('fr-FR')} FCFA)`, 14, y);
      y += 6;
    });
  }

  // Tableau d'amortissement
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text('ARTICLE 4 - TABLEAU D\'AMORTISSEMENT', 14, y); y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Mois', 'Capital', 'Interets', 'Mensualite', 'Reste du']],
    body: contract.schedule.map((r: any) => [
      r.month,
      `${r.principal.toLocaleString('fr-FR')}`,
      `${r.interest.toLocaleString('fr-FR')}`,
      `${r.payment.toLocaleString('fr-FR')}`,
      `${r.remainingBalance.toLocaleString('fr-FR')}`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 42, 74] },
  });

  // Clauses
  const finalY = (doc as any).lastAutoTable?.finalY || y + 50;
  let cy = finalY + 10;
  if (cy > 250) { doc.addPage(); cy = 20; }

  doc.setFont('helvetica', 'bold');
  doc.text('ARTICLE 5 - CLAUSES GENERALES', 14, cy); cy += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const clauses = [
    '- Tout retard de paiement entraine une penalite de 2% du montant de l\'echeance.',
    '- En cas de defaut de paiement de 3 echeances consecutives, le pret sera declare exigible.',
    '- L\'emprunteur s\'engage a informer l\'etablissement de tout changement de situation.',
    '- Les garanties restent acquises jusqu\'au remboursement integral du pret.',
    '- Le present contrat est regi par la reglementation COBAC/CEMAC.',
  ];
  clauses.forEach(c => { doc.text(c, 14, cy); cy += 5; });

  // Signatures
  cy += 10;
  if (cy > 260) { doc.addPage(); cy = 20; }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SIGNATURES', 14, cy); cy += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('L\'Emprunteur :', 14, cy);
  doc.text('L\'Etablissement :', 120, cy);
  cy += 20;
  doc.text('_________________________', 14, cy);
  doc.text('_________________________', 120, cy);
  cy += 6;
  doc.text(contract.clientName, 14, cy);
  doc.text('Global Financial Solution', 120, cy);

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i}/${pageCount} - Document genere le ${new Date().toLocaleDateString('fr-FR')}`, 105, 290, { align: 'center' });
  }

  doc.save(`Contrat_${contract.creditNumber}.pdf`);
}

// ===================== RESTRUCTURATION TAB =====================
function RestructurationTab() {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [contractLoading, setContractLoading] = useState<string | null>(null);

  const fetchCredits = () => {
    setLoading(true);
    Promise.all([
      api.get('/credits', { params: { status: 'DEFAULTED', limit: 50 } }),
      api.get('/credits', { params: { status: 'DISBURSED', limit: 50 } }),
      api.get('/credits', { params: { status: 'ACTIVE', limit: 50 } }),
      api.get('/credits', { params: { status: 'RESTRUCTURED', limit: 50 } }),
    ]).then(([d, dis, act, rst]) => {
      setCredits([...(d.data.data || []), ...(dis.data.data || []), ...(act.data.data || []), ...(rst.data.data || [])]);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCredits(); }, []);

  const handleRestructure = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const { data } = await api.post(`/credits/${selectedCredit.id}/restructure`, {
        newAmount: values.newAmount,
        newInterestRate: values.newInterestRate,
        newDurationMonths: values.newDurationMonths,
        reason: values.reason,
      });
      message.success(data.message);
      setModalVisible(false);
      form.resetFields();
      fetchCredits();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur restructuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadContract = async (creditId: string) => {
    setContractLoading(creditId);
    try {
      const { data } = await api.get(`/credits/${creditId}/contract`);
      generateContractPdf(data);
      message.success('Contrat PDF genere');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur generation contrat');
    } finally {
      setContractLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    DEFAULTED: 'error', DISBURSED: 'cyan', ACTIVE: 'green', RESTRUCTURED: 'purple',
  };
  const statusLabels: Record<string, string> = {
    DEFAULTED: 'Impaye', DISBURSED: 'Decaisse', ACTIVE: 'En cours', RESTRUCTURED: 'Restructure',
  };

  const columns = [
    { title: 'N° Credit', dataIndex: 'creditNumber', width: 160, render: (v: string) => <strong>{v}</strong> },
    { title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '-',
    },
    { title: 'Montant', dataIndex: 'amount', align: 'right' as const,
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F`,
    },
    { title: 'Reste du', dataIndex: 'remainingAmount', align: 'right' as const,
      render: (v: any) => `${Number(v).toLocaleString('fr-FR')} F`,
    },
    { title: 'Statut', dataIndex: 'status',
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    { title: 'Actions', key: 'actions', width: 220,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<FilePdfOutlined />} loading={contractLoading === r.id}
            onClick={() => handleDownloadContract(r.id)}>
            Contrat
          </Button>
          {['DEFAULTED', 'DISBURSED', 'ACTIVE'].includes(r.status) && (
            <Button size="small" type="primary" danger icon={<RetweetOutlined />}
              onClick={() => {
                setSelectedCredit(r);
                form.setFieldsValue({
                  newAmount: Number(r.remainingAmount),
                  newInterestRate: Number(r.interestRate),
                  newDurationMonths: r.durationMonths,
                });
                setModalVisible(true);
              }}>
              Restructurer
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="Restructuration de credits"
        description="La restructuration cree un nouveau credit a partir du solde restant, avec de nouvelles conditions. L'ancien credit est marque comme RESTRUCTURE."
        style={{ marginBottom: 16 }}
      />
      <Table dataSource={credits} columns={columns} loading={loading} rowKey="id" size="small" />

      <Modal
        title={<span><RetweetOutlined /> Restructurer le credit {selectedCredit?.creditNumber}</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleRestructure}
        confirmLoading={submitting}
        okText="Confirmer la restructuration"
        width={500}
      >
        {selectedCredit && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Credit original">{selectedCredit.creditNumber}</Descriptions.Item>
              <Descriptions.Item label="Montant initial">{Number(selectedCredit.amount).toLocaleString('fr-FR')} FCFA</Descriptions.Item>
              <Descriptions.Item label="Reste du">{Number(selectedCredit.remainingAmount).toLocaleString('fr-FR')} FCFA</Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical">
              <Form.Item name="newAmount" label="Nouveau montant (FCFA)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={10000} step={10000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="newInterestRate" label="Nouveau taux annuel (%)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1} max={50} step={0.5} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="newDurationMonths" label="Nouvelle duree (mois)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1} max={60} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="reason" label="Motif de restructuration" rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="Ex: Difficultes financieres temporaires, perte d'emploi..." />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

// ===================== PAGE PRINCIPALE =====================
export default function Credits() {
  const { canCreate, canUpdate, isReadOnly } = usePermissions();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/credits/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  const tabItems = [
    {
      key: 'demandes',
      label: <span><UnorderedListOutlined /> Demandes individuelles</span>,
      children: <DemandesTab />,
    },
    // Onglet "Nouvelle demande" masque si pas CREDITS:CREATE
    canCreate('CREDITS') && !isReadOnly ? {
      key: 'nouvelle',
      label: <span><PlusOutlined /> Nouvelle demande</span>,
      children: <NouvelleDemandTab />,
    } : null,
    // Onglet "En attente" masque si pas CREDITS:UPDATE (approbation)
    canUpdate('CREDITS') && !isReadOnly ? {
      key: 'attente',
      label: <span><ClockCircleOutlined /> En attente d'approbation</span>,
      children: <AttenteTab />,
    } : null,
    {
      key: 'scoring',
      label: <span><RadarChartOutlined /> Scoring</span>,
      children: <ScoringTab />,
    },
    {
      key: 'restructuration',
      label: <span><RetweetOutlined /> Restructuration & Contrats</span>,
      children: <RestructurationTab />,
    },
    {
      key: 'simulateur',
      label: <span><CalculatorOutlined /> Simulateur</span>,
      children: <SimulateurTab />,
    },
  ].filter(Boolean);

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <BankOutlined /> Gestion des Credits
            </Title>
            <Text type="secondary">Demandes, approbations, decaissements, simulateur et suivi des prets</Text>
          </Col>
        </Row>
      </div>

      {/* Stats rapides */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} lg={6}>
            <Card className="stat-card" size="small">
              <Statistic title="Credits actifs" value={stats.active || 0} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card className="stat-card" size="small">
              <Statistic title="En attente" value={stats.pending || 0} valueStyle={{ color: '#F5A623' }} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card className="stat-card" size="small">
              <Statistic title="Total decaisse" value={stats.totalDisbursed || 0} suffix="FCFA" valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card className="stat-card" size="small">
              <Statistic title="PAR > 30j" value={stats.par30 || '0%'} valueStyle={{ color: '#52c41a' }} />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={{ borderRadius: 8 }}>
        <Tabs items={tabItems.filter(Boolean) as any[]} defaultActiveKey="simulateur" />
      </Card>
    </div>
  );
}
