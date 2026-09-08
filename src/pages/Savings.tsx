import { useState, useEffect } from 'react';
import {
  Card, Table, Tabs, Tag, Typography, Row, Col, Button, Modal, Form,
  Input, InputNumber, Select, Switch, Space, Statistic, Popconfirm, message,
  Alert, Descriptions, Empty, Tooltip, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, BankOutlined,
  SettingOutlined, UserOutlined, WalletOutlined, HistoryOutlined,
  ArrowUpOutlined, ArrowDownOutlined, EyeOutlined, DollarOutlined,
  CalendarOutlined, TeamOutlined, DownloadOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';

const { Title, Text } = Typography;
const fmt = (v: number) => v.toLocaleString('fr-FR');

const TYPE_OPTIONS = [
  { value: 'CURRENT', label: 'Compte Courant', color: 'blue' },
  { value: 'SAVINGS', label: 'Epargne', color: 'green' },
  { value: 'DAT', label: 'DAT (Depot a Terme)', color: 'orange' },
  { value: 'SALARY', label: 'Compte Salaire', color: 'cyan' },
  { value: 'JOINT', label: 'Compte Joint', color: 'geekblue' },
  { value: 'ASSOCIATIF', label: 'Compte Associatif / Tontine', color: 'volcano' },
  { value: 'INSTITUTIONNEL', label: 'Compte Institutionnel', color: 'gold' },
  { value: 'SCOLARITE', label: 'Compte Scolarite', color: 'magenta' },
  { value: 'COLLECTE', label: 'Collecte / Tontine', color: 'purple' },
];

const FREQ_OPTIONS = [
  { value: 'DAILY', label: 'Journalier' },
  { value: 'WEEKLY', label: 'Hebdomadaire' },
  { value: 'MONTHLY', label: 'Mensuel' },
];

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Journalier', WEEKLY: 'Hebdomadaire', MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel', YEARLY: 'Annuel',
};

