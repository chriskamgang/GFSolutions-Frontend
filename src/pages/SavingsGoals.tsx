import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Button, Modal, Form,
  Input, InputNumber, Select, Space, Statistic, Popconfirm, message,
  Progress, DatePicker, Descriptions, Drawer, Empty,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, UnlockOutlined, DollarOutlined,
  TrophyOutlined, AimOutlined, FundOutlined, WalletOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;
const { Search } = Input;
const fmt = (v: number) => v.toLocaleString('fr-FR');

// ==================== PAGE OBJECTIFS D'EPARGNE ====================
export default function SavingsGoals() {
  // --- Etat principal ---
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // --- Modals ---
  const [createModal, setCreateModal] = useState(false);
  const [contributeModal, setContributeModal] = useState<any>(null);
  const [detailDrawer, setDetailDrawer] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Formulaires ---
  const [createForm] = Form.useForm();
  const [contributeForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // --- Recherche client ---
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');

  // --- Permissions ---
  const { canCreate, canUpdate, isReadOnly } = usePermissions();

  // ==================== CHARGEMENT DES DONNEES ====================
  const fetchGoals = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit };
      if (statusFilter === 'EN_COURS') params.isCompleted = false;
      if (statusFilter === 'ATTEINT') params.isCompleted = true;
      if (searchText) params.clientId = searchText;
      const { data } = await api.get('/savings-goals', { params });
      setGoals(data.data || []);
      setTotal(data.total || 0);
    } catch {
      message.error('Erreur chargement des objectifs');
    } finally {
      setLoading(false);
    }
  }, [limit, statusFilter, searchText]);

  useEffect(() => { fetchGoals(page); }, [fetchGoals, page]);

  // ==================== RECHERCHE CLIENT (pour le formulaire) ====================
  const searchClients = async (search: string) => {
    setClientSearch(search);
    if (search.length < 2) return;
    try {
      const { data } = await api.get('/clients', { params: { search, limit: 10 } });
      setClients(data.data || []);
    } catch { /* silent */ }
  };

  // ==================== CREATION OBJECTIF ====================
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      await api.post('/savings-goals', {
        clientId: values.clientId,
        name: values.name,
        targetAmount: values.targetAmount,
        targetDate: values.targetDate.format('YYYY-MM-DD'),
        description: values.description || '',
      });
      message.success('Objectif d\'epargne cree avec succes');
      setCreateModal(false);
      createForm.resetFields();
      fetchGoals(page);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== CONTRIBUTION ====================
  const handleContribute = async () => {
    try {
      const values = await contributeForm.validateFields();
      setSubmitting(true);
      await api.post(`/savings-goals/${contributeModal.id}/contribute`, {
        amount: values.amount,
        description: values.description || '',
      });
      message.success(`Contribution de ${fmt(values.amount)} FCFA effectuee`);
      setContributeModal(null);
      contributeForm.resetFields();
      fetchGoals(page);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DETAIL + PROGRESSION ====================
  const showDetail = async (record: any) => {
    setDetailLoading(true);
    setDetailDrawer({ ...record });
    try {
      const [detailRes, progressRes] = await Promise.all([
        api.get(`/savings-goals/${record.id}`),
        api.get(`/savings-goals/${record.id}/progress`),
      ]);
      setDetailDrawer({ ...detailRes.data, progress: progressRes.data });
    } catch {
      message.error('Erreur chargement du detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // ==================== DEBLOCAGE ====================
  const handleUnlock = async (id: string) => {
    try {
      await api.patch(`/savings-goals/${id}/unlock`);
      message.success('Objectif debloque avec succes');
      fetchGoals(page);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  // ==================== STATS ====================
  const totalGoals = total;
  const goalsInProgress = goals.filter(g => !g.isCompleted && !g.isUnlocked).length;
  const goalsCompleted = goals.filter(g => g.isCompleted).length;
  const totalSaved = goals.reduce((sum, g) => sum + Number(g.currentAmount || 0), 0);

  // ==================== HELPER NOM CLIENT ====================
  const getClientName = (record: any) => {
    const client = record.client;
    if (!client) return '-';
    return client.clientType === 'MORALE'
      ? client.raisonSociale
      : `${client.firstName || ''} ${client.lastName || ''}`.trim();
  };

  // ==================== HELPER STATUT ====================
  const getStatus = (record: any) => {
    if (record.isUnlocked) return { label: 'Debloque', color: 'orange' };
    if (record.isCompleted) return { label: 'Atteint', color: 'green' };
    return { label: 'En cours', color: 'blue' };
  };

  // ==================== COLONNES TABLE ====================
  const columns = [
    {
      title: 'Client',
      key: 'client',
      render: (_: any, r: any) => <Text strong>{getClientName(r)}</Text>,
    },
    {
      title: 'Nom objectif',
      dataIndex: 'name',
      render: (v: string) => <span style={{ color: '#1B2A4A', fontWeight: 500 }}>{v}</span>,
    },
    {
      title: 'Montant cible (FCFA)',
      dataIndex: 'targetAmount',
      align: 'right' as const,
      width: 150,
      render: (v: any) => <strong>{fmt(Number(v))} FCFA</strong>,
    },
    {
      title: 'Montant atteint',
      dataIndex: 'currentAmount',
      align: 'right' as const,
      width: 140,
      render: (v: any) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{fmt(Number(v))} FCFA</span>,
    },
    {
      title: 'Progression',
      key: 'progress',
      width: 160,
      render: (_: any, r: any) => {
        const percent = Number(r.targetAmount) > 0
          ? Math.min(100, Math.round((Number(r.currentAmount || 0) / Number(r.targetAmount)) * 100))
          : 0;
        return (
          <Progress
            percent={percent}
            size="small"
            strokeColor={percent >= 100 ? '#52c41a' : '#F5A623'}
            status={percent >= 100 ? 'success' : 'active'}
          />
        );
      },
    },
    {
      title: 'Date cible',
      dataIndex: 'targetDate',
      width: 110,
      render: (v: string) => v ? (
        <Tag color={dayjs(v).isBefore(dayjs()) ? 'red' : 'blue'}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Tag>
      ) : '-',
    },
    {
      title: 'Statut',
      key: 'statut',
      width: 100,
      render: (_: any, r: any) => {
        const s = getStatus(r);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, r: any) => (
        <Space size="small">
          {canCreate('CONTRIBUTIONS') && !isReadOnly && !r.isUnlocked && (
            <Button
              size="small"
              type="primary"
              icon={<DollarOutlined />}
              style={{ background: '#F5A623', borderColor: '#F5A623' }}
              onClick={() => { setContributeModal(r); contributeForm.resetFields(); }}
            >
              Contribuer
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => showDetail(r)}
          >
            Detail
          </Button>
          {canUpdate('CONTRIBUTIONS') && !isReadOnly && !r.isUnlocked && (r.isCompleted || canUpdate('CONTRIBUTIONS')) && (
            <Popconfirm
              title="Debloquer cet objectif ?"
              description="Le montant epargne sera rendu disponible."
              onConfirm={() => handleUnlock(r.id)}
              okText="Confirmer"
              cancelText="Annuler"
            >
              <Button size="small" icon={<UnlockOutlined />} danger>
                Debloquer
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // ==================== RENDU ====================
  return (
    <div>
      {/* En-tete de page */}
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <AimOutlined /> Objectifs d'Epargne
            </Title>
            <Text type="secondary">Gestion des objectifs d'epargne clients</Text>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        {/* Stats en haut */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small" style={{ borderTop: '3px solid #1B2A4A' }}>
              <Statistic
                title="Total objectifs"
                value={totalGoals}
                prefix={<FundOutlined />}
                valueStyle={{ color: '#1B2A4A' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderTop: '3px solid #1890ff' }}>
              <Statistic
                title="Objectifs en cours"
                value={goalsInProgress}
                prefix={<AimOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderTop: '3px solid #52c41a' }}>
              <Statistic
                title="Objectifs atteints"
                value={goalsCompleted}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderTop: '3px solid #F5A623' }}>
              <Statistic
                title="Montant total epargne"
                value={totalSaved}
                suffix="FCFA"
                prefix={<WalletOutlined />}
                valueStyle={{ color: '#F5A623', fontSize: 16 }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filtres */}
        <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
          <Col span={8}>
            <Search
              placeholder="Rechercher par nom de client..."
              allowClear
              onSearch={(value) => { setSearchText(value); setPage(1); }}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filtrer par statut"
              allowClear
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={(value) => { setStatusFilter(value); setPage(1); }}
              options={[
                { value: undefined, label: 'Tous' },
                { value: 'EN_COURS', label: 'En cours' },
                { value: 'ATTEINT', label: 'Atteints' },
              ]}
            />
          </Col>
          <Col span={10} style={{ textAlign: 'right' }}>
            {canCreate('CONTRIBUTIONS') && !isReadOnly && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}
                onClick={() => {
                  createForm.resetFields();
                  setCreateModal(true);
                }}
              >
                Nouvel objectif
              </Button>
            )}
          </Col>
        </Row>

        {/* Table principale */}
        <Table
          dataSource={goals}
          columns={columns}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: limit,
            showTotal: (t) => `${t} objectif(s)`,
            onChange: (p) => { setPage(p); },
          }}
        />
      </Card>

      {/* ==================== MODAL NOUVEL OBJECTIF ==================== */}
      <Modal
        title="Creer un objectif d'epargne"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Creer l'objectif"
        width={550}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="clientId"
            label="Client"
            rules={[{ required: true, message: 'Selectionnez un client' }]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={searchClients}
              placeholder="Rechercher un client par nom ou numero..."
              notFoundContent={clientSearch.length < 2 ? 'Tapez au moins 2 caracteres' : 'Aucun resultat'}
            >
              {clients.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.clientType === 'MORALE'
                    ? c.raisonSociale
                    : `${c.firstName} ${c.lastName}`} — {c.clientNumber}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Nom de l'objectif"
            rules={[{ required: true, message: 'Saisissez le nom de l\'objectif' }]}
          >
            <Input placeholder="Ex: Scolarite 2026, Mariage, Projet Immobilier" />
          </Form.Item>

          <Form.Item
            name="targetAmount"
            label="Montant cible (FCFA)"
            rules={[{ required: true, message: 'Saisissez le montant cible' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              step={5000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v!.replace(/\s/g, '') as any}
              placeholder="Ex: 500 000"
            />
          </Form.Item>

          <Form.Item
            name="targetDate"
            label="Date cible"
            rules={[{ required: true, message: 'Selectionnez la date cible' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Selectionnez une date"
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item name="description" label="Description (optionnel)">
            <Input.TextArea rows={3} placeholder="Description de l'objectif d'epargne..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==================== MODAL CONTRIBUER ==================== */}
      <Modal
        title={contributeModal ? `Contribuer — ${contributeModal.name}` : ''}
        open={!!contributeModal}
        onCancel={() => setContributeModal(null)}
        onOk={handleContribute}
        confirmLoading={submitting}
        okText="Effectuer la contribution"
      >
        {contributeModal && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Client">{getClientName(contributeModal)}</Descriptions.Item>
              <Descriptions.Item label="Objectif">{contributeModal.name}</Descriptions.Item>
              <Descriptions.Item label="Montant cible">
                <strong>{fmt(Number(contributeModal.targetAmount))} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Montant atteint">
                <span style={{ color: '#52c41a', fontWeight: 600 }}>
                  {fmt(Number(contributeModal.currentAmount || 0))} FCFA
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Restant">
                <span style={{ color: '#F5A623', fontWeight: 600 }}>
                  {fmt(Math.max(0, Number(contributeModal.targetAmount) - Number(contributeModal.currentAmount || 0)))} FCFA
                </span>
              </Descriptions.Item>
            </Descriptions>
            <Form form={contributeForm} layout="vertical">
              <Form.Item
                name="amount"
                label="Montant de la contribution (FCFA)"
                rules={[{ required: true, message: 'Saisissez le montant' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={100}
                  step={1000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={v => v!.replace(/\s/g, '') as any}
                  placeholder="Ex: 25 000"
                />
              </Form.Item>
              <Form.Item name="description" label="Description (optionnel)">
                <Input placeholder="Ex: Versement mensuel mars" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>

      {/* ==================== DRAWER DETAIL ==================== */}
      <Drawer
        title={detailDrawer ? `Objectif : ${detailDrawer.name || '...'}` : ''}
        open={!!detailDrawer}
        onClose={() => setDetailDrawer(null)}
        width={600}
        loading={detailLoading}
      >
        {detailDrawer && detailDrawer.id && (
          <>
            {/* Infos generales */}
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Client" span={2}>
                {getClientName(detailDrawer)}
              </Descriptions.Item>
              <Descriptions.Item label="Objectif" span={2}>
                <strong>{detailDrawer.name}</strong>
              </Descriptions.Item>
              {detailDrawer.description && (
                <Descriptions.Item label="Description" span={2}>
                  {detailDrawer.description}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Statut">
                {(() => { const s = getStatus(detailDrawer); return <Tag color={s.color}>{s.label}</Tag>; })()}
              </Descriptions.Item>
              <Descriptions.Item label="Date cible">
                {detailDrawer.targetDate ? (
                  <Tag color={dayjs(detailDrawer.targetDate).isBefore(dayjs()) ? 'red' : 'blue'}>
                    {dayjs(detailDrawer.targetDate).format('DD/MM/YYYY')}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Date creation">
                {detailDrawer.createdAt ? dayjs(detailDrawer.createdAt).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* Progression */}
            {detailDrawer.progress && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #1B2A4A', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Montant cible</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>
                      {fmt(Number(detailDrawer.targetAmount))} FCFA
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #52c41a', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Montant atteint</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                      {fmt(Number(detailDrawer.currentAmount || 0))} FCFA
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #F5A623', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Restant</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#F5A623' }}>
                      {fmt(Number(detailDrawer.progress.remainingAmount || 0))} FCFA
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            {/* Barre de progression */}
            <div style={{ marginBottom: 16, textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={detailDrawer.progress?.percentage || 0}
                strokeColor={{ '0%': '#F5A623', '100%': '#52c41a' }}
                size={120}
              />
              {detailDrawer.progress?.daysRemaining != null && (
                <div style={{ marginTop: 8 }}>
                  <Tag color={detailDrawer.progress.daysRemaining > 0 ? 'blue' : 'red'}>
                    {detailDrawer.progress.daysRemaining > 0
                      ? `${detailDrawer.progress.daysRemaining} jour(s) restant(s)`
                      : 'Date cible depassee'}
                  </Tag>
                </div>
              )}
            </div>

            {/* Historique des contributions */}
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A' }}>
              <DollarOutlined /> Historique des contributions
            </Text>
            {detailDrawer.contributions?.length > 0 ? (
              <Table
                dataSource={detailDrawer.contributions}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                columns={[
                  {
                    title: 'Date',
                    dataIndex: 'createdAt',
                    width: 130,
                    render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                  },
                  {
                    title: 'Montant',
                    dataIndex: 'amount',
                    align: 'right' as const,
                    render: (v: any) => (
                      <span style={{ color: '#52c41a', fontWeight: 600 }}>
                        +{fmt(Number(v))} FCFA
                      </span>
                    ),
                  },
                  {
                    title: 'Description',
                    dataIndex: 'description',
                    ellipsis: true,
                    render: (v: string) => v || '-',
                  },
                ]}
              />
            ) : (
              <Empty description="Aucune contribution" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </>
        )}
      </Drawer>
    </div>
  );
}
