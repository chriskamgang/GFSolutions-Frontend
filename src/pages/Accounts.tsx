import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message,
  Modal, Descriptions, Tabs, Select, Space, Statistic, Form,
  InputNumber, DatePicker, Input,
} from 'antd';
import {
  EyeOutlined, BankOutlined, PlusOutlined, DownloadOutlined,
  FileExcelOutlined, WalletOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Accounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [datModalOpen, setDatModalOpen] = useState(false);
  const [datForm] = Form.useForm();

  const fetchAccounts = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/accounts', { params });
      setAccounts(data.data || data);
      setPagination(prev => ({
        ...prev,
        total: data.meta?.total || data.length,
        current: page,
      }));
    } catch {
      message.error('Erreur lors du chargement des comptes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [typeFilter]);

  const handleViewDetail = async (record: any) => {
    setSelectedAccount(record);
    setDetailOpen(true);
    setTxLoading(true);
    try {
      const { data } = await api.get(`/transactions`, {
        params: { accountId: record.id, limit: 50 },
      });
      setTransactions(data.data || data || []);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const handleExportReleve = () => {
    if (!selectedAccount || transactions.length === 0) {
      message.warning('Aucune transaction a exporter');
      return;
    }
    const rows = transactions.map((t: any) => ({
      'Date': dayjs(t.createdAt).format('DD/MM/YYYY HH:mm'),
      'Reference': t.reference,
      'Type': t.type,
      'Description': t.description || '',
      'Montant (FCFA)': Number(t.amount).toLocaleString('fr-FR'),
      'Frais': Number(t.fees || 0).toLocaleString('fr-FR'),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Releve');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([buf], { type: 'application/octet-stream' }),
      `releve_${selectedAccount.accountNumber}_${dayjs().format('YYYYMMDD')}.xlsx`
    );
    message.success('Releve exporte');
  };

  const handleExportAllAccounts = async () => {
    try {
      const { data } = await api.get('/accounts', { params: { limit: 9999 } });
      const list = data.data || data;
      const rows = list.map((a: any) => ({
        'N° Compte': a.accountNumber,
        'Client': a.client ? `${a.client.firstName} ${a.client.lastName}` : '-',
        'Type': a.type,
        'Solde (FCFA)': Number(a.balance),
        'Taux interet (%)': a.interestRate ? Number(a.interestRate) : '',
        'Echeance DAT': a.maturityDate ? dayjs(a.maturityDate).format('DD/MM/YYYY') : '',
        'Statut': a.status,
        'Ouverture': dayjs(a.createdAt).format('DD/MM/YYYY'),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comptes');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `comptes_${dayjs().format('YYYYMMDD')}.xlsx`);
      message.success(`${rows.length} comptes exportes`);
    } catch {
      message.error('Erreur export');
    }
  };

  const handleCreateDAT = async () => {
    try {
      const values = await datForm.validateFields();
      await api.post('/accounts/savings', {
        clientId: values.clientId,
        agencyId: values.agencyId || undefined,
        interestRate: values.interestRate,
      });
      message.success('Compte DAT cree avec succes');
      setDatModalOpen(false);
      datForm.resetFields();
      fetchAccounts(pagination.current);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  // Calcul simulation interets DAT
  const calculateDATInterest = (amount: number, rate: number, months: number) => {
    const interest = Math.round(amount * (rate / 100) * (months / 12));
    return interest;
  };

  const typeColors: Record<string, string> = { CURRENT: 'blue', SAVINGS: 'green', DAT: 'purple' };
  const typeLabels: Record<string, string> = { CURRENT: 'Courant', SAVINGS: 'Epargne', DAT: 'DAT' };
  const statusLabels: Record<string, string> = { ACTIVE: 'Actif', DORMANT: 'Dormant', CLOSED: 'Ferme', SUSPENDED: 'Suspendu' };

  const columns = [
    { title: 'N° Compte', dataIndex: 'accountNumber', key: 'accountNumber' },
    {
      title: 'Client',
      key: 'client',
      render: (_: any, r: any) => r.client ? `${r.client.firstName} ${r.client.lastName}` : '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color={typeColors[t]}>{typeLabels[t] || t}</Tag>,
    },
    {
      title: 'Solde (FCFA)',
      dataIndex: 'balance',
      key: 'balance',
      render: (v: any) => <Text strong>{Number(v).toLocaleString('fr-FR')}</Text>,
      align: 'right' as const,
    },
    {
      title: 'Taux',
      dataIndex: 'interestRate',
      key: 'interestRate',
      render: (v: any) => v ? `${Number(v)}%` : '-',
      align: 'center' as const,
    },
    {
      title: 'Echeance',
      dataIndex: 'maturityDate',
      key: 'maturityDate',
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'ACTIVE' ? 'green' : s === 'DORMANT' ? 'orange' : 'red'}>
          {statusLabels[s] || s}
        </Tag>
      ),
    },
    {
      title: 'Ouverture',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)}>
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}><BankOutlined /> Comptes</Title>
            <Text type="secondary">Gestion des comptes clients (courant, epargne, DAT)</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExportAllAccounts}>Export Excel</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        <Space style={{ marginBottom: 16 }}>
          <Select
            placeholder="Filtrer par type"
            allowClear
            style={{ width: 160 }}
            value={typeFilter}
            onChange={v => setTypeFilter(v)}
            options={[
              { value: 'CURRENT', label: 'Courant' },
              { value: 'SAVINGS', label: 'Epargne' },
              { value: 'DAT', label: 'DAT' },
            ]}
          />
        </Space>

        <Table
          dataSource={accounts}
          columns={columns}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `${total} comptes`,
            onChange: (page, pageSize) => fetchAccounts(page, pageSize),
          }}
        />
      </Card>

      {/* Modal Detail Compte + Releve */}
      <Modal
        title={selectedAccount ? `Compte ${selectedAccount.accountNumber}` : 'Detail compte'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="export" icon={<FileExcelOutlined />} onClick={handleExportReleve}>
            Exporter le releve
          </Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>Fermer</Button>,
        ]}
        width={900}
      >
        {selectedAccount && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic
                    title="Solde"
                    value={Number(selectedAccount.balance)}
                    suffix="FCFA"
                    valueStyle={{ fontSize: 16, color: '#1B2A4A', fontWeight: 700 }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic title="Type" value={typeLabels[selectedAccount.type] || selectedAccount.type} valueStyle={{ fontSize: 16 }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic title="Taux" value={selectedAccount.interestRate ? `${Number(selectedAccount.interestRate)}%` : 'N/A'} valueStyle={{ fontSize: 16 }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic title="Statut" value={statusLabels[selectedAccount.status]} valueStyle={{ fontSize: 16, color: selectedAccount.status === 'ACTIVE' ? '#52c41a' : '#ff4d4f' }} />
                </Card>
              </Col>
            </Row>

            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Client">
                {selectedAccount.client ? `${selectedAccount.client.firstName} ${selectedAccount.client.lastName}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Ouverture">{dayjs(selectedAccount.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
              {selectedAccount.maturityDate && (
                <Descriptions.Item label="Echeance DAT">{dayjs(selectedAccount.maturityDate).format('DD/MM/YYYY')}</Descriptions.Item>
              )}
              {selectedAccount.type === 'DAT' && selectedAccount.interestRate && (
                <Descriptions.Item label="Interets estimes (a echeance)">
                  {(() => {
                    const months = selectedAccount.maturityDate
                      ? dayjs(selectedAccount.maturityDate).diff(dayjs(selectedAccount.createdAt), 'month')
                      : 12;
                    const interest = calculateDATInterest(Number(selectedAccount.balance), Number(selectedAccount.interestRate), months);
                    return `${interest.toLocaleString('fr-FR')} FCFA (${months} mois)`;
                  })()}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Title level={5} style={{ marginBottom: 8 }}>
              <WalletOutlined /> Releve des transactions
            </Title>
            <Table
              dataSource={transactions}
              loading={txLoading}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
              columns={[
                { title: 'Date', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'), width: 140 },
                { title: 'Reference', dataIndex: 'reference', width: 150 },
                {
                  title: 'Type', dataIndex: 'type', width: 100,
                  render: (t: string) => <Tag color={t === 'DEPOSIT' ? 'green' : t === 'WITHDRAWAL' ? 'red' : 'blue'}>{t}</Tag>,
                },
                { title: 'Description', dataIndex: 'description', ellipsis: true },
                {
                  title: 'Montant (FCFA)', dataIndex: 'amount', align: 'right' as const,
                  render: (v: any, r: any) => (
                    <Text style={{ color: r.type === 'DEPOSIT' ? '#52c41a' : r.type === 'WITHDRAWAL' ? '#ff4d4f' : '#1B2A4A', fontWeight: 600 }}>
                      {r.type === 'WITHDRAWAL' ? '-' : '+'}{Number(v).toLocaleString('fr-FR')}
                    </Text>
                  ),
                },
                { title: 'Frais', dataIndex: 'fees', render: (v: any) => Number(v || 0).toLocaleString('fr-FR'), align: 'right' as const },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
