import { useState, useEffect, useRef } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Modal, Form, Input, Select, InputNumber, message, Tabs,
  Statistic, DatePicker, Badge, Popconfirm, Alert,
} from 'antd';
import {
  ThunderboltOutlined, DropboxOutlined, PlayCircleOutlined,
  PhoneOutlined, BankOutlined, PlusOutlined, PrinterOutlined,
  CheckCircleOutlined, CloseCircleOutlined, DollarOutlined,
  BarChartOutlined, ReloadOutlined, FileTextOutlined,
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
  DGI: <BankOutlined style={{ color: '#8e44ad' }} />,
  SCHOOL: <FileTextOutlined style={{ color: '#2c3e50' }} />,
  OTHER: <DollarOutlined style={{ color: '#7f8c8d' }} />,
};

const OPERATOR_COLORS: Record<string, string> = {
  ENEO: 'orange', CAMWATER: 'blue', CANAL_PLUS: 'red',
  CAMTEL: 'green', DGI: 'purple', SCHOOL: 'cyan', OTHER: 'default',
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

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

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

  useEffect(() => { fetchAll(); }, [filters]);
  useEffect(() => { if (activeTab === 'reversal') fetchReversalStats(); }, [activeTab]);

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
        <Col><Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}
          style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}>
          Nouveau paiement
        </Button></Col>
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
