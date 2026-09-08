import { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Modal, Form, Input, Select, InputNumber, message, Tabs,
  Statistic, DatePicker, Badge, Popconfirm, Alert, Switch,
} from 'antd';
import {
  ThunderboltOutlined, DropboxOutlined, PlayCircleOutlined,
  PhoneOutlined, BankOutlined, PlusOutlined, PrinterOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
  BarChartOutlined, ReloadOutlined, FileTextOutlined,
  SearchOutlined, WalletOutlined, SettingOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const OPERATOR_ICONS: Record<string, React.ReactNode> = {
  ENEO: <ThunderboltOutlined style={{ color: '#F5A623' }} />,
  CAMWATER: <DropboxOutlined style={{ color: '#2980b9' }} />,
  CANAL_PLUS: <PlayCircleOutlined style={{ color: '#e74c3c' }} />,
  CAMTEL: <PhoneOutlined style={{ color: '#27ae60' }} />,
  AIRTIME: <PhoneOutlined style={{ color: '#9b59b6' }} />,
  STARTIMES: <PlayCircleOutlined style={{ color: '#e67e22' }} />,
  DGI: <BankOutlined style={{ color: '#8e44ad' }} />,
  SCHOOL: <FileTextOutlined style={{ color: '#2c3e50' }} />,
  OTHER: <DollarOutlined style={{ color: '#7f8c8d' }} />,
};

const OPERATOR_COLORS: Record<string, string> = {
  ENEO: 'orange', CAMWATER: 'blue', CANAL_PLUS: 'red',
  CAMTEL: 'green', AIRTIME: 'purple', STARTIMES: 'volcano',
  DGI: 'purple', SCHOOL: 'cyan', OTHER: 'default',
};

const STATUS_COLORS: Record<string, string> = {
  COLLECTED: 'processing', REVERSED: 'success', CANCELLED: 'error',
};
const STATUS_LABELS: Record<string, string> = {
  COLLECTED: 'En attente reversement', REVERSED: 'Reversé', CANCELLED: 'Annulé',
};

export default function BillPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<any>(null);
  const [operators, setOperators] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [reversalStats, setReversalStats] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [form] = Form.useForm();
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [filters, setFilters] = useState<any>({ page: 1, limit: 20 });
  const [activeTab, setActiveTab] = useState('payments');
  const receiptRef = useRef<HTMLDivElement>(null);

  // ElgioPay state
  const [elgioPayServices, setElgioPayServices] = useState<any[]>([]);
  const [billLookupResult, setBillLookupResult] = useState<any>(null);
  const [elgioPayLoading, setElgioPayLoading] = useState(false);
  const [elgioPayModalOpen, setElgioPayModalOpen] = useState(false);
  const [elgioPayForm] = Form.useForm();
  const [elgioPayPayForm] = Form.useForm();
  const [elgioPayPayMode, setElgioPayPayMode] = useState<string>('CASH');
  const [selectedOperator, setSelectedOperator] = useState<string>('');

  // Recharge ElgioPay state
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeResult, setRechargeResult] = useState<any>(null);
  const [rechargePolling, setRechargePolling] = useState(false);
  const [elgioBalance, setElgioBalance] = useState<any>(null);
  const [rechargeForm] = Form.useForm();
  const [rechargeHistory, setRechargeHistory] = useState<any[]>([]);
  const [rechargeHistoryTotal, setRechargeHistoryTotal] = useState(0);
  const [rechargeHistoryPage, setRechargeHistoryPage] = useState(1);
  const [elgioConfig, setElgioConfig] = useState<any>(null);
  const [switchingMode, setSwitchingMode] = useState(false);

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  const checkElgioPayStatus = async () => {
    try {
      await api.get('/bill-payments/elgiopay/status');
    } catch (e) {
      // ElgioPay non configure
    }
  };

  const fetchElgioPayServices = async () => {
    try {
      const res = await api.get('/bill-payments/elgiopay/services');
      setElgioPayServices(Array.isArray(res.data) ? res.data : res.data?.services || []);
    } catch (e) {
      // Services non disponibles
    }
  };

  const handleBillLookup = async (values: any) => {
    setElgioPayLoading(true);
    setBillLookupResult(null);
    try {
      const res = await api.get('/bill-payments/elgiopay/lookup', {
        params: { serviceCode: values.serviceCode, subscriberNumber: values.subscriberNumber },
      });
      setBillLookupResult(res.data);
      // Pre-fill payment form
      setElgioPayPayMode('CASH');
      elgioPayPayForm.setFieldsValue({
        serviceCode: values.serviceCode,
        subscriberNumber: values.subscriberNumber,
        amount: res.data.amount || 0,
        payerName: res.data.customerName || res.data.serviceName || '',
        operator: selectedOperator,
        agencyId: user.agencyId,
        paymentMode: 'CASH',
      });
      message.success('Facture trouvee !');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Facture introuvable');
    }
    setElgioPayLoading(false);
  };

  const handleElgioPayPay = async (values: any) => {
    setElgioPayLoading(true);
    try {
      const res = await api.post('/bill-payments/elgiopay/pay', {
        ...values,
        amount: Number(values.amount),
        fees: values.fees ? Number(values.fees) : 0,
      });
      message.success('Paiement effectue avec succes via ElgioPay !');
      setReceiptData(res.data.payment);
      setReceiptVisible(true);
      setElgioPayModalOpen(false);
      setBillLookupResult(null);
      elgioPayForm.resetFields();
      elgioPayPayForm.resetFields();
      fetchAll();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur lors du paiement ElgioPay');
    }
    setElgioPayLoading(false);
  };

  const fetchElgioConfig = async () => {
    try {
      const res = await api.get('/settings/elgiopay');
      setElgioConfig(res.data);
    } catch { /* ignore */ }
  };

  const handleSwitchMode = async (toProduction: boolean) => {
    const newMode = toProduction ? 'production' : 'sandbox';
    const newUrl = toProduction ? 'https://api.elgiopay.com' : 'https://sandbox-api.elgiopay.com';

    Modal.confirm({
      title: toProduction ? 'Passer en PRODUCTION ?' : 'Revenir en SANDBOX ?',
      icon: <ExclamationCircleOutlined />,
      content: toProduction
        ? 'En mode production, les paiements seront REELS. Les clients seront effectivement debites. Voulez-vous aussi supprimer les donnees de test sandbox ?'
        : 'En mode sandbox, les paiements seront simules (pas de debit reel).',
      okText: toProduction ? 'Oui, passer en production et purger' : 'Oui, revenir en sandbox',
      okType: toProduction ? 'danger' : 'default',
      cancelText: 'Annuler',
      onOk: async () => {
        setSwitchingMode(true);
        try {
          await api.post('/settings/elgiopay', { mode: newMode, baseUrl: newUrl });
          // Purger les donnees sandbox quand on passe en production
          if (toProduction) {
            try {
              const purge = await api.post('/bill-payments/elgiopay/purge-sandbox');
              if (purge.data.count > 0) {
                message.info(`${purge.data.count} donnee(s) de test supprimee(s)`);
              }
            } catch { /* ignore */ }
          }
          message.success(`Mode ${newMode} active !`);
          fetchElgioConfig();
          fetchElgioBalance();
          fetchAll();
          fetchRechargeHistory();
        } catch (e: any) {
          message.error(e.response?.data?.message || 'Erreur lors du changement de mode');
        }
        setSwitchingMode(false);
      },
    });
  };

  const handlePurgeSandbox = async () => {
    Modal.confirm({
      title: 'Supprimer les donnees de test ?',
      icon: <ExclamationCircleOutlined />,
      content: 'Cela supprimera toutes les transactions de test (references ELGIO-* et RECH-*). Cette action est irreversible.',
      okText: 'Oui, supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          const res = await api.post('/bill-payments/elgiopay/purge-sandbox');
          message.success(res.data.message);
          fetchAll();
          fetchRechargeHistory();
        } catch (e: any) {
          message.error(e.response?.data?.message || 'Erreur');
        }
      },
    });
  };

  const handleSaveElgioKey = async (key: string) => {
    if (!key.trim()) return;
    try {
      await api.post('/settings/elgiopay', { secretToken: key });
      message.success('Cle API sauvegardee !');
      fetchElgioConfig();
      fetchElgioBalance();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const fetchRechargeHistory = async (page = 1) => {
    try {
      const res = await api.get(`/bill-payments/elgiopay/recharges?page=${page}&limit=10`);
      setRechargeHistory(res.data.data || []);
      setRechargeHistoryTotal(res.data.total || 0);
    } catch { /* ignore */ }
  };

  const fetchElgioBalance = async () => {
    try {
      const res = await api.get('/bill-payments/elgiopay/balance');
      setElgioBalance(res.data);
    } catch { /* ignore */ }
  };

  const handleRecharge = async (values: any) => {
    setRechargeLoading(true);
    setRechargeResult(null);
    try {
      const res = await api.post('/bill-payments/elgiopay/recharge', {
        amount: Number(values.amount),
        customerPhone: values.customerPhone,
        paymentMethod: values.paymentMethod,
        customerName: values.customerName || '',
      });
      setRechargeResult(res.data);
      message.success(res.data.message || 'Demande envoyee ! Validez sur votre telephone.');
      // Start polling for status
      if (res.data.transactionId) {
        setRechargePolling(true);
        pollRechargeStatus(res.data.transactionId);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur lors de la recharge');
    }
    setRechargeLoading(false);
  };

  const pollRechargeStatus = async (txnId: string) => {
    let attempts = 0;
    const maxAttempts = 12; // 60 seconds max
    const poll = async () => {
      attempts++;
      try {
        const res = await api.get(`/bill-payments/elgiopay/recharge/${txnId}`);
        const status = res.data?.status;
        setRechargeResult((prev: any) => ({ ...prev, ...res.data, status }));
        if (status === 'completed' || status === 'successful') {
          message.success('Recharge effectuee avec succes !');
          setRechargePolling(false);
          fetchElgioBalance();
          return;
        }
        if (status === 'failed' || status === 'cancelled') {
          message.error('La recharge a echoue ou a ete annulee.');
          setRechargePolling(false);
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setRechargePolling(false);
          message.info('Verification en cours... Vous pouvez verifier manuellement.');
        }
      } catch {
        setRechargePolling(false);
      }
    };
    setTimeout(poll, 5000);
  };

  const handleVerifyRecharge = async () => {
    if (!rechargeResult?.transactionId && !rechargeResult?.transaction_id) return;
    const txnId = rechargeResult.transactionId || rechargeResult.transaction_id;
    try {
      const res = await api.post(`/bill-payments/elgiopay/recharge/${txnId}/verify`);
      setRechargeResult((prev: any) => ({ ...prev, ...res.data }));
      if (res.data?.status === 'completed' || res.data?.status === 'successful') {
        message.success('Recharge confirmee !');
        fetchElgioBalance();
      } else {
        message.info(`Statut: ${res.data?.status || 'en cours'}`);
      }
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur de verification');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.set(k, String(v)));
      const [paymentsRes, kpisRes, opsRes, agenciesRes] = await Promise.all([
        api.get('/bill-payments?' + params),
        api.get('/bill-payments/kpis'),
        api.get('/bill-payments/operators'),
        api.get('/agencies'),
      ]);
      setPayments(paymentsRes.data.data || []);
      setTotal(paymentsRes.data.total || 0);
      setKpis(kpisRes.data);
      setOperators(opsRes.data || []);
      setAgencies(agenciesRes.data?.data || agenciesRes.data || []);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur de chargement');
    }
    setLoading(false);
  };

  const fetchReversalStats = async () => {
    try {
      const res = await api.get('/bill-payments/reversal-stats');
      setReversalStats(res.data);
    } catch (e) {}
  };

  const fetchAccounts = async (search: string) => {
    if (!search) return;
    try {
      const res = await api.get('/accounts?search=' + search + '&limit=10');
      setAccounts(res.data.data || []);
    } catch (e) {}
  };

  useEffect(() => { fetchAll(); checkElgioPayStatus(); fetchElgioBalance(); fetchElgioConfig(); }, [filters]);
  useEffect(() => {
    if (activeTab === 'reversal') fetchReversalStats();
    if (activeTab === 'recharges') fetchRechargeHistory(rechargeHistoryPage);
  }, [activeTab, rechargeHistoryPage]);

  const handleSubmit = async (values: any) => {
    try {
      const res = await api.post('/bill-payments', {
        ...values,
        amount: Number(values.amount),
        fees: values.fees ? Number(values.fees) : 0,
      });
      message.success('Paiement enregistré avec succès !');
      setReceiptData(res.data);
      setReceiptVisible(true);
      setModalOpen(false);
      form.resetFields();
      fetchAll();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.patch('/bill-payments/' + id + '/cancel');
      message.success('Paiement annulé');
      fetchAll();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const handleMarkReversed = async (operator: string) => {
    try {
      const res = await api.post('/bill-payments/mark-reversed', { operator });
      message.success(res.data.message);
      fetchReversalStats();
      fetchAll();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const columns = [
    {
      title: 'Référence',
      dataIndex: 'reference',
      render: (ref: string) => <Text code style={{ fontSize: 12 }}>{ref}</Text>,
    },
    {
      title: 'Opérateur',
      dataIndex: 'operator',
      render: (op: string, r: any) => (
        <Space>
          {OPERATOR_ICONS[op]}
          <Tag color={OPERATOR_COLORS[op]}>{r.operator}</Tag>
        </Space>
      ),
    },
    { title: 'N° Facture / Abonné', dataIndex: 'billNumber' },
    { title: 'Payeur', dataIndex: 'payerName', render: (n: string, r: any) => <><div>{n}</div><Text type="secondary" style={{ fontSize: 11 }}>{r.payerPhone || ''}</Text></> },
    {
      title: 'Montant',
      dataIndex: 'amount',
      render: (v: number, r: any) => (
        <><strong>{Number(v).toLocaleString('fr-FR')} FCFA</strong>
          {Number(r.fees) > 0 && <div><Text type="secondary" style={{ fontSize: 11 }}>+ {Number(r.fees).toLocaleString('fr-FR')} F (frais)</Text></div>}
        </>
      ),
    },
    {
      title: 'Mode',
      dataIndex: 'paymentMode',
      render: (m: string) => <Tag color={m === 'CASH' ? 'green' : 'blue'}>{m === 'CASH' ? '💵 Espèces' : '🏦 Compte'}</Tag>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      render: (s: string) => <Badge status={STATUS_COLORS[s] as any} text={STATUS_LABELS[s] || s} />,
    },
    {
      title: 'Agence / Caissier',
      render: (_: any, r: any) => (
        <><div style={{ fontSize: 12 }}>{r.agency?.name}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.collectedBy?.firstName} {r.collectedBy?.lastName}</Text>
        </>
      ),
    },
    { title: 'Date', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    {
      title: 'Actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => { setReceiptData(r); setReceiptVisible(true); }}>Reçu</Button>
          {r.status === 'COLLECTED' && (
            <Popconfirm title="Annuler ce paiement ?" onConfirm={() => handleCancel(r.id)}>
              <Button size="small" danger icon={<CloseCircleOutlined />}>Annuler</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col><Title level={3} style={{ margin: 0, color: '#1B2A4A' }}>
          <ThunderboltOutlined style={{ color: '#F5A623', marginRight: 8 }} />
          Paiements de Factures
        </Title></Col>
        <Col>
          <Space>
            {elgioBalance?.balance != null && (
              <Tag color="blue" style={{ fontSize: 13, padding: '4px 12px' }}>
                Solde ElgioPay: {Number(elgioBalance.balance).toLocaleString('fr-FR')} FCFA
              </Tag>
            )}
            <Button icon={<BankOutlined />} onClick={() => { setRechargeModalOpen(true); setRechargeResult(null); rechargeForm.resetFields(); fetchElgioBalance(); }}
              style={{ background: '#27ae60', borderColor: '#27ae60', color: '#fff' }}>
              Recharger compte
            </Button>
            <Button type="primary" icon={<WalletOutlined />} onClick={() => { setElgioPayModalOpen(true); fetchElgioPayServices(); }}
              style={{ background: '#F5A623', borderColor: '#F5A623' }}>
              Payer facture en ligne
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Saisie manuelle
            </Button>
          </Space>
        </Col>
      </Row>

      {/* KPIs */}
      {kpis && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} md={6}>
            <Card><Statistic title="Total collecté" value={kpis.totalAmount} suffix="FCFA"
              formatter={(v) => Number(v).toLocaleString('fr-FR')}
              valueStyle={{ color: '#1B2A4A', fontWeight: 800 }} prefix={<DollarOutlined />} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="Transactions" value={kpis.totalCount}
              valueStyle={{ color: '#2980b9', fontWeight: 800 }} prefix={<FileTextOutlined />} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="Aujourd'hui" value={kpis.todayCount}
              valueStyle={{ color: '#27ae60', fontWeight: 800 }} prefix={<CheckCircleOutlined />} /></Card>
          </Col>
          <Col xs={12} md={6}>
            <Card><Statistic title="À reverser" value={kpis.pendingReversal?.amount || 0} suffix="FCFA"
              formatter={(v) => Number(v).toLocaleString('fr-FR')}
              valueStyle={{ color: '#e74c3c', fontWeight: 800 }} prefix={<ReloadOutlined />} /></Card>
          </Col>
        </Row>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'payments',
          label: <span><FileTextOutlined /> Historique</span>,
          children: (
            <Card>
              {/* Filtres */}
              <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col xs={24} md={6}>
                  <Input.Search placeholder="Nom, facture, réf..." allowClear
                    onSearch={(v) => setFilters({ ...filters, search: v, page: 1 })} />
                </Col>
                <Col xs={12} md={4}>
                  <Select placeholder="Opérateur" allowClear style={{ width: '100%' }}
                    onChange={(v) => setFilters({ ...filters, operator: v, page: 1 })}>
                    {operators.map(o => <Select.Option key={o.key} value={o.key}>{o.label}</Select.Option>)}
                  </Select>
                </Col>
                <Col xs={12} md={4}>
                  <Select placeholder="Statut" allowClear style={{ width: '100%' }}
                    onChange={(v) => setFilters({ ...filters, status: v, page: 1 })}>
                    <Select.Option value="COLLECTED">En attente reversement</Select.Option>
                    <Select.Option value="REVERSED">Reversé</Select.Option>
                    <Select.Option value="CANCELLED">Annulé</Select.Option>
                  </Select>
                </Col>
                <Col xs={24} md={8}>
                  <RangePicker style={{ width: '100%' }} onChange={(dates) => {
                    if (dates) setFilters({ ...filters, dateFrom: dates[0]?.format('YYYY-MM-DD'), dateTo: dates[1]?.format('YYYY-MM-DD'), page: 1 });
                    else setFilters({ ...filters, dateFrom: undefined, dateTo: undefined, page: 1 });
                  }} />
                </Col>
              </Row>
              <Table
                columns={columns}
                dataSource={payments}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ current: filters.page, pageSize: filters.limit, total, showTotal: (t) => `${t} paiements`, onChange: (p) => setFilters({ ...filters, page: p }) }}
                scroll={{ x: 1200 }}
              />
            </Card>
          ),
        },
        {
          key: 'reversal',
          label: <span><BarChartOutlined /> Bordereau de reversement</span>,
          children: (
            <Card>
              <Alert type="info" showIcon style={{ marginBottom: 16 }}
                message="Ce bordereau récapitule les montants collectés en attente de reversement aux opérateurs. Après avoir effectué le paiement à l'opérateur, cliquez sur « Marquer reversé »." />
              {reversalStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                  <p>Aucun montant en attente de reversement.</p>
                </div>
              ) : reversalStats.map(stat => (
                <Card key={stat.operator} style={{ marginBottom: 16, border: '1.5px solid #e2e8f0' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        {OPERATOR_ICONS[stat.operator]}
                        <div>
                          <Title level={5} style={{ margin: 0 }}>{stat.label}</Title>
                          <Text type="secondary">{stat.count} paiements collectés</Text>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      <Space size="large">
                        <Statistic title="À reverser" value={stat.toReverse}
                          formatter={(v) => Number(v).toLocaleString('fr-FR') + ' FCFA'}
                          valueStyle={{ color: '#1B2A4A', fontWeight: 800, fontSize: 18 }} />
                        <Popconfirm
                          title={`Confirmer le reversement de ${stat.toReverse.toLocaleString('fr-FR')} FCFA à ${stat.label} ?`}
                          onConfirm={() => handleMarkReversed(stat.operator)}
                          okText="Oui, reversé" cancelText="Annuler">
                          <Button type="primary" icon={<CheckCircleOutlined />}
                            style={{ background: '#27ae60', borderColor: '#27ae60' }}>
                            Marquer reversé
                          </Button>
                        </Popconfirm>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              ))}
            </Card>
          ),
        },
        {
          key: 'recharges',
          label: <span><WalletOutlined /> Recharges ElgioPay</span>,
          children: (
            <Card>
              {/* Configuration ElgioPay */}
              <Card size="small" style={{ marginBottom: 16, border: '1.5px solid #e2e8f0' }}
                title={<><SettingOutlined /> Configuration ElgioPay</>}>
                <Row gutter={16} align="middle">
                  <Col xs={24} md={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Mode actuel</Text>
                      <div>
                        <Tag color={elgioConfig?.mode === 'production' ? 'red' : 'blue'} style={{ fontSize: 14, padding: '4px 12px' }}>
                          {elgioConfig?.mode === 'production' ? '🔴 PRODUCTION' : '🔵 SANDBOX (Test)'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Solde</Text>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#1B2A4A' }}>
                        {elgioBalance?.balance != null ? `${Number(elgioBalance.balance).toLocaleString('fr-FR')} FCFA` : '—'}
                      </div>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Basculer le mode</Text>
                      <div>
                        <Switch
                          checked={elgioConfig?.mode === 'production'}
                          loading={switchingMode}
                          onChange={(checked) => handleSwitchMode(checked)}
                          checkedChildren="Production"
                          unCheckedChildren="Sandbox"
                          style={{ background: elgioConfig?.mode === 'production' ? '#e74c3c' : undefined }}
                        />
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: 8 }}>
                  <Col xs={24} md={16}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Cle API (Secret Token)</Text>
                    <Input.Search
                      placeholder={elgioConfig?.secretTokenConfigured ? '••••••••••• (cle configuree)' : 'Entrer la cle API...'}
                      enterButton="Sauvegarder"
                      onSearch={handleSaveElgioKey}
                      style={{ marginTop: 4 }}
                    />
                  </Col>
                  <Col xs={24} md={8}>
                    <Text type="secondary" style={{ fontSize: 12 }}>URL API</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text code style={{ fontSize: 11 }}>{elgioConfig?.baseUrl || '—'}</Text>
                    </div>
                  </Col>
                </Row>
                <Row style={{ marginTop: 12 }} justify="space-between" align="middle">
                  {elgioConfig?.mode === 'production' && (
                    <Col flex="auto">
                      <Alert type="warning" showIcon
                        message="Mode PRODUCTION actif — les paiements sont reels et les clients seront debites." />
                    </Col>
                  )}
                  <Col>
                    <Button danger size="small" icon={<CloseCircleOutlined />} onClick={handlePurgeSandbox}
                      style={{ marginLeft: 8 }}>
                      Purger donnees test
                    </Button>
                  </Col>
                </Row>
              </Card>

              <Table
                dataSource={rechargeHistory}
                rowKey="id"
                size="small"
                pagination={{
                  current: rechargeHistoryPage,
                  pageSize: 10,
                  total: rechargeHistoryTotal,
                  showTotal: (t) => `${t} recharges`,
                  onChange: (p) => setRechargeHistoryPage(p),
                }}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                  },
                  {
                    title: 'Reference',
                    dataIndex: 'reference',
                    render: (ref: string) => <Text code style={{ fontSize: 12 }}>{ref}</Text>,
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'amount',
                    render: (v: number) => <strong style={{ color: '#27ae60' }}>{Number(v).toLocaleString('fr-FR')} FCFA</strong>,
                  },
                  {
                    title: 'Methode',
                    dataIndex: 'paymentMode',
                    render: (m: string) => (
                      <Tag color={m === 'MTN_MOMO' ? 'gold' : 'orange'}>
                        {m === 'MTN_MOMO' ? 'MTN MoMo' : m === 'ORANGE_MONEY' ? 'Orange Money' : m}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Numero preleve',
                    dataIndex: 'billNumber',
                  },
                  {
                    title: 'Nom',
                    dataIndex: 'payerName',
                  },
                  {
                    title: 'Statut',
                    dataIndex: 'status',
                    render: (s: string) => (
                      <Badge
                        status={s === 'COLLECTED' ? 'success' : s === 'PENDING' ? 'processing' : 'error'}
                        text={s === 'COLLECTED' ? 'Reussie' : s === 'PENDING' ? 'En attente' : s === 'CANCELLED' ? 'Echouee' : s}
                      />
                    ),
                  },
                  {
                    title: 'Initie par',
                    render: (_: any, r: any) => r.collectedBy ? `${r.collectedBy.firstName} ${r.collectedBy.lastName}` : '-',
                  },
                ]}
              />
            </Card>
          ),
        },
      ]} />

      {/* Modal nouveau paiement */}
      <Modal title={<><ThunderboltOutlined style={{ color: '#F5A623', marginRight: 8 }} />Enregistrer un paiement de facture</>}
        open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null} width={560}>
        <Alert type="info" showIcon style={{ marginBottom: 20 }}
          message="Le payeur n'a pas besoin d'être client GFS. Vous pouvez encaisser pour n'importe qui." />
        <Form form={form} layout="vertical" onFinish={handleSubmit}
          initialValues={{ paymentMode: 'CASH', fees: 0, agencyId: user.agencyId }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="operator" label="Opérateur *" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner...">
                  {operators.map(o => (
                    <Select.Option key={o.key} value={o.key}>
                      <Space>{OPERATOR_ICONS[o.key]}{o.label}</Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="billNumber" label="N° de facture / Abonné *" rules={[{ required: true }]}>
                <Input placeholder="Ex: 123456789" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item name="payerName" label="Nom du payeur *" rules={[{ required: true }]}>
                <Input placeholder="Jean KAMGA" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="payerPhone" label="Téléphone">
                <Input placeholder="+237 6XX XXX XXX" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="Montant de la facture (FCFA) *" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} step={500}
                  formatter={(v) => v ? Number(v).toLocaleString('fr-FR') : ''}
                  parser={(v) => (v ? Number(v.replace(/\s/g, '')) : 0) as any} placeholder="24 500" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="fees" label="Frais de service GFS (FCFA)">
                <InputNumber style={{ width: '100%' }} min={0} step={100}
                  formatter={(v) => v ? Number(v).toLocaleString('fr-FR') : ''}
                  parser={(v) => (v ? Number(v.replace(/\s/g, '')) : 0) as any} placeholder="500" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="paymentMode" label="Mode de règlement *" rules={[{ required: true }]}>
            <Select onChange={(v) => setPaymentMode(v)}>
              <Select.Option value="CASH">💵 Espèces (cash)</Select.Option>
              <Select.Option value="ACCOUNT">🏦 Débit compte GFS</Select.Option>
            </Select>
          </Form.Item>
          {paymentMode === 'ACCOUNT' && (
            <Form.Item name="accountId" label="Compte GFS à débiter *" rules={[{ required: true }]}>
              <Select showSearch placeholder="Rechercher un compte..."
                onSearch={fetchAccounts} filterOption={false} notFoundContent="Aucun résultat">
                {accounts.map(a => (
                  <Select.Option key={a.id} value={a.id}>
                    {a.accountNumber} – {a.client?.firstName} {a.client?.lastName} ({Number(a.balance).toLocaleString('fr-FR')} FCFA)
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
          <Form.Item name="agencyId" label="Agence *" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner l'agence">
              {agencies.map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes (facultatif)">
            <Input.TextArea rows={2} placeholder="Observations..." />
          </Form.Item>
          <Row justify="end" gutter={12}>
            <Col><Button onClick={() => { setModalOpen(false); form.resetFields(); }}>Annuler</Button></Col>
            <Col><Button type="primary" htmlType="submit"
              style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}
              icon={<CheckCircleOutlined />}>Enregistrer & Imprimer reçu</Button></Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal ElgioPay - Paiement facture en ligne */}
      <Modal
        title={<><WalletOutlined style={{ color: '#F5A623', marginRight: 8 }} />Payer une facture via ElgioPay</>}
        open={elgioPayModalOpen}
        onCancel={() => { setElgioPayModalOpen(false); setBillLookupResult(null); elgioPayForm.resetFields(); elgioPayPayForm.resetFields(); }}
        footer={null} width={640}>

        {!billLookupResult ? (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 20 }}
              message="Recherchez la facture du client en saisissant son numero d'abonne. Le montant sera recupere automatiquement depuis l'operateur." />

            <Form form={elgioPayForm} layout="vertical" onFinish={handleBillLookup}>
              <Form.Item name="operator" label="Categorie" rules={[{ required: true }]}>
                <Select placeholder="Choisir la categorie" onChange={(v) => { setSelectedOperator(v); elgioPayForm.setFieldValue('serviceCode', undefined); }}>
                  <Select.Option value="ENEO">
                    <Space><ThunderboltOutlined style={{ color: '#F5A623' }} /> Electricite (ENEO)</Space>
                  </Select.Option>
                  <Select.Option value="CAMWATER">
                    <Space><DropboxOutlined style={{ color: '#2980b9' }} /> Eau (CamWater)</Space>
                  </Select.Option>
                  <Select.Option value="CANAL_PLUS">
                    <Space><PlayCircleOutlined style={{ color: '#e74c3c' }} /> TV & Cable (Canal+, StarTimes)</Space>
                  </Select.Option>
                  <Select.Option value="CAMTEL">
                    <Space><PhoneOutlined style={{ color: '#27ae60' }} /> Internet (Camtel Data)</Space>
                  </Select.Option>
                  <Select.Option value="AIRTIME">
                    <Space><PhoneOutlined style={{ color: '#9b59b6' }} /> Recharge Mobile (MTN, Orange, Camtel)</Space>
                  </Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="serviceCode" label="Service" rules={[{ required: true }]}>
                <Select placeholder="Selectionner le service" showSearch optionFilterProp="children">
                  {((): { code: string; name: string; range?: string; description?: string }[] => {
                    const servicesMap: Record<string, { code: string; name: string; range: string }[]> = {
                      ENEO: [
                        { code: 'ELECTRICITY_ENEO_POSTPAID', name: 'ENEO Factures (Postpaid)', range: '500 - 1 000 000 XAF' },
                        { code: 'ELECTRICITY_ENEO_PREPAID', name: 'ENEO Prepaid', range: '500 - 500 000 XAF' },
                      ],
                      CAMWATER: [
                        { code: 'WATER_CAMWATER', name: 'CamWater Factures', range: '500 - 500 000 XAF' },
                      ],
                      CANAL_PLUS: [
                        { code: 'TV_CANAL_PLUS', name: 'Canal+', range: '5 000 - 100 000 XAF' },
                        { code: 'TV_STARTIMES', name: 'StarTimes', range: '2 000 - 50 000 XAF' },
                      ],
                      CAMTEL: [
                        { code: 'DATA_CAMTEL', name: 'Camtel Data / Internet', range: '1 000 - 200 000 XAF' },
                      ],
                      AIRTIME: [
                        { code: 'AIRTIME_MTN_CM', name: 'MTN Recharge/Topup', range: '100 - 50 000 XAF' },
                        { code: 'AIRTIME_ORANGE_CM', name: 'Orange Recharge/Topup', range: '100 - 50 000 XAF' },
                        { code: 'AIRTIME_CAMTEL', name: 'Camtel Recharge/Topup', range: '100 - 50 000 XAF' },
                      ],
                    };
                    return selectedOperator ? (servicesMap[selectedOperator] || []) : elgioPayServices;
                  })().map((s: any) => (
                    <Select.Option key={s.code} value={s.code}>
                      {s.name} {s.range ? `(${s.range})` : s.description ? `- ${s.description}` : ''}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="subscriberNumber" label="Numero d'abonne / compteur" rules={[{ required: true }]}>
                <Input placeholder="Ex: 123456789" prefix={<SearchOutlined />} />
              </Form.Item>
              <Row justify="end">
                <Button type="primary" htmlType="submit" loading={elgioPayLoading}
                  icon={<SearchOutlined />} style={{ background: '#F5A623', borderColor: '#F5A623' }}>
                  Rechercher la facture
                </Button>
              </Row>
            </Form>
          </>
        ) : (
          <>
            <Card style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Row gutter={16}>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>Client</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{billLookupResult.customerName || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>Dette totale</div>
                  <div style={{ fontWeight: 900, fontSize: 20, color: '#1B2A4A' }}>
                    {Number(billLookupResult.amount).toLocaleString('fr-FR')} {billLookupResult.currency || 'FCFA'}
                  </div>
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>N Abonne</div>
                  <div>{billLookupResult.customerNumber}</div>
                </Col>
                <Col span={12}>
                  <div style={{ color: '#666', fontSize: 12 }}>Service</div>
                  <div>{billLookupResult.serviceCode}</div>
                </Col>
              </Row>

              {/* Detail des factures */}
              {billLookupResult.items && billLookupResult.items.length > 1 && (
                <div style={{ marginTop: 12, borderTop: '1px dashed #b7eb8f', paddingTop: 10 }}>
                  <div style={{ color: '#666', fontSize: 12, marginBottom: 6 }}>Detail des factures ({billLookupResult.items.length})</div>
                  {billLookupResult.items.map((item: any, idx: number) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 10px', marginBottom: 4, borderRadius: 6,
                      background: item.billType === 'OVERDUE' ? '#fff2f0' : '#f9f9f9',
                      border: item.billType === 'OVERDUE' ? '1px solid #ffa39e' : '1px solid #e8e8e8',
                    }}>
                      <div>
                        <Tag color={item.billType === 'OVERDUE' ? 'red' : 'blue'} style={{ fontSize: 11 }}>
                          {item.billType === 'OVERDUE' ? 'IMPAYES' : item.billMonth ? `${item.billMonth}/${item.billYear}` : 'FACTURE'}
                        </Tag>
                        <span style={{ fontSize: 12, color: '#555' }}>
                          {item.description || `Facture N° ${item.billNumber}`}
                          {item.billDueDate && <span style={{ marginLeft: 8, color: '#999' }}>Echéance: {dayjs(item.billDueDate).format('DD/MM/YYYY')}</span>}
                        </span>
                      </div>
                      <strong style={{ color: item.billType === 'OVERDUE' ? '#e74c3c' : '#1B2A4A', fontSize: 14 }}>
                        {Number(item.amount).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Form form={elgioPayPayForm} layout="vertical" onFinish={handleElgioPayPay}
              initialValues={{ paymentMode: 'CASH', fees: 0, agencyId: user.agencyId }}>
              <Form.Item name="serviceCode" hidden><Input /></Form.Item>
              <Form.Item name="subscriberNumber" hidden><Input /></Form.Item>
              <Form.Item name="operator" hidden><Input /></Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="amount" label="Montant (FCFA)" rules={[{ required: true }]}>
                    <InputNumber style={{ width: '100%' }} min={1}
                      formatter={(v) => v ? Number(v).toLocaleString('fr-FR') : ''}
                      parser={(v) => (v ? Number(v.replace(/\s/g, '')) : 0) as any} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="fees" label="Frais GFS (FCFA)">
                    <InputNumber style={{ width: '100%' }} min={0}
                      formatter={(v) => v ? Number(v).toLocaleString('fr-FR') : ''}
                      parser={(v) => (v ? Number(v.replace(/\s/g, '')) : 0) as any} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="payerName" label="Nom du payeur" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="payerPhone" label="Telephone">
                    <Input placeholder="+237 6XX XXX XXX" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="paymentMode" label="Mode de reglement" rules={[{ required: true }]}>
                <Select onChange={(v) => setElgioPayPayMode(v)}>
                  <Select.Option value="CASH">Especes (cash)</Select.Option>
                  <Select.Option value="ACCOUNT">Debit compte GFS</Select.Option>
                </Select>
              </Form.Item>
              {elgioPayPayMode === 'ACCOUNT' && (
                <Form.Item name="accountId" label="Compte GFS a debiter" rules={[{ required: true }]}>
                  <Select showSearch placeholder="Rechercher un compte..."
                    onSearch={fetchAccounts} filterOption={false} notFoundContent="Aucun resultat">
                    {accounts.map(a => (
                      <Select.Option key={a.id} value={a.id}>
                        {a.accountNumber} - {a.client?.firstName} {a.client?.lastName} ({Number(a.balance).toLocaleString('fr-FR')} FCFA)
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
              <Form.Item name="agencyId" label="Agence" rules={[{ required: true }]}>
                <Select placeholder="Selectionner l'agence">
                  {agencies.map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="notes" label="Notes (facultatif)">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Row justify="end" gutter={12}>
                <Col><Button onClick={() => { setBillLookupResult(null); }}>Retour</Button></Col>
                <Col><Button type="primary" htmlType="submit" loading={elgioPayLoading}
                  icon={<CheckCircleOutlined />} style={{ background: '#27ae60', borderColor: '#27ae60' }}>
                  Confirmer le paiement
                </Button></Col>
              </Row>
            </Form>
          </>
        )}
      </Modal>

      {/* Modal Recharge ElgioPay */}
      <Modal
        title={<><BankOutlined style={{ color: '#27ae60', marginRight: 8 }} />Recharger le compte ElgioPay</>}
        open={rechargeModalOpen}
        onCancel={() => { setRechargeModalOpen(false); setRechargeResult(null); setRechargePolling(false); rechargeForm.resetFields(); }}
        footer={null} width={500}>

        {elgioBalance?.balance != null && (
          <Card style={{ marginBottom: 16, background: '#f0f9ff', border: '1px solid #91d5ff' }}>
            <Statistic title="Solde actuel ElgioPay" value={Number(elgioBalance.balance)} suffix="FCFA"
              formatter={(v) => Number(v).toLocaleString('fr-FR')}
              valueStyle={{ color: '#1B2A4A', fontWeight: 800 }} prefix={<WalletOutlined />} />
          </Card>
        )}

        {!rechargeResult ? (
          <>
            <Alert type="info" showIcon style={{ marginBottom: 20 }}
              message="Entrez le montant et le numero Mobile Money a prelever. Le proprietaire du numero recevra une demande de paiement sur son telephone." />

            <Form form={rechargeForm} layout="vertical" onFinish={handleRecharge}>
              <Form.Item name="amount" label="Montant a recharger (FCFA)" rules={[{ required: true, message: 'Montant requis' }]}>
                <InputNumber style={{ width: '100%' }} min={100} step={1000}
                  formatter={(v) => v ? Number(v).toLocaleString('fr-FR') : ''}
                  parser={(v) => (v ? Number(v.replace(/\s/g, '')) : 0) as any}
                  placeholder="Ex: 50 000" />
              </Form.Item>

              <Form.Item name="paymentMethod" label="Operateur Mobile Money" rules={[{ required: true, message: 'Choisir un operateur' }]}>
                <Select placeholder="Selectionner l'operateur">
                  <Select.Option value="mtn_mobile_money">
                    <Space><PhoneOutlined style={{ color: '#F5A623' }} /> MTN Mobile Money</Space>
                  </Select.Option>
                  <Select.Option value="orange_money">
                    <Space><PhoneOutlined style={{ color: '#e67e22' }} /> Orange Money</Space>
                  </Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="customerPhone" label="Numero de telephone a prelever" rules={[{ required: true, message: 'Numero requis' }]}>
                <Input placeholder="Ex: 237670000000" prefix={<PhoneOutlined />} />
              </Form.Item>

              <Form.Item name="customerName" label="Nom du titulaire (facultatif)">
                <Input placeholder="Ex: Jean KAMGA" />
              </Form.Item>

              <Row justify="end" gutter={12}>
                <Col><Button onClick={() => { setRechargeModalOpen(false); rechargeForm.resetFields(); }}>Annuler</Button></Col>
                <Col><Button type="primary" htmlType="submit" loading={rechargeLoading}
                  icon={<CheckCircleOutlined />} style={{ background: '#27ae60', borderColor: '#27ae60' }}>
                  Lancer la recharge
                </Button></Col>
              </Row>
            </Form>
          </>
        ) : (
          <>
            <Card style={{
              marginBottom: 16,
              background: rechargeResult.status === 'completed' || rechargeResult.status === 'successful' ? '#f6ffed' :
                rechargeResult.status === 'failed' || rechargeResult.status === 'cancelled' ? '#fff2f0' : '#fffbe6',
              border: `1px solid ${rechargeResult.status === 'completed' || rechargeResult.status === 'successful' ? '#b7eb8f' :
                rechargeResult.status === 'failed' || rechargeResult.status === 'cancelled' ? '#ffa39e' : '#ffe58f'}`,
            }}>
              <div style={{ textAlign: 'center' }}>
                {(rechargeResult.status === 'completed' || rechargeResult.status === 'successful') ? (
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#27ae60', marginBottom: 12 }} />
                ) : (rechargeResult.status === 'failed' || rechargeResult.status === 'cancelled') ? (
                  <CloseCircleOutlined style={{ fontSize: 48, color: '#e74c3c', marginBottom: 12 }} />
                ) : (
                  <ReloadOutlined spin={rechargePolling} style={{ fontSize: 48, color: '#F5A623', marginBottom: 12 }} />
                )}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>
                  {rechargeResult.status === 'completed' || rechargeResult.status === 'successful' ? 'Recharge reussie !' :
                    rechargeResult.status === 'failed' ? 'Recharge echouee' :
                    rechargeResult.status === 'cancelled' ? 'Recharge annulee' :
                    'En attente de validation...'}
                </div>
                <div style={{ color: '#666', marginTop: 4 }}>
                  {rechargeResult.message || `Statut: ${rechargeResult.status || 'pending'}`}
                </div>
                {rechargeResult.transactionId && (
                  <div style={{ marginTop: 8 }}>
                    <Text code style={{ fontSize: 12 }}>ID: {rechargeResult.transactionId || rechargeResult.transaction_id}</Text>
                  </div>
                )}
                {rechargeResult.amount?.total && (
                  <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: '#1B2A4A' }}>
                    {Number(rechargeResult.amount.total).toLocaleString('fr-FR')} FCFA
                  </div>
                )}
              </div>
            </Card>

            <Row justify="center" gutter={12}>
              {rechargeResult.status !== 'completed' && rechargeResult.status !== 'successful' &&
                rechargeResult.status !== 'failed' && rechargeResult.status !== 'cancelled' && (
                <Col><Button icon={<ReloadOutlined />} loading={rechargePolling} onClick={handleVerifyRecharge}>
                  Verifier le statut
                </Button></Col>
              )}
              <Col><Button type="primary" onClick={() => { setRechargeResult(null); rechargeForm.resetFields(); }}>
                Nouvelle recharge
              </Button></Col>
              <Col><Button onClick={() => { setRechargeModalOpen(false); setRechargeResult(null); setRechargePolling(false); }}>
                Fermer
              </Button></Col>
            </Row>
          </>
        )}
      </Modal>

      {/* Modal reçu */}
      <Modal title={<><PrinterOutlined /> Reçu de paiement</>}
        open={receiptVisible} onCancel={() => setReceiptVisible(false)}
        footer={[
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}
            style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}>Imprimer</Button>,
          <Button key="close" onClick={() => setReceiptVisible(false)}>Fermer</Button>,
        ]} width={420}>
        {receiptData && (
          <div ref={receiptRef} style={{ fontFamily: 'monospace', fontSize: 13, padding: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#1B2A4A' }}>GFS</div>
              <div style={{ fontWeight: 700 }}>Global Financial Solution</div>
              <div style={{ fontSize: 11, color: '#666' }}>Reçu de paiement de facture</div>
              <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              {[
                ['Réf', receiptData.reference],
                ['Date', dayjs(receiptData.createdAt).format('DD/MM/YYYY HH:mm')],
                ['Opérateur', receiptData.operator],
                ['N° Facture / Abonné', receiptData.billNumber],
                ['Payeur', receiptData.payerName],
                ['Téléphone', receiptData.payerPhone || '–'],
                ['Montant facture', Number(receiptData.amount).toLocaleString('fr-FR') + ' FCFA'],
                ['Frais service', Number(receiptData.fees).toLocaleString('fr-FR') + ' FCFA'],
                ['Total payé', (Number(receiptData.amount) + Number(receiptData.fees)).toLocaleString('fr-FR') + ' FCFA'],
                ['Mode paiement', receiptData.paymentMode === 'CASH' ? 'Espèces' : 'Compte GFS'],
                ['Agence', receiptData.agency?.name || '–'],
                ['Caissier', (receiptData.collectedBy?.firstName || '') + ' ' + (receiptData.collectedBy?.lastName || '')],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ color: '#666', padding: '3px 0', width: '45%' }}>{label} :</td>
                  <td style={{ fontWeight: label === 'Total payé' ? 900 : 600, color: label === 'Total payé' ? '#1B2A4A' : 'inherit' }}>{value}</td>
                </tr>
              ))}
            </table>
            <div style={{ borderTop: '1px dashed #999', margin: '12px 0', textAlign: 'center', fontSize: 11, color: '#888' }}>
              <div>Conservez ce reçu comme preuve de paiement</div>
              <div>GFS – Agréé COBAC – contact@gfs-cameroun.com</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
