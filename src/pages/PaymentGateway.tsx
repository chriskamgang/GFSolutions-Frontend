import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Modal, Form, Input, Select, InputNumber, message, Tabs,
  Descriptions, Statistic, Badge, Tooltip, Popconfirm, Alert,
  Divider,
} from 'antd';
import {
  PlusOutlined, KeyOutlined, CheckCircleOutlined,
  StopOutlined, ReloadOutlined, EyeOutlined, EditOutlined,
  ShopOutlined, DollarOutlined, LineChartOutlined, CopyOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'green', PENDING: 'orange', SUSPENDED: 'red',
};
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Actif', PENDING: 'En attente', SUSPENDED: 'Suspendu',
};
const PAYMENT_STATUS_COLOR: Record<string, string> = {
  COMPLETED: 'green', PENDING: 'orange', FAILED: 'red', EXPIRED: 'default', CANCELLED: 'red',
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Effectue', PENDING: 'En attente', FAILED: 'Echoue',
  EXPIRED: 'Expire', CANCELLED: 'Annule',
};

export default function PaymentGateway() {
  const [stats, setStats] = useState<any>(null);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);
  const [newMerchantKeys, setNewMerchantKeys] = useState<any>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [editTarget, setEditTarget] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  const [keysOpen, setKeysOpen] = useState(false);
  const [keysData, setKeysData] = useState<any>(null);
  const [keysLoading, setKeysLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMerchant, setDetailMerchant] = useState<any>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, merchantsRes] = await Promise.all([
        api.get('/gateway/admin/stats'),
        api.get('/gateway/admin/merchants', { params: { limit: 100 } }),
      ]);
      setStats(statsRes.data);
      setMerchants(merchantsRes.data.data || []);
    } catch {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      // Pour l'admin on aggrège tous les paiements via les marchands
      const res = await api.get('/gateway/admin/merchants', { params: { limit: 100 } });
      const allMerchants: any[] = res.data.data || [];
      // Récupérer les paiements de chaque marchand (utiliser apiKey côté admin)
      // On passe par l'endpoint admin qui liste par marchandId
      const allPayments: any[] = [];
      for (const m of allMerchants.slice(0, 10)) {
        try {
          const pRes = await api.get(`/gateway/admin/merchants/${m.id}/payments`);
          (pRes.data.data || []).forEach((p: any) => allPayments.push({ ...p, merchantName: m.name }));
        } catch { /* silent */ }
      }
      setPayments(allPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch { /* silent */ }
    setPaymentsLoading(false);
  };

  const fetchAccounts = async () => {
    try {
      const [accRes, agRes] = await Promise.all([
        api.get('/accounts', { params: { limit: 200 } }),
        api.get('/agencies'),
      ]);
      setAccounts(accRes.data.data || accRes.data);
      setAgencies(agRes.data.data || agRes.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchAll();
    fetchAccounts();
  }, []);

  const getAccountLabel = (acc: any) => {
    const clientName = acc.client
      ? (acc.client.clientType === 'MORALE' ? acc.client.raisonSociale : `${acc.client.firstName} ${acc.client.lastName}`)
      : '';
    return `${acc.accountNumber} — ${clientName} (${Number(acc.balance).toLocaleString('fr-FR')} FCFA)`;
  };

  // ==================== CREATION MARCHAND ====================

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setCreateLoading(true);
      const { data } = await api.post('/gateway/admin/merchants', values);
      setNewMerchantKeys({ apiKey: data.apiKey, apiSecret: data.apiSecret, name: data.name });
      createForm.resetFields();
      setCreateOpen(false);
      fetchAll();
      message.success('Marchand cree avec succes');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      message.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur creation');
    } finally {
      setCreateLoading(false);
    }
  };

  // ==================== MODIFICATION (commission + infos) ====================

  const openEdit = (merchant: any) => {
    setEditTarget(merchant);
    editForm.setFieldsValue({
      name: merchant.name,
      phone: merchant.phone,
      website: merchant.website,
      description: merchant.description,
      webhookUrl: merchant.webhookUrl,
      returnUrl: merchant.returnUrl,
      commissionPct: Number(merchant.commissionPct),
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    try {
      const values = await editForm.validateFields();
      setEditLoading(true);
      await api.patch(`/gateway/admin/merchants/${editTarget.id}`, values);
      message.success('Marchand mis a jour');
      setEditOpen(false);
      fetchAll();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      message.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur modification');
    } finally {
      setEditLoading(false);
    }
  };

  // ==================== ACTIVER / SUSPENDRE ====================

  const handleToggleStatus = async (merchant: any) => {
    const newStatus = merchant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const endpoint = newStatus === 'ACTIVE'
      ? `/gateway/admin/merchants/${merchant.id}/activate`
      : `/gateway/admin/merchants/${merchant.id}/suspend`;
    try {
      await api.patch(endpoint);
      message.success(newStatus === 'ACTIVE' ? 'Marchand active' : 'Marchand suspendu');
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    }
  };

  // ==================== REGENERER CLES ====================

  const handleRegenerateKeys = async (merchant: any) => {
    setKeysLoading(true);
    try {
      const { data } = await api.patch(`/gateway/admin/merchants/${merchant.id}/regenerate-keys`);
      setKeysData({ ...data, name: merchant.name });
      setKeysOpen(true);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    } finally {
      setKeysLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copie`);
  };

  // ==================== COLONNES ====================

  const merchantColumns = [
    {
      title: 'Marchand', key: 'name',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ color: '#1B2A4A' }}>{r.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          {r.website && <Text type="secondary" style={{ fontSize: 11 }}>{r.website}</Text>}
        </Space>
      ),
    },
    {
      title: 'Compte GFS', key: 'account',
      render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text code style={{ fontSize: 12 }}>{r.account?.accountNumber}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {Number(r.account?.balance || 0).toLocaleString('fr-FR')} FCFA
          </Text>
        </Space>
      ),
    },
    {
      title: 'Commission',
      dataIndex: 'commissionPct',
      key: 'commissionPct',
      align: 'center' as const,
      render: (v: any) => (
        <Tag color="blue" style={{ fontWeight: 700, fontSize: 13 }}>
          {Number(v).toFixed(2)} %
        </Tag>
      ),
    },
    {
      title: 'Paiements', key: 'payments', align: 'center' as const,
      render: (_: any, r: any) => (
        <Text strong>{r._count?.payments || 0}</Text>
      ),
    },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s: string) => <Badge status={s === 'ACTIVE' ? 'success' : s === 'PENDING' ? 'warning' : 'error'} text={STATUS_LABEL[s] || s} />,
    },
    {
      title: 'Cree le', dataIndex: 'createdAt', key: 'createdAt', width: 100,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions', key: 'actions', width: 160,
      render: (_: any, r: any) => (
        <Space size={4}>
          <Tooltip title="Voir details">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setDetailMerchant(r); setDetailOpen(true); }} />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Regenerer les cles API">
            <Popconfirm
              title="Regenerer les cles API ?"
              description="Les anciennes cles seront immediatement invalidees."
              onConfirm={() => handleRegenerateKeys(r)}
              okText="Oui, regenerer"
              cancelText="Annuler"
            >
              <Button size="small" icon={<ReloadOutlined />} loading={keysLoading} />
            </Popconfirm>
          </Tooltip>
          <Tooltip title={r.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}>
            <Popconfirm
              title={r.status === 'ACTIVE' ? 'Suspendre ce marchand ?' : 'Activer ce marchand ?'}
              onConfirm={() => handleToggleStatus(r)}
              okText="Confirmer"
              cancelText="Annuler"
            >
              <Button
                size="small"
                danger={r.status === 'ACTIVE'}
                icon={r.status === 'ACTIVE' ? <StopOutlined /> : <CheckCircleOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const paymentColumns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 130, render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Ref. paiement', dataIndex: 'paymentRef', key: 'paymentRef', render: (v: string) => <Text code>{v}</Text> },
    { title: 'Marchand', dataIndex: 'merchantName', key: 'merchantName' },
    { title: 'Order ID', dataIndex: 'orderId', key: 'orderId' },
    {
      title: 'Montant', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: any) => <Text strong style={{ color: '#52c41a' }}>{Number(v).toLocaleString('fr-FR')} FCFA</Text>,
    },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s: string) => <Tag color={PAYMENT_STATUS_COLOR[s] || 'default'}>{PAYMENT_STATUS_LABEL[s] || s}</Tag>,
    },
    {
      title: 'Webhook', dataIndex: 'webhookSent', key: 'webhookSent', align: 'center' as const,
      render: (v: boolean, r: any) => v
        ? <Tag color="green">Envoye ({r.webhookStatus})</Tag>
        : <Tag color="default">Non envoye</Tag>,
    },
    { title: 'Paye le', dataIndex: 'paidAt', key: 'paidAt', render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-' },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>Payment Gateway</Title>
            <Text type="secondary">Gestion des paiements marchands en FCFA</Text>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setNewMerchantKeys(null); setCreateOpen(true); }}
              style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}>
              Nouveau marchand
            </Button>
          </Col>
        </Row>
      </div>

      {/* KPI Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Marchands actifs"
                value={stats.activeMerchants}
                suffix={`/ ${stats.totalMerchants}`}
                prefix={<ShopOutlined style={{ color: '#1B2A4A' }} />}
                valueStyle={{ color: '#1B2A4A' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Paiements effectues"
                value={stats.completedPayments}
                suffix={`/ ${stats.totalPayments}`}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Volume total (FCFA)"
                value={stats.totalVolumeXAF}
                formatter={(v: any) => Number(v).toLocaleString('fr-FR')}
                prefix={<DollarOutlined style={{ color: '#F5A623' }} />}
                valueStyle={{ color: '#F5A623' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Taux de succes"
                value={stats.totalPayments > 0 ? ((stats.completedPayments / stats.totalPayments) * 100).toFixed(1) : 0}
                suffix="%"
                prefix={<LineChartOutlined style={{ color: '#1890ff' }} />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card className="content-card">
        <Tabs
          defaultActiveKey="merchants"
          onChange={(key) => { if (key === 'payments') fetchPayments(); }}
          items={[
            {
              key: 'merchants',
              label: <Space><ShopOutlined />Marchands ({merchants.length})</Space>,
              children: (
                <Table
                  dataSource={merchants}
                  columns={merchantColumns}
                  loading={loading}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 10, showTotal: (t) => `${t} marchands` }}
                />
              ),
            },
            {
              key: 'payments',
              label: <Space><DollarOutlined />Historique des paiements</Space>,
              children: (
                <Table
                  dataSource={payments}
                  columns={paymentColumns}
                  loading={paymentsLoading}
                  rowKey="paymentRef"
                  size="small"
                  pagination={{ pageSize: 15, showTotal: (t) => `${t} paiements` }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Modal creation marchand */}
      <Modal
        title={<Space><ShopOutlined style={{ color: '#1B2A4A' }} /><span>Nouveau marchand</span></Space>}
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Creer le marchand"
        cancelText="Annuler"
        confirmLoading={createLoading}
        width={620}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nom du marchand / entreprise" rules={[{ required: true }]}>
                <Input placeholder="Ex: Boutique Mani" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="contact@boutique.cm" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Telephone">
                <Input placeholder="+237 6XX XXX XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="website" label="Site web">
                <Input placeholder="https://boutique.cm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Activite du marchand..." />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, color: '#1B2A4A' }}>Compte & Agence</Divider>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item name="accountId" label="Compte GFS recepteur" rules={[{ required: true }]}
                tooltip="Les paiements seront credites sur ce compte">
                <Select showSearch placeholder="Chercher un compte..." optionFilterProp="label"
                  options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="agencyId" label="Agence" rules={[{ required: true }]}>
                <Select placeholder="Selectionner"
                  options={agencies.map((a: any) => ({ value: a.id, label: a.name }))} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ fontSize: 13, color: '#1B2A4A' }}>Commission & Webhooks</Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="commissionPct" label="Commission GFS (%)" initialValue={0}
                tooltip="Pourcentage preleve par GFS sur chaque paiement">
                <InputNumber
                  style={{ width: '100%' }}
                  min={0} max={20} step={0.5}
                  precision={2}
                  addonAfter={<PercentageOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="webhookUrl" label="URL Webhook (notification paiement)">
                <Input placeholder="https://monsite.cm/api/gfs-callback" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="returnUrl" label="URL de retour (apres paiement)">
            <Input placeholder="https://monsite.cm/merci" />
          </Form.Item>

          <Alert
            type="info"
            showIcon
            message="Apres creation, les cles API (apiKey + apiSecret) seront affichees une seule fois. Conservez-les en lieu sur."
          />
        </Form>
      </Modal>

      {/* Modal cles API apres creation */}
      <Modal
        title={<Space><KeyOutlined style={{ color: '#F5A623' }} /><span>Cles API du marchand</span></Space>}
        open={!!newMerchantKeys}
        onCancel={() => setNewMerchantKeys(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setNewMerchantKeys(null)}>
            J'ai sauvegarde les cles
          </Button>,
        ]}
        width={580}
      >
        {newMerchantKeys && (
          <>
            <Alert
              type="warning"
              showIcon
              message="Ces cles ne seront plus affichees. Copiez-les maintenant et transmettez-les au marchand de maniere securisee."
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Marchand">{newMerchantKeys.name}</Descriptions.Item>
              <Descriptions.Item label="API Key">
                <Space>
                  <Text code style={{ fontSize: 12 }}>{newMerchantKeys.apiKey}</Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(newMerchantKeys.apiKey, 'API Key')}>Copier</Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="API Secret">
                <Space>
                  <Text code style={{ fontSize: 12, color: '#ff4d4f' }}>{newMerchantKeys.apiSecret}</Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(newMerchantKeys.apiSecret, 'API Secret')}>Copier</Button>
                </Space>
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 12 }}
              message="Le marchand utilise l'API Key dans le header X-API-Key pour authentifier ses requetes. L'API Secret sert a verifier la signature HMAC des webhooks."
            />
          </>
        )}
      </Modal>

      {/* Modal regeneration cles */}
      <Modal
        title={<Space><ReloadOutlined style={{ color: '#F5A623' }} /><span>Nouvelles cles API</span></Space>}
        open={keysOpen}
        onCancel={() => setKeysOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setKeysOpen(false)}>
            J'ai sauvegarde les cles
          </Button>,
        ]}
        width={580}
      >
        {keysData && (
          <>
            <Alert type="warning" showIcon message="Les anciennes cles ont ete invalidees. Ces nouvelles cles ne seront plus affichees." style={{ marginBottom: 16 }} />
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Marchand">{keysData.name}</Descriptions.Item>
              <Descriptions.Item label="Nouvelle API Key">
                <Space>
                  <Text code style={{ fontSize: 12 }}>{keysData.apiKey}</Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(keysData.apiKey, 'API Key')}>Copier</Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Nouveau API Secret">
                <Space>
                  <Text code style={{ fontSize: 12, color: '#ff4d4f' }}>{keysData.apiSecret}</Text>
                  <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(keysData.apiSecret, 'API Secret')}>Copier</Button>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Modal>

      {/* Modal modification (commission + infos) */}
      <Modal
        title={<Space><EditOutlined style={{ color: '#1B2A4A' }} /><span>Modifier le marchand</span></Space>}
        open={editOpen}
        onOk={handleEdit}
        onCancel={() => setEditOpen(false)}
        okText="Enregistrer"
        cancelText="Annuler"
        confirmLoading={editLoading}
        width={560}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Telephone">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="website" label="Site web">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider orientation="left" style={{ fontSize: 13, color: '#1B2A4A' }}>
            <PercentageOutlined /> Commission
          </Divider>
          <Form.Item
            name="commissionPct"
            label="Commission GFS (%)"
            tooltip="Montant en % preleve par GFS sur chaque paiement. Ex: 1.5 = 1,5% par transaction."
            rules={[{ required: true }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0} max={20} step={0.5} precision={2}
              addonAfter={<PercentageOutlined />}
            />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Exemple : pour un paiement de 10 000 FCFA avec 1,5% de commission, GFS prelevent 150 FCFA de frais.`}
          />

          <Divider orientation="left" style={{ fontSize: 13, color: '#1B2A4A' }}>Webhooks & Redirections</Divider>
          <Form.Item name="webhookUrl" label="URL Webhook">
            <Input placeholder="https://monsite.cm/api/gfs-callback" />
          </Form.Item>
          <Form.Item name="returnUrl" label="URL de retour">
            <Input placeholder="https://monsite.cm/merci" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detail marchand */}
      <Modal
        title={<Space><ShopOutlined style={{ color: '#1B2A4A' }} />{detailMerchant?.name}</Space>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[<Button key="close" onClick={() => setDetailOpen(false)}>Fermer</Button>]}
        width={600}
      >
        {detailMerchant && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Nom" span={2}>{detailMerchant.name}</Descriptions.Item>
            <Descriptions.Item label="Email">{detailMerchant.email}</Descriptions.Item>
            <Descriptions.Item label="Telephone">{detailMerchant.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Site web" span={2}>{detailMerchant.website || '-'}</Descriptions.Item>
            <Descriptions.Item label="Compte recepteur" span={2}>
              <Text code>{detailMerchant.account?.accountNumber}</Text>
              {' — '}
              <Text strong style={{ color: '#F5A623' }}>
                {Number(detailMerchant.account?.balance || 0).toLocaleString('fr-FR')} FCFA
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Agence">{detailMerchant.agency?.name}</Descriptions.Item>
            <Descriptions.Item label="Commission">
              <Tag color="blue" style={{ fontWeight: 700 }}>{Number(detailMerchant.commissionPct).toFixed(2)} %</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={STATUS_COLOR[detailMerchant.status]}>{STATUS_LABEL[detailMerchant.status]}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Nb. paiements">{detailMerchant._count?.payments || 0}</Descriptions.Item>
            <Descriptions.Item label="Webhook URL" span={2}>{detailMerchant.webhookUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="Return URL" span={2}>{detailMerchant.returnUrl || '-'}</Descriptions.Item>
            <Descriptions.Item label="API Key" span={2}>
              <Space>
                <Text code style={{ fontSize: 12 }}>{detailMerchant.apiKey}</Text>
                <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(detailMerchant.apiKey, 'API Key')}>Copier</Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Cree le" span={2}>{dayjs(detailMerchant.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