// ==================== ONGLET 1 : CATALOGUE DE PRODUITS ====================
function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const { canCreate, canUpdate, isReadOnly } = usePermissions();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounts/products?all=true');
      setProducts(data || []);
    } catch { message.error('Erreur chargement produits'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'SAVINGS', interestRate: 0, minOpeningDeposit: 0, openingFees: 0, minBalance: 0, maintenanceFees: 0, lockDurationMonths: 0, earlyWithdrawalPenalty: 0, isActive: true });
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      interestRate: Number(record.interestRate),
      minOpeningDeposit: Number(record.minOpeningDeposit),
      openingFees: Number(record.openingFees),
      minBalance: Number(record.minBalance),
      maintenanceFees: Number(record.maintenanceFees),
      earlyWithdrawalPenalty: Number(record.earlyWithdrawalPenalty),
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.patch(`/accounts/products/${editing.id}`, values);
        message.success('Produit modifie');
      } else {
        await api.post('/accounts/products', values);
        message.success('Produit cree');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleToggle = async (id: string) => {
    await api.delete(`/accounts/products/${id}`);
    message.success('Statut modifie');
    fetchProducts();
  };

  const typeColor = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.color || 'default';

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 90, render: (v: string) => <strong>{v}</strong> },
    { title: 'Nom du produit', dataIndex: 'name' },
    { title: 'Type', dataIndex: 'type', width: 130,
      render: (t: string) => <Tag color={typeColor(t)}>{TYPE_OPTIONS.find(o => o.value === t)?.label || t}</Tag>,
    },
    { title: 'Taux (%)', dataIndex: 'interestRate', width: 80, align: 'center' as const,
      render: (v: any) => Number(v) > 0 ? <Tag color="green">{Number(v)}%</Tag> : '-',
    },
    { title: 'Depot min', dataIndex: 'minOpeningDeposit', width: 110, align: 'right' as const,
      render: (v: any) => `${fmt(Number(v))}`,
    },
    { title: 'Frais ouv.', dataIndex: 'openingFees', width: 90, align: 'right' as const,
      render: (v: any) => Number(v) > 0 ? fmt(Number(v)) : '-',
    },
    { title: 'Solde min', dataIndex: 'minBalance', width: 100, align: 'right' as const,
      render: (v: any) => fmt(Number(v)),
    },
    { title: 'Cotisation', key: 'cotisation', width: 130,
      render: (_: any, r: any) => r.contributionFrequency ? (
        <span>{fmt(Number(r.contributionAmount || 0))} / {FREQ_LABELS[r.contributionFrequency] || r.contributionFrequency}</span>
      ) : '-',
    },
    { title: 'Comptes', key: 'count', width: 70, align: 'center' as const,
      render: (_: any, r: any) => <Tag>{r._count?.accounts || r._count?.savingsAccounts || 0}</Tag>,
    },
    { title: 'Statut', dataIndex: 'isActive', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Actif' : 'Inactif'}</Tag>,
    },
    ...(isReadOnly ? [] : [{ title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Space>
          {canUpdate('CONTRIBUTIONS') && <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />}
          {canUpdate('CONTRIBUTIONS') && (
            <Popconfirm title={r.isActive ? 'Desactiver ce produit ?' : 'Reactiver ce produit ?'} onConfirm={() => handleToggle(r.id)}>
              <Button size="small" icon={r.isActive ? <StopOutlined /> : <CheckCircleOutlined />} danger={r.isActive} />
            </Popconfirm>
          )}
        </Space>
      ),
    }]),
  ];

  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.isActive).length;
  const totalAccounts = products.reduce((s, p) => s + (p._count?.accounts || p._count?.savingsAccounts || 0), 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="Produits actifs" value={activeProducts} suffix={`/ ${totalProducts}`} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Total comptes ouverts" value={totalAccounts} prefix={<BankOutlined />} /></Card>
        </Col>
        <Col span={12} style={{ textAlign: 'right', paddingTop: 12 }}>
          {canCreate('CONTRIBUTIONS') && !isReadOnly && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Nouveau produit</Button>
          )}
        </Col>
      </Row>

      <Table dataSource={products} columns={columns} loading={loading} rowKey="id" size="small" pagination={false} />

      <Modal
        title={editing ? `Modifier : ${editing.name}` : 'Creer un nouveau produit de compte'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText={editing ? 'Enregistrer' : 'Creer le produit'}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Code produit" rules={[{ required: true }]}>
                <Input placeholder="EP-002" disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Nom du produit" rules={[{ required: true }]}>
                <Input placeholder="Epargne Jeune, DAT 12 mois..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select options={TYPE_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Description affichee a l'agent lors de l'ouverture..." />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#1B2A4A' }}>Conditions financieres</Text>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="interestRate" label="Taux d'interet annuel (%)">
                <InputNumber min={0} max={50} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="minOpeningDeposit" label="Depot minimum ouverture">
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v!.replace(/\s/g, '') as any} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="openingFees" label="Frais d'ouverture">
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v!.replace(/\s/g, '') as any} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="minBalance" label="Solde minimum obligatoire">
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v!.replace(/\s/g, '') as any} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maintenanceFees" label="Frais de tenue de compte">
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v!.replace(/\s/g, '') as any} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maintenanceFrequency" label="Frequence tenue">
                <Select allowClear options={[
                  { value: 'MONTHLY', label: 'Mensuel' },
                  { value: 'QUARTERLY', label: 'Trimestriel' },
                  { value: 'YEARLY', label: 'Annuel' },
                ]} placeholder="Si frais > 0" />
              </Form.Item>
            </Col>
          </Row>

          <Text strong style={{ display: 'block', margin: '12px 0 8px', color: '#1B2A4A' }}>Cotisations & Tontines</Text>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contributionFrequency" label="Frequence cotisation">
                <Select allowClear options={FREQ_OPTIONS} placeholder="Aucune (libre)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contributionAmount" label="Montant cotisation (FCFA)">
                <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={v => v!.replace(/\s/g, '') as any} placeholder="Ex: 5 000" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
            {({ getFieldValue }) => getFieldValue('type') === 'DAT' && (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="lockDurationMonths" label="Duree blocage min (mois)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="earlyWithdrawalPenalty" label="Penalite retrait anticipe (%)">
                    <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </Form.Item>

          <Form.Item name="isActive" label="Produit actif" valuePropName="checked">
            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ==================== ONGLET 2 : COMPTES EPARGNE ====================
function ComptesEpargneTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [subscribeModal, setSubscribeModal] = useState(false);
  const [detailModal, setDetailModal] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { canCreate, isReadOnly } = usePermissions();

  const fetchAccounts = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get('/savings/accounts', { params: { page: p, limit: 20 } });
      setAccounts(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openSubscribe = async () => {
    form.resetFields();
    setSubscribeModal(true);
    try {
      const { data } = await api.get('/savings/products');
      setProducts((data || []).filter((p: any) => p.isActive));
    } catch { /* silent */ }
  };

  const searchClients = async (search: string) => {
    setClientSearch(search);
    if (search.length < 2) return;
    try {
      const { data } = await api.get('/clients', { params: { search, limit: 10 } });
      setClients(data.data || []);
    } catch { /* silent */ }
  };

  const handleSubscribe = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.post('/savings/accounts', {
        clientId: values.clientId,
        productId: values.productId,
        agencyId: currentUser.agencyId,
        initialDeposit: values.initialDeposit || 0,
      });
      message.success('Compte epargne ouvert avec succes');
      setSubscribeModal(false);
      fetchAccounts(page);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const showDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailModal({});
    try {
      const { data } = await api.get(`/savings/accounts/${id}`);
      setDetailModal(data);
    } catch { message.error('Erreur chargement detail'); setDetailModal(null); }
    finally { setDetailLoading(false); }
  };

  const typeColor = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.color || 'default';

  const columns = [
    { title: 'N° Compte', dataIndex: 'accountNumber', width: 160, render: (v: string) => <strong>{v}</strong> },
    { title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client ? (
        r.client.clientType === 'MORALE' ? r.client.raisonSociale : `${r.client.firstName} ${r.client.lastName}`
      ) : '-',
    },
    { title: 'Produit', key: 'product',
      render: (_: any, r: any) => r.product?.name || '-',
    },
    { title: 'Type', key: 'type', width: 130,
      render: (_: any, r: any) => <Tag color={typeColor(r.product?.type || '')}>{TYPE_OPTIONS.find(o => o.value === r.product?.type)?.label || r.product?.type || '-'}</Tag>,
    },
    { title: 'Solde (FCFA)', dataIndex: 'balance', align: 'right' as const, width: 130,
      render: (v: any) => <strong>{fmt(Number(v))}</strong>,
    },
    { title: 'Cotisation', key: 'contrib', width: 120,
      render: (_: any, r: any) => r.product?.contributionFrequency ? (
        <Tag color="purple">{FREQ_LABELS[r.product.contributionFrequency]}</Tag>
      ) : <Tag>Libre</Tag>,
    },
    { title: 'Prochaine', key: 'next', width: 110,
      render: (_: any, r: any) => {
        if (!r.nextContributionDate) return '-';
        const d = dayjs(r.nextContributionDate);
        const isLate = d.isBefore(dayjs());
        return <Tag color={isLate ? 'red' : 'blue'}>{d.format('DD/MM/YYYY')}</Tag>;
      },
    },
    { title: 'Statut', dataIndex: 'status', width: 80,
      render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : s === 'CLOSED' ? 'red' : 'orange'}>{s}</Tag>,
    },
    { title: 'Actions', key: 'actions', width: 80,
      render: (_: any, r: any) => (
        <Tooltip title="Voir detail">
          <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r.id)} />
        </Tooltip>
      ),
    },
  ];

  // KPIs
  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;

  const savingsExportCols = [
    { title: 'N° Compte', key: 'accountNumber' },
    { title: 'Client', key: 'client', format: (_: any, r: any) => r.client ? (r.client.clientType === 'MORALE' ? r.client.raisonSociale : `${r.client.firstName} ${r.client.lastName}`) : '' },
    { title: 'Produit', key: 'product', format: (_: any, r: any) => r.product?.name || '' },
    { title: 'Solde (FCFA)', key: 'balance', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Total depots', key: 'totalDeposits', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Total retraits', key: 'totalWithdrawals', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Statut', key: 'status' },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="Comptes epargne" value={total} prefix={<BankOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Comptes actifs" value={activeCount} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="Epargne totale" value={totalBalance} suffix="FCFA" valueStyle={{ color: '#1B2A4A', fontSize: 16 }} /></Card>
        </Col>
        <Col span={6} style={{ textAlign: 'right', paddingTop: 12 }}>
          <Space>
            <Button icon={<DownloadOutlined />} size="small" onClick={() => exportToExcel(accounts, savingsExportCols, 'comptes_epargne')}>Excel</Button>
            <Button icon={<FilePdfOutlined />} size="small" onClick={() => exportToPdf({
              title: 'Comptes epargne', subtitle: `${total} comptes — Epargne totale : ${fmt(totalBalance)} FCFA`,
              columns: savingsExportCols, data: accounts, filename: 'comptes_epargne', orientation: 'landscape',
            })}>PDF</Button>
            {canCreate('CONTRIBUTIONS') && !isReadOnly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openSubscribe}>
                Ouvrir un compte epargne
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Table
        dataSource={accounts}
        columns={columns}
        loading={loading}
        rowKey="id"
        size="small"
        pagination={{ current: page, total, pageSize: 20, onChange: (p) => { setPage(p); fetchAccounts(p); } }}
      />

      {/* Modal souscription */}
      <Modal
        title="Ouvrir un compte epargne"
        open={subscribeModal}
        onCancel={() => setSubscribeModal(false)}
        onOk={handleSubscribe}
        confirmLoading={submitting}
        okText="Ouvrir le compte"
        width={550}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Selectionnez un client' }]}>
            <Select
              showSearch
              filterOption={false}
              onSearch={searchClients}
              placeholder="Rechercher un client par nom ou numero..."
              notFoundContent={clientSearch.length < 2 ? 'Tapez au moins 2 caracteres' : 'Aucun resultat'}
            >
              {clients.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  <UserOutlined /> {c.clientType === 'MORALE' ? c.raisonSociale : `${c.firstName} ${c.lastName}`} — {c.clientNumber}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="productId" label="Produit d'epargne" rules={[{ required: true, message: 'Selectionnez un produit' }]}>
            <Select placeholder="Choisir un produit">
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>
                  <Tag color={typeColor(p.type)} style={{ marginRight: 8 }}>{p.type}</Tag>
                  {p.name} — Taux {Number(p.interestRate)}%
                  {p.contributionFrequency && ` — Cotisation ${FREQ_LABELS[p.contributionFrequency]}`}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="initialDeposit" label="Depot initial (FCFA, optionnel)">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v!.replace(/\s/g, '') as any}
              placeholder="Ex: 10 000"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detail compte */}
      <Modal
        title={detailModal ? `Compte ${detailModal.accountNumber || '...'}` : ''}
        open={!!detailModal}
        onCancel={() => setDetailModal(null)}
        footer={<Button onClick={() => setDetailModal(null)}>Fermer</Button>}
        width={700}
        loading={detailLoading}
      >
        {detailModal && detailModal.id && (
          <>
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Client">
                {detailModal.client?.clientType === 'MORALE'
                  ? detailModal.client.raisonSociale
                  : `${detailModal.client?.firstName} ${detailModal.client?.lastName}`}
              </Descriptions.Item>
              <Descriptions.Item label="Produit">{detailModal.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Agence">{detailModal.agency?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={detailModal.status === 'ACTIVE' ? 'green' : 'red'}>{detailModal.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ouverture">{dayjs(detailModal.openedAt).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Taux interet">{Number(detailModal.product?.interestRate)}% / an</Descriptions.Item>
              {detailModal.maturityDate && (
                <Descriptions.Item label="Echeance" span={2}>
                  <Tag color={dayjs(detailModal.maturityDate).isBefore(dayjs()) ? 'green' : 'orange'}>
                    {dayjs(detailModal.maturityDate).format('DD/MM/YYYY')}
                  </Tag>
                </Descriptions.Item>
              )}
              {detailModal.product?.contributionFrequency && (
                <>
                  <Descriptions.Item label="Frequence cotisation">
                    <Tag color="purple">{FREQ_LABELS[detailModal.product.contributionFrequency]}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Prochaine cotisation">
                    {detailModal.nextContributionDate ? (
                      <Tag color={dayjs(detailModal.nextContributionDate).isBefore(dayjs()) ? 'red' : 'blue'}>
                        {dayjs(detailModal.nextContributionDate).format('DD/MM/YYYY')}
                      </Tag>
                    ) : '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ borderTop: '3px solid #1B2A4A', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Solde actuel</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#1B2A4A' }}>{fmt(Number(detailModal.balance))} FCFA</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ borderTop: '3px solid #52c41a', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Total depots</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#52c41a' }}>+{fmt(Number(detailModal.totalDeposits))}</div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ borderTop: '3px solid #ff4d4f', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>Total retraits</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4d4f' }}>-{fmt(Number(detailModal.totalWithdrawals))}</div>
                </Card>
              </Col>
            </Row>

            {/* Historique des mouvements */}
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A' }}>
              <HistoryOutlined /> Derniers mouvements
            </Text>
            {detailModal.contributions?.length > 0 ? (
              <Table
                dataSource={detailModal.contributions}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  { title: 'Date', dataIndex: 'createdAt', width: 130,
                    render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                  },
                  { title: 'Type', dataIndex: 'type', width: 100,
                    render: (t: string) => (
                      <Tag color={t === 'DEPOSIT' ? 'green' : t === 'WITHDRAWAL' ? 'red' : 'blue'}>
                        {t === 'DEPOSIT' ? 'Depot' : t === 'WITHDRAWAL' ? 'Retrait' : 'Interet'}
                      </Tag>
                    ),
                  },
                  { title: 'Montant', dataIndex: 'amount', align: 'right' as const,
                    render: (v: any, r: any) => (
                      <span style={{ color: r.type === 'DEPOSIT' ? '#52c41a' : r.type === 'WITHDRAWAL' ? '#ff4d4f' : '#1890ff', fontWeight: 600 }}>
                        {r.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(Number(v))}
                      </span>
                    ),
                  },
                  { title: 'Solde apres', dataIndex: 'balanceAfter', align: 'right' as const,
                    render: (v: any) => `${fmt(Number(v))} FCFA`,
                  },
                  { title: 'Description', dataIndex: 'description', ellipsis: true },
                ]}
              />
            ) : (
              <Empty description="Aucun mouvement" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// ==================== ONGLET 3 : COTISATIONS & OPERATIONS ====================
function CotisationsTab() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [depositModal, setDepositModal] = useState<any>(null);
  const [withdrawModal, setWithdrawModal] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { canCreate, isReadOnly } = usePermissions();

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/savings/accounts', { params: { status: 'ACTIVE', limit: 100 } });
      setAccounts(data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const handleDeposit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post('/savings/deposit', {
        savingsAccountId: depositModal.id,
        amount: values.amount,
      });
      message.success(`Depot de ${fmt(values.amount)} FCFA effectue`);
      setDepositModal(null);
      form.resetFields();
      fetchAccounts();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleWithdraw = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post('/savings/withdrawal', {
        savingsAccountId: withdrawModal.id,
        amount: values.amount,
      });
      message.success(`Retrait de ${fmt(values.amount)} FCFA effectue`);
      setWithdrawModal(null);
      form.resetFields();
      fetchAccounts();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  // Separer les comptes par type
  const collecteAccounts = accounts.filter(a => a.product?.contributionFrequency);
  const libreAccounts = accounts.filter(a => !a.product?.contributionFrequency);

  const renderAccountCard = (acc: any) => {
    const isLate = acc.nextContributionDate && dayjs(acc.nextContributionDate).isBefore(dayjs());
    const clientName = acc.client?.clientType === 'MORALE'
      ? acc.client.raisonSociale
      : `${acc.client?.firstName} ${acc.client?.lastName}`;

    return (
      <Col xs={24} sm={12} lg={8} key={acc.id}>
        <Card
          size="small"
          style={{
            borderRadius: 8,
            borderLeft: `4px solid ${isLate ? '#ff4d4f' : acc.product?.contributionFrequency ? '#722ed1' : '#52c41a'}`,
          }}
          actions={canCreate('CONTRIBUTIONS') && !isReadOnly ? [
            <Tooltip title="Depot / Cotisation" key="dep">
              <Button type="link" icon={<ArrowUpOutlined />} style={{ color: '#52c41a' }}
                onClick={() => { setDepositModal(acc); form.resetFields(); }}>
                Depot
              </Button>
            </Tooltip>,
            <Tooltip title="Retrait" key="ret">
              <Button type="link" icon={<ArrowDownOutlined />} style={{ color: '#ff4d4f' }}
                onClick={() => { setWithdrawModal(acc); form.resetFields(); }}>
                Retrait
              </Button>
            </Tooltip>,
          ] : undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13 }}>{clientName}</Text>
            {isLate && <Badge status="error" text="En retard" />}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            {acc.accountNumber} — {acc.product?.name}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1B2A4A', marginBottom: 8 }}>
            {fmt(Number(acc.balance))} FCFA
          </div>
          <Row>
            {acc.product?.contributionFrequency && (
              <Col span={12}>
                <div style={{ fontSize: 11, color: '#888' }}>Cotisation</div>
                <Tag color="purple">{fmt(Number(acc.product.contributionAmount || 0))} / {FREQ_LABELS[acc.product.contributionFrequency]}</Tag>
              </Col>
            )}
            {acc.nextContributionDate && (
              <Col span={12}>
                <div style={{ fontSize: 11, color: '#888' }}>Prochaine</div>
                <Tag color={isLate ? 'red' : 'blue'}>{dayjs(acc.nextContributionDate).format('DD/MM/YY')}</Tag>
              </Col>
            )}
            {!acc.product?.contributionFrequency && (
              <>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#888' }}>Depots</div>
                  <span style={{ color: '#52c41a', fontWeight: 600 }}>+{fmt(Number(acc.totalDeposits))}</span>
                </Col>
                <Col span={12}>
                  <div style={{ fontSize: 11, color: '#888' }}>Retraits</div>
                  <span style={{ color: '#ff4d4f', fontWeight: 600 }}>-{fmt(Number(acc.totalWithdrawals))}</span>
                </Col>
              </>
            )}
          </Row>
        </Card>
      </Col>
    );
  };

  // KPIs
  const totalEpargne = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const enRetard = collecteAccounts.filter(a => a.nextContributionDate && dayjs(a.nextContributionDate).isBefore(dayjs())).length;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Comptes actifs" value={accounts.length} prefix={<WalletOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Avec cotisation" value={collecteAccounts.length} prefix={<CalendarOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="En retard" value={enRetard} prefix={<TeamOutlined />} valueStyle={{ color: enRetard > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Epargne totale" value={totalEpargne} suffix="FCFA" prefix={<DollarOutlined />} valueStyle={{ color: '#1B2A4A', fontSize: 14 }} />
          </Card>
        </Col>
      </Row>

      {/* Comptes avec cotisation programmee */}
      {collecteAccounts.length > 0 && (
        <>
          <Alert
            type="info"
            showIcon
            icon={<CalendarOutlined />}
            message={`${collecteAccounts.length} compte(s) avec cotisation programmee${enRetard > 0 ? ` — ${enRetard} en retard de paiement` : ''}`}
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {collecteAccounts.map(renderAccountCard)}
          </Row>
        </>
      )}

      {/* Comptes epargne libre */}
      {libreAccounts.length > 0 && (
        <>
          <Text strong style={{ display: 'block', marginBottom: 12, color: '#1B2A4A', fontSize: 14 }}>
            <WalletOutlined /> Epargne libre ({libreAccounts.length})
          </Text>
          <Row gutter={[16, 16]}>
            {libreAccounts.map(renderAccountCard)}
          </Row>
        </>
      )}

      {accounts.length === 0 && !loading && (
        <Empty description="Aucun compte epargne actif" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}

      {/* Modal depot / cotisation */}
      <Modal
        title={depositModal ? `Depot — ${depositModal.client?.firstName || depositModal.client?.raisonSociale || ''} ${depositModal.client?.lastName || ''}` : ''}
        open={!!depositModal}
        onCancel={() => setDepositModal(null)}
        onOk={handleDeposit}
        confirmLoading={submitting}
        okText="Effectuer le depot"
      >
        {depositModal && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Compte">{depositModal.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="Produit">{depositModal.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Solde actuel">
                <strong>{fmt(Number(depositModal.balance))} FCFA</strong>
              </Descriptions.Item>
              {depositModal.product?.contributionAmount && (
                <Descriptions.Item label="Montant cotisation attendu">
                  <Tag color="purple">{fmt(Number(depositModal.product.contributionAmount))} FCFA</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Form form={form} layout="vertical">
              <Form.Item
                name="amount"
                label="Montant du depot (FCFA)"
                rules={[{ required: true, message: 'Saisissez le montant' }]}
                initialValue={depositModal.product?.contributionAmount ? Number(depositModal.product.contributionAmount) : undefined}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  step={1000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={v => v!.replace(/\s/g, '') as any}
                  placeholder="Ex: 5 000"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* Modal retrait */}
      <Modal
        title={withdrawModal ? `Retrait — ${withdrawModal.client?.firstName || withdrawModal.client?.raisonSociale || ''} ${withdrawModal.client?.lastName || ''}` : ''}
        open={!!withdrawModal}
        onCancel={() => setWithdrawModal(null)}
        onOk={handleWithdraw}
        confirmLoading={submitting}
        okText="Effectuer le retrait"
        okButtonProps={{ danger: true }}
      >
        {withdrawModal && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Compte">{withdrawModal.accountNumber}</Descriptions.Item>
              <Descriptions.Item label="Produit">{withdrawModal.product?.name}</Descriptions.Item>
              <Descriptions.Item label="Solde actuel">
                <strong>{fmt(Number(withdrawModal.balance))} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Solde minimum">
                {fmt(Number(withdrawModal.product?.minBalance || 0))} FCFA
              </Descriptions.Item>
              {withdrawModal.maturityDate && dayjs(withdrawModal.maturityDate).isAfter(dayjs()) && (
                <Descriptions.Item label="Epargne bloquee">
                  <Tag color="red">Bloquee jusqu'au {dayjs(withdrawModal.maturityDate).format('DD/MM/YYYY')}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
            <Form form={form} layout="vertical">
              <Form.Item
                name="amount"
                label="Montant du retrait (FCFA)"
                rules={[{ required: true, message: 'Saisissez le montant' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={1}
                  max={Number(withdrawModal.balance) - Number(withdrawModal.product?.minBalance || 0)}
                  step={1000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={v => v!.replace(/\s/g, '') as any}
                  placeholder="Ex: 10 000"
                />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

// ==================== PAGE PRINCIPALE ====================
export default function Savings() {
  const items = [
    {
      key: 'cotisations',
      label: <span><DollarOutlined /> Cotisations & Operations</span>,
      children: <CotisationsTab />,
    },
    {
      key: 'comptes',
      label: <span><BankOutlined /> Comptes Epargne</span>,
      children: <ComptesEpargneTab />,
    },
    {
      key: 'products',
      label: <span><SettingOutlined /> Catalogue de produits</span>,
      children: <ProductsTab />,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <WalletOutlined /> Epargne, Cotisations & Tontines
            </Title>
            <Text type="secondary">Produits d'epargne, comptes, cotisations et operations</Text>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        <Tabs items={items} defaultActiveKey="cotisations" />
      </Card>
    </div>
  );
}
