import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message, Modal,
  Form, Input, Select, Space, Popconfirm, Statistic, Tabs, InputNumber,
  Descriptions,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, StopOutlined, ThunderboltOutlined,
  UserOutlined, SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'gray',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  SUSPENDED: 'Suspendu',
};
const TX_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Dépôt',
  WITHDRAWAL: 'Retrait',
  TRANSFER: 'Transfert',
  FLOAT_TOPUP: 'Rechargement float',
};
const TX_TYPE_COLORS: Record<string, string> = {
  DEPOSIT: 'green',
  WITHDRAWAL: 'orange',
  TRANSFER: 'blue',
  FLOAT_TOPUP: 'purple',
};

export default function Callbox() {
  const [callboxes, setCallboxes] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [topupModal, setTopupModal] = useState(false);
  const [commModal, setCommModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [commConfigs, setCommConfigs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm();
  const [topupForm] = Form.useForm();
  const [commForm] = Form.useForm();
  const { canCreate } = usePermissions();

  const fetchCallboxes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/callbox/admin/list');
      setCallboxes(data.data || data);
    } catch { message.error('Erreur chargement callboxes'); }
    finally { setLoading(false); }
  };

  const fetchCommConfigs = async () => {
    try {
      const { data } = await api.get('/callbox/admin/commission-configs');
      setCommConfigs(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchCallboxes();
    fetchCommConfigs();
    api.get('/agencies').then(r => setAgencies(r.data)).catch(() => {});
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/callbox/admin/${id}/approve`);
      message.success('Callbox approuvé');
      fetchCallboxes();
    } catch (err: any) { message.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/callbox/admin/${id}/reject`);
      message.success('Callbox rejeté');
      fetchCallboxes();
    } catch (err: any) { message.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleSuspend = async (id: string) => {
    try {
      await api.patch(`/callbox/admin/${id}/suspend`);
      message.success('Callbox suspendu');
      fetchCallboxes();
    } catch (err: any) { message.error(err.response?.data?.message || 'Erreur'); }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      await api.post('/callbox/admin/register', values);
      message.success('Callbox créé — en attente d\'approbation');
      setCreateModal(false);
      createForm.resetFields();
      fetchCallboxes();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleTopup = async () => {
    try {
      const values = await topupForm.validateFields();
      setSubmitting(true);
      await api.post('/callbox/admin/float-topup', { ...values, callboxId: selected.id });
      message.success('Float rechargé avec succès');
      setTopupModal(false);
      topupForm.resetFields();
      fetchCallboxes();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleSaveComm = async () => {
    try {
      const values = await commForm.validateFields();
      setSubmitting(true);
      for (const type of ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']) {
        if (values[`rate_${type}`] !== undefined) {
          await api.patch(`/callbox/admin/commission-configs/${type}`, {
            rate: values[`rate_${type}`] / 100,
            callboxShareRate: values[`share_${type}`] / 100,
          });
        }
      }
      message.success('Commissions sauvegardées');
      setCommModal(false);
      fetchCommConfigs();
    } catch { message.error('Erreur'); }
    finally { setSubmitting(false); }
  };

  const openDetail = async (record: any) => {
    try {
      const { data } = await api.get(`/callbox/admin/${record.id}`);
      setSelected(data);
      setDetailModal(true);
    } catch { message.error('Erreur'); }
  };

  const pendingCount = callboxes.filter(c => c.status === 'PENDING').length;
  const approvedCount = callboxes.filter(c => c.status === 'APPROVED').length;
  const totalFloat = callboxes.reduce((s, c) => s + Number(c.float ?? 0), 0);

  const columns = [
    {
      title: 'Callbox', key: 'info', render: (_: any, r: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.businessName || r.ownerName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{r.callboxNumber} • {r.phone}</Text>
        </Space>
      ),
    },
    { title: 'Agence', dataIndex: ['agency', 'name'], render: (v: string) => v || '-' },
    { title: 'Ville', dataIndex: 'city' },
    {
      title: 'Float', dataIndex: 'float', align: 'right' as const,
      render: (v: any) => <Text strong style={{ color: '#1B2A4A' }}>{Number(v).toLocaleString()} F</Text>,
    },
    {
      title: 'Commissions', dataIndex: 'commissionsEarned', align: 'right' as const,
      render: (v: any) => <Text style={{ color: '#52c41a' }}>{Number(v).toLocaleString()} F</Text>,
    },
    {
      title: 'Statut', dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>,
    },
    {
      title: 'Dernière connexion', dataIndex: 'lastLoginAt',
      render: (d: string) => d ? dayjs(d).format('DD/MM/YY HH:mm') : 'Jamais',
    },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" onClick={() => openDetail(r)}>Détail</Button>
          {r.status === 'PENDING' && (
            <Popconfirm title="Approuver ce callbox ?" onConfirm={() => handleApprove(r.id)}>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>Approuver</Button>
            </Popconfirm>
          )}
          {r.status === 'PENDING' && (
            <Popconfirm title="Rejeter ce callbox ?" onConfirm={() => handleReject(r.id)}>
              <Button size="small" danger>Rejeter</Button>
            </Popconfirm>
          )}
          {r.status === 'APPROVED' && (
            <>
              <Button size="small" icon={<WalletOutlined />}
                onClick={() => { setSelected(r); setTopupModal(true); }}>Float</Button>
              <Popconfirm title="Suspendre ce callbox ?" onConfirm={() => handleSuspend(r.id)}>
                <Button size="small" danger icon={<StopOutlined />} />
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <ThunderboltOutlined /> Callbox
            </Title>
            <Text type="secondary">Réseau de kiosques partenaires GFS</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<SettingOutlined />} onClick={() => { setCommModal(true); }}>
                Commissions
              </Button>
              {canCreate('USERS') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModal(true)}>
                  Nouveau Callbox
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8} lg={6}>
          <Card size="small">
            <Statistic title="Total" value={callboxes.length} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={8} lg={6}>
          <Card size="small">
            <Statistic title="En attente" value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#fa8c16' : undefined }} />
          </Card>
        </Col>
        <Col xs={8} lg={6}>
          <Card size="small">
            <Statistic title="Approuvés" value={approvedCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8} lg={6}>
          <Card size="small">
            <Statistic title="Float total" value={totalFloat} suffix="FCFA"
              valueStyle={{ color: '#1B2A4A', fontSize: 16 }} />
          </Card>
        </Col>
      </Row>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Table
          dataSource={callboxes}
          columns={columns}
          loading={loading}
          rowKey="id"
          size="small"
        />
      </Card>

      {/* MODAL CRÉATION */}
      <Modal title="Nouveau Callbox" open={createModal} onCancel={() => setCreateModal(false)}
        onOk={handleCreate} confirmLoading={submitting} okText="Créer" width={560}>
        <Form form={createForm} layout="vertical">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="ownerName" label="Nom du propriétaire" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="businessName" label="Nom du kiosque">
                <Input placeholder="ex: Kiosque Marie Akwa" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Téléphone" rules={[{ required: true }]}>
                <Input placeholder="+237..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="Ville" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="agencyId" label="Agence" rules={[{ required: true }]}>
                <Select placeholder="Sélectionner">
                  {agencies.map((a: any) => (
                    <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Adresse">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="password" label="Mot de passe temporaire" rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL FLOAT TOPUP */}
      <Modal title={`Recharger float — ${selected?.businessName || selected?.ownerName}`}
        open={topupModal} onCancel={() => setTopupModal(false)}
        onOk={handleTopup} confirmLoading={submitting} okText="Recharger">
        <Form form={topupForm} layout="vertical">
          <Form.Item label="Float actuel">
            <Text strong style={{ fontSize: 16, color: '#1B2A4A' }}>
              {Number(selected?.float ?? 0).toLocaleString()} FCFA
            </Text>
          </Form.Item>
          <Form.Item name="amount" label="Montant à ajouter" rules={[{ required: true }]}>
            <InputNumber min={1000} style={{ width: '100%' }} addonAfter="FCFA"
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
          </Form.Item>
          <Form.Item name="method" label="Mode de rechargement" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="CASH_AGENCY">Dépôt cash en agence</Select.Option>
              <Select.Option value="BANK_TRANSFER">Virement bancaire</Select.Option>
              <Select.Option value="AGENT">Rechargement par agent</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL COMMISSIONS */}
      <Modal title="Configuration des commissions Callbox" open={commModal}
        onCancel={() => setCommModal(false)} onOk={handleSaveComm}
        confirmLoading={submitting} okText="Sauvegarder" width={540}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Configurez les taux de commission par type de transaction. La part callbox est un pourcentage de la commission totale.
        </Text>
        <Form form={commForm} layout="vertical">
          {['DEPOSIT', 'WITHDRAWAL', 'TRANSFER'].map(type => {
            const conf = commConfigs.find(c => c.transactionType === type);
            return (
              <Card key={type} size="small" style={{ marginBottom: 12 }}
                title={<Tag color={TX_TYPE_COLORS[type]}>{TX_TYPE_LABELS[type]}</Tag>}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name={`rate_${type}`} label="Commission totale (%)"
                      initialValue={conf ? Number(conf.rate) * 100 : 1}>
                      <InputNumber min={0} max={10} step={0.1} style={{ width: '100%' }} addonAfter="%" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={`share_${type}`} label="Part callbox (%)"
                      initialValue={conf ? Number(conf.callboxShareRate) * 100 : 30}>
                      <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Form>
      </Modal>

      {/* MODAL DÉTAIL */}
      <Modal title={`Détail — ${selected?.businessName || selected?.ownerName}`}
        open={detailModal} onCancel={() => setDetailModal(false)}
        footer={null} width={680}>
        {selected && (
          <Tabs defaultActiveKey="info">
            <TabPane tab="Informations" key="info">
              <Descriptions column={2} size="small" bordered>
                <Descriptions.Item label="N° Callbox">{selected.callboxNumber}</Descriptions.Item>
                <Descriptions.Item label="Statut">
                  <Tag color={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Propriétaire">{selected.ownerName}</Descriptions.Item>
                <Descriptions.Item label="Kiosque">{selected.businessName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Téléphone">{selected.phone}</Descriptions.Item>
                <Descriptions.Item label="Email">{selected.email}</Descriptions.Item>
                <Descriptions.Item label="Ville">{selected.city}</Descriptions.Item>
                <Descriptions.Item label="Agence">{selected.agency?.name}</Descriptions.Item>
                <Descriptions.Item label="Float">
                  <Text strong style={{ color: '#1B2A4A', fontSize: 15 }}>
                    {Number(selected.float).toLocaleString()} FCFA
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Commissions gagnées">
                  <Text strong style={{ color: '#52c41a' }}>
                    {Number(selected.commissionsEarned).toLocaleString()} FCFA
                  </Text>
                </Descriptions.Item>
              </Descriptions>
            </TabPane>
            <TabPane tab={`Transactions (${selected.transactions?.length ?? 0})`} key="tx">
              <Table
                size="small"
                dataSource={selected.transactions ?? []}
                rowKey="id"
                pagination={{ pageSize: 8 }}
                columns={[
                  { title: 'Référence', dataIndex: 'reference', width: 160 },
                  {
                    title: 'Type', dataIndex: 'type',
                    render: (v: string) => <Tag color={TX_TYPE_COLORS[v]}>{TX_TYPE_LABELS[v]}</Tag>,
                  },
                  { title: 'Client', dataIndex: 'clientName' },
                  {
                    title: 'Montant', dataIndex: 'amount', align: 'right' as const,
                    render: (v: any) => `${Number(v).toLocaleString()} F`,
                  },
                  {
                    title: 'Commission', dataIndex: 'callboxCommission', align: 'right' as const,
                    render: (v: any) => <Text style={{ color: '#52c41a' }}>{Number(v).toLocaleString()} F</Text>,
                  },
                  {
                    title: 'Date', dataIndex: 'createdAt',
                    render: (d: string) => dayjs(d).format('DD/MM/YY HH:mm'),
                  },
                ]}
              />
            </TabPane>
          </Tabs>
        )}
      </Modal>
    </div>
  );
}
