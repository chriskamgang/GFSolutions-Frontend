import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Select, DatePicker, message, Descriptions, Statistic, Tabs,
} from 'antd';
import {
  FileExcelOutlined, FilePdfOutlined,
  SearchOutlined, BankOutlined, HistoryOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const typeLabels: Record<string, string> = {
  DEPOSIT: 'Depot', WITHDRAWAL: 'Retrait', TRANSFER: 'Transfert',
  FEE: 'Frais', INTEREST: 'Interet', LOAN_DISBURSEMENT: 'Decaissement',
  LOAN_REPAYMENT: 'Remboursement', SALARY_PAYMENT: 'Salaire',
  CONTRIBUTION_PAYMENT: 'Cotisation',
};

const typeColors: Record<string, string> = {
  DEPOSIT: 'green', WITHDRAWAL: 'red', TRANSFER: 'blue',
  FEE: 'orange', INTEREST: 'cyan', LOAN_DISBURSEMENT: 'purple',
  LOAN_REPAYMENT: 'geekblue', SALARY_PAYMENT: 'magenta',
};

export default function AccountStatements() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Releve mensuel
  const [selectedMonth, setSelectedMonth] = useState<dayjs.Dayjs>(dayjs());
  const [statement, setStatement] = useState<any>(null);

  // Historique
  const [history, setHistory] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypes, setHistoryTypes] = useState<string[]>([]);
  const [historyDates, setHistoryDates] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [historyPage, setHistoryPage] = useState(1);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data } = await api.get('/accounts', { params: { limit: 500 } });
        setAccounts(data.data || data);
      } catch { /* silent */ }
    };
    fetchAccounts();
  }, []);

  const getAccountLabel = (acc: any) => {
    const clientName = acc.client
      ? (acc.client.clientType === 'MORALE'
        ? acc.client.raisonSociale
        : `${acc.client.firstName} ${acc.client.lastName}`)
      : '';
    return `${acc.accountNumber} - ${clientName} (${Number(acc.balance).toLocaleString('fr-FR')} FCFA)`;
  };

  // ==================== RELEVE MENSUEL ====================

  const fetchStatement = async () => {
    if (!selectedAccount || !selectedMonth) {
      message.warning('Selectionnez un compte et un mois');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/account/${selectedAccount}/statement`, {
        params: { year: selectedMonth.year(), month: selectedMonth.month() + 1 },
      });
      setStatement(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur lors du chargement du releve');
    } finally {
      setLoading(false);
    }
  };

  const exportStatementExcel = () => {
    if (!statement) return;
    const cols = [
      { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
      { title: 'Reference', key: 'reference' },
      { title: 'Type', key: 'type', format: (v: string) => typeLabels[v] || v },
      { title: 'Description', key: 'description' },
      { title: 'Debit (FCFA)', key: 'debit', format: (v: number) => v ? v.toLocaleString('fr-FR') : '' },
      { title: 'Credit (FCFA)', key: 'credit', format: (v: number) => v ? v.toLocaleString('fr-FR') : '' },
      { title: 'Frais (FCFA)', key: 'fees', format: (v: number) => v ? v.toLocaleString('fr-FR') : '' },
    ];
    exportToExcel(
      statement.lignes,
      cols,
      `Releve_${statement.compte.accountNumber}_${statement.periode.label.replace('/', '-')}`,
    );
  };

  const exportStatementPdf = () => {
    if (!statement) return;
    const cols = [
      { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY') },
      { title: 'Reference', key: 'reference' },
      { title: 'Type', key: 'type', format: (v: string) => typeLabels[v] || v },
      { title: 'Debit', key: 'debit', format: (v: number) => v ? Number(v).toLocaleString('fr-FR') : '' },
      { title: 'Credit', key: 'credit', format: (v: number) => v ? Number(v).toLocaleString('fr-FR') : '' },
    ];
    exportToPdf({
      title: `Releve de Compte - ${statement.compte.clientName}`,
      subtitle: `Compte: ${statement.compte.accountNumber} | Periode: ${statement.periode.label}`,
      columns: cols,
      data: statement.lignes,
      filename: `Releve_${statement.compte.accountNumber}_${statement.periode.label.replace('/', '-')}`,
      orientation: 'landscape',
      summary: [
        { label: 'Solde d\'ouverture', value: `${statement.soldeOuverture.toLocaleString('fr-FR')} FCFA` },
        { label: 'Total Depots', value: `${statement.totalDepots.toLocaleString('fr-FR')} FCFA` },
        { label: 'Total Retraits', value: `${statement.totalRetraits.toLocaleString('fr-FR')} FCFA` },
        { label: 'Total Frais', value: `${statement.totalFrais.toLocaleString('fr-FR')} FCFA` },
        { label: 'Solde de cloture', value: `${statement.soldeCloture.toLocaleString('fr-FR')} FCFA` },
      ],
    });
  };

  // ==================== HISTORIQUE ====================

  const fetchHistory = async (page = 1) => {
    if (!selectedAccount) {
      message.warning('Selectionnez un compte');
      return;
    }
    setHistoryLoading(true);
    setHistoryPage(page);
    try {
      const params: any = { page, limit: 50 };
      if (historyTypes.length > 0) params.type = historyTypes.join(',');
      if (historyDates[0]) params.startDate = historyDates[0].startOf('day').toISOString();
      if (historyDates[1]) params.endDate = historyDates[1].endOf('day').toISOString();

      const { data } = await api.get(`/transactions/account/${selectedAccount}/history`, { params });
      setHistory(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportHistoryExcel = () => {
    if (!history?.data?.length) return;
    const cols = [
      { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
      { title: 'Reference', key: 'reference' },
      { title: 'Type', key: 'type', format: (v: string) => typeLabels[v] || v },
      { title: 'Description', key: 'description' },
      { title: 'Debit (FCFA)', key: 'debit', format: (v: number) => v ? v.toLocaleString('fr-FR') : '' },
      { title: 'Credit (FCFA)', key: 'credit', format: (v: number) => v ? v.toLocaleString('fr-FR') : '' },
      { title: 'Canal', key: 'channel' },
    ];
    exportToExcel(
      history.data,
      cols,
      `Historique_${history.compte.accountNumber}`,
    );
  };

  const exportHistoryPdf = () => {
    if (!history?.data?.length) return;
    const cols = [
      { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY') },
      { title: 'Reference', key: 'reference' },
      { title: 'Type', key: 'type', format: (v: string) => typeLabels[v] || v },
      { title: 'Description', key: 'description' },
      { title: 'Debit', key: 'debit', format: (v: number) => v ? Number(v).toLocaleString('fr-FR') : '' },
      { title: 'Credit', key: 'credit', format: (v: number) => v ? Number(v).toLocaleString('fr-FR') : '' },
    ];
    exportToPdf({
      title: `Historique des Transactions - ${history.compte.clientName}`,
      subtitle: `Compte: ${history.compte.accountNumber} | Solde actuel: ${history.compte.balance.toLocaleString('fr-FR')} FCFA`,
      columns: cols,
      data: history.data,
      filename: `Historique_${history.compte.accountNumber}`,
      orientation: 'landscape',
    });
  };

  // ==================== COLUMNS ====================

  const statementColumns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date', width: 150,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 180 },
    {
      title: 'Type', dataIndex: 'type', key: 'type', width: 120,
      render: (t: string) => <Tag color={typeColors[t] || 'default'}>{typeLabels[t] || t}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Debit (FCFA)', dataIndex: 'debit', key: 'debit', align: 'right' as const, width: 150,
      render: (v: number) => v ? (
        <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>-{Number(v).toLocaleString('fr-FR')}</Text>
      ) : null,
    },
    {
      title: 'Credit (FCFA)', dataIndex: 'credit', key: 'credit', align: 'right' as const, width: 150,
      render: (v: number) => v ? (
        <Text style={{ color: '#52c41a', fontWeight: 600 }}>+{Number(v).toLocaleString('fr-FR')}</Text>
      ) : null,
    },
    {
      title: 'Frais (FCFA)', dataIndex: 'fees', key: 'fees', align: 'right' as const, width: 120,
      render: (v: number) => v ? Number(v).toLocaleString('fr-FR') : '-',
    },
  ];

  const historyColumns = [
    {
      title: 'Date', dataIndex: 'date', key: 'date', width: 150,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 180 },
    {
      title: 'Type', dataIndex: 'type', key: 'type', width: 120,
      render: (t: string) => <Tag color={typeColors[t] || 'default'}>{typeLabels[t] || t}</Tag>,
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Debit (FCFA)', dataIndex: 'debit', key: 'debit', align: 'right' as const, width: 150,
      render: (v: number) => v ? (
        <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>-{Number(v).toLocaleString('fr-FR')}</Text>
      ) : null,
    },
    {
      title: 'Credit (FCFA)', dataIndex: 'credit', key: 'credit', align: 'right' as const, width: 150,
      render: (v: number) => v ? (
        <Text style={{ color: '#52c41a', fontWeight: 600 }}>+{Number(v).toLocaleString('fr-FR')}</Text>
      ) : null,
    },
    {
      title: 'Canal', dataIndex: 'channel', key: 'channel', width: 110,
      render: (c: string) => {
        if (c === 'MTN_MOMO') return <Tag color="gold">MTN MoMo</Tag>;
        if (c === 'ORANGE_MONEY') return <Tag color="orange">Orange Money</Tag>;
        if (c === 'EXPRESS_UNION') return <Tag color="purple">Express Union</Tag>;
        return <Tag>Especes</Tag>;
      },
    },
  ];

  const tabItems = [
    {
      key: 'statement',
      label: <span><BankOutlined /> Releve Mensuel</span>,
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={10}>
              <Select
                showSearch
                placeholder="Rechercher un compte..."
                style={{ width: '100%' }}
                value={selectedAccount}
                onChange={setSelectedAccount}
                filterOption={(input, option) =>
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: getAccountLabel(acc),
                }))}
              />
            </Col>
            <Col xs={12} sm={6}>
              <DatePicker
                picker="month"
                value={selectedMonth}
                onChange={(v) => v && setSelectedMonth(v)}
                format="MM/YYYY"
                style={{ width: '100%' }}
                placeholder="Mois"
              />
            </Col>
            <Col xs={12} sm={4}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={fetchStatement}
                loading={loading}
                block
              >
                Generer
              </Button>
            </Col>
          </Row>

          {statement && (
            <>
              <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                <Descriptions
                  size="small"
                  column={{ xs: 1, sm: 2, md: 4 }}
                  title={
                    <Space>
                      <BankOutlined />
                      <span>Releve de compte - {statement.periode.label}</span>
                    </Space>
                  }
                >
                  <Descriptions.Item label="Client">{statement.compte.clientName}</Descriptions.Item>
                  <Descriptions.Item label="N° Compte">{statement.compte.accountNumber}</Descriptions.Item>
                  <Descriptions.Item label="Type">{statement.compte.accountType}</Descriptions.Item>
                  <Descriptions.Item label="Periode">{statement.periode.label}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Solde d'ouverture"
                      value={statement.soldeOuverture}
                      suffix="FCFA"
                      precision={0}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Total Depots"
                      value={statement.totalDepots}
                      suffix="FCFA"
                      precision={0}
                      valueStyle={{ color: '#52c41a', fontSize: 16 }}
                    />
                    <Text type="secondary">{statement.nbDepots} operation(s)</Text>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Total Retraits"
                      value={statement.totalRetraits}
                      suffix="FCFA"
                      precision={0}
                      valueStyle={{ color: '#ff4d4f', fontSize: 16 }}
                    />
                    <Text type="secondary">{statement.nbRetraits} operation(s)</Text>
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Frais preleves"
                      value={statement.totalFrais}
                      suffix="FCFA"
                      precision={0}
                      valueStyle={{ color: '#faad14', fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Nb transactions"
                      value={statement.nbTransactions}
                      valueStyle={{ fontSize: 16 }}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={4}>
                  <Card size="small">
                    <Statistic
                      title="Solde de cloture"
                      value={statement.soldeCloture}
                      suffix="FCFA"
                      precision={0}
                      valueStyle={{ fontSize: 16, fontWeight: 700 }}
                    />
                  </Card>
                </Col>
              </Row>

              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Space>
                  <Button icon={<FileExcelOutlined />} onClick={exportStatementExcel}>
                    Export Excel
                  </Button>
                  <Button icon={<FilePdfOutlined />} onClick={exportStatementPdf}>
                    Export PDF
                  </Button>
                </Space>
              </div>

              <Table
                dataSource={statement.lignes}
                columns={statementColumns}
                rowKey="reference"
                size="small"
                pagination={false}
                scroll={{ x: 900 }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: '#f0f5ff', fontWeight: 600 }}>
                      <Table.Summary.Cell index={0} colSpan={4}>TOTAUX</Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <Text style={{ color: '#ff4d4f' }}>
                          -{(statement.totalRetraits + statement.totalFrais).toLocaleString('fr-FR')}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <Text style={{ color: '#52c41a' }}>
                          +{statement.totalDepots.toLocaleString('fr-FR')}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        {statement.totalFrais.toLocaleString('fr-FR')}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </>
          )}
        </>
      ),
    },
    {
      key: 'history',
      label: <span><HistoryOutlined /> Historique des Transactions</span>,
      children: (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Select
                showSearch
                placeholder="Rechercher un compte..."
                style={{ width: '100%' }}
                value={selectedAccount}
                onChange={(v) => { setSelectedAccount(v); setHistory(null); }}
                filterOption={(input, option) =>
                  String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                }
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: getAccountLabel(acc),
                }))}
              />
            </Col>
            <Col xs={12} sm={4}>
              <Select
                mode="multiple"
                placeholder="Type(s)"
                allowClear
                style={{ width: '100%' }}
                value={historyTypes}
                onChange={setHistoryTypes}
                maxTagCount="responsive"
                options={[
                  { value: 'DEPOSIT', label: 'Depot' },
                  { value: 'WITHDRAWAL', label: 'Retrait' },
                  { value: 'TRANSFER', label: 'Transfert' },
                  { value: 'LOAN_DISBURSEMENT', label: 'Decaissement' },
                  { value: 'LOAN_REPAYMENT', label: 'Remboursement' },
                  { value: 'FEE', label: 'Frais' },
                ]}
              />
            </Col>
            <Col xs={12} sm={8}>
              <DatePicker.RangePicker
                value={historyDates as any}
                onChange={(dates) => setHistoryDates(dates as any || [null, null])}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                placeholder={['Date debut', 'Date fin']}
              />
            </Col>
            <Col xs={24} sm={4}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={() => fetchHistory(1)}
                loading={historyLoading}
                block
              >
                Rechercher
              </Button>
            </Col>
          </Row>

          {history && (
            <>
              <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
                <Row gutter={16}>
                  <Col span={6}>
                    <Text type="secondary">Client:</Text>{' '}
                    <Text strong>{history.compte.clientName}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Compte:</Text>{' '}
                    <Text strong>{history.compte.accountNumber}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Type:</Text>{' '}
                    <Text strong>{history.compte.accountType}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Solde actuel:</Text>{' '}
                    <Text strong>{history.compte.balance.toLocaleString('fr-FR')} FCFA</Text>
                  </Col>
                </Row>
              </Card>

              <div style={{ marginBottom: 12, textAlign: 'right' }}>
                <Space>
                  <Button icon={<FileExcelOutlined />} onClick={exportHistoryExcel}>
                    Export Excel
                  </Button>
                  <Button icon={<FilePdfOutlined />} onClick={exportHistoryPdf}>
                    Export PDF
                  </Button>
                </Space>
              </div>

              <Table
                dataSource={history.data}
                columns={historyColumns}
                rowKey="id"
                size="small"
                scroll={{ x: 900 }}
                pagination={{
                  current: historyPage,
                  total: history.meta.total,
                  pageSize: history.meta.limit,
                  showTotal: (total) => `${total} transaction(s)`,
                  showSizeChanger: false,
                  onChange: (p) => fetchHistory(p),
                }}
              />
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ color: '#1B2A4A', marginBottom: 24 }}>
        <BankOutlined /> Releves & Historique
      </Title>

      <Card>
        <Tabs items={tabItems} defaultActiveKey="statement" />
      </Card>
    </div>
  );
}
