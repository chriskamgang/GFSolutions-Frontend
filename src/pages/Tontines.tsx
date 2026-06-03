import { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, Button, Modal, Drawer, Form,
  Input, InputNumber, Select, Space, Statistic, Popconfirm, message,
  Descriptions, Collapse,
} from 'antd';
import {
  PlusOutlined, TeamOutlined, EyeOutlined, DeleteOutlined,
  UserAddOutlined, DollarOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UsergroupAddOutlined, CalendarOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;
const fmt = (v: number) => v.toLocaleString('fr-FR');

const FREQ_OPTIONS = [
  { value: 'DAILY', label: 'Journalier', color: 'cyan' },
  { value: 'WEEKLY', label: 'Hebdomadaire', color: 'orange' },
  { value: 'MONTHLY', label: 'Mensuel', color: 'purple' },
];

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Journalier', WEEKLY: 'Hebdomadaire', MONTHLY: 'Mensuel',
};
const FREQ_COLORS: Record<string, string> = {
  DAILY: 'cyan', WEEKLY: 'orange', MONTHLY: 'purple',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'green', COMPLETED: 'blue', CANCELLED: 'red',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif', COMPLETED: 'Termine', CANCELLED: 'Annule',
};

export default function Tontines() {
  // ==================== STATE : LISTE ====================
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // ==================== STATE : CREATION ====================
  const [createModal, setCreateModal] = useState(false);
  const [createForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // ==================== STATE : DETAIL (DRAWER) ====================
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ==================== STATE : AJOUTER MEMBRE ====================
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [addMemberForm] = Form.useForm();

  // ==================== STATE : PAIEMENT ====================
  const [paymentModal, setPaymentModal] = useState<any>(null); // { roundId }
  const [paymentForm] = Form.useForm();

  // ==================== STATE : STATUT TOUR ====================
  const [roundStatuses, setRoundStatuses] = useState<Record<string, any>>({});

  const { canCreate, canUpdate, canDelete, isReadOnly } = usePermissions();

  // ==================== FETCH LISTE ====================
  const fetchGroups = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.agencyId) params.agencyId = currentUser.agencyId;
      const { data } = await api.get('/tontines', { params });
      setGroups(data.data || []);
      setTotal(data.total || 0);
    } catch {
      message.error('Erreur chargement des groupes tontine');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchGroups(1); setPage(1); }, [fetchGroups]);

  // ==================== CREATION GROUPE ====================
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      setSubmitting(true);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await api.post('/tontines', {
        ...values,
        agencyId: currentUser.agencyId,
      });
      message.success('Groupe tontine cree avec succes');
      setCreateModal(false);
      createForm.resetFields();
      fetchGroups(page);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DETAIL GROUPE ====================
  const openDetail = async (id: string) => {
    setDrawerOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setRoundStatuses({});
    try {
      const { data } = await api.get(`/tontines/${id}`);
      setDetail(data);
    } catch {
      message.error('Erreur chargement du detail');
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail?.id) return;
    try {
      const { data } = await api.get(`/tontines/${detail.id}`);
      setDetail(data);
    } catch { /* silent */ }
  };

  // ==================== AJOUTER MEMBRE ====================
  const handleAddMember = async () => {
    try {
      const values = await addMemberForm.validateFields();
      setSubmitting(true);
      await api.post(`/tontines/${detail.id}/members`, { clientId: values.clientId });
      message.success('Membre ajoute avec succes');
      setAddMemberModal(false);
      addMemberForm.resetFields();
      refreshDetail();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== RETIRER MEMBRE ====================
  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.delete(`/tontines/${detail.id}/members/${memberId}`);
      message.success('Membre retire');
      refreshDetail();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  // ==================== ENREGISTRER PAIEMENT ====================
  const handlePayment = async () => {
    try {
      const values = await paymentForm.validateFields();
      setSubmitting(true);
      await api.post(`/tontines/${detail.id}/rounds/${paymentModal.roundId}/payment`, {
        memberId: values.memberId,
        amount: values.amount,
      });
      message.success('Paiement enregistre');
      setPaymentModal(null);
      paymentForm.resetFields();
      refreshDetail();
      // Rafraichir le statut du tour
      fetchRoundStatus(paymentModal.roundId);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== DECAISSER ====================
  const handleDisburse = async (roundId: string) => {
    try {
      await api.post(`/tontines/${detail.id}/rounds/${roundId}/disburse`);
      message.success('Decaissement effectue');
      refreshDetail();
      fetchRoundStatus(roundId);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  // ==================== STATUT TOUR ====================
  const fetchRoundStatus = async (roundId: string) => {
    try {
      const { data } = await api.get(`/tontines/${detail.id}/rounds/${roundId}/status`);
      setRoundStatuses(prev => ({ ...prev, [roundId]: data }));
    } catch { /* silent */ }
  };

  // ==================== STATS ====================
  const totalGroups = total;
  const activeGroups = groups.filter(g => g.status === 'ACTIVE').length;
  const totalMembers = groups.reduce((s, g) => s + (g.membersCount || g._count?.members || 0), 0);

  // ==================== TABLE COLUMNS ====================
  const columns = [
    {
      title: 'Nom du groupe', dataIndex: 'name', ellipsis: true,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: 'Frequence', dataIndex: 'frequency', width: 120,
      render: (f: string) => <Tag color={FREQ_COLORS[f] || 'default'}>{FREQ_LABELS[f] || f}</Tag>,
    },
    {
      title: 'Cotisation (FCFA)', dataIndex: 'contributionAmount', width: 140, align: 'right' as const,
      render: (v: any) => <strong>{fmt(Number(v))} FCFA</strong>,
    },
    {
      title: 'Tour actuel', key: 'currentRound', width: 100, align: 'center' as const,
      render: (_: any, r: any) => {
        const round = r.currentRound || r.currentRoundNumber || '-';
        return <Tag color="blue">{round}</Tag>;
      },
    },
    {
      title: 'Membres', key: 'members', width: 90, align: 'center' as const,
      render: (_: any, r: any) => {
        const count = r.membersCount || r._count?.members || 0;
        const max = r.maxMembers || '-';
        return <span>{count} / {max}</span>;
      },
    },
    {
      title: 'Statut', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 90,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(r.id)}>
          Detail
        </Button>
      ),
    },
  ];

  // ==================== COLONNES MEMBRES (DRAWER) ====================
  const memberColumns = [
    {
      title: 'Client', key: 'client',
      render: (_: any, r: any) => {
        const c = r.client || r;
        return c.firstName ? `${c.firstName} ${c.lastName}` : c.raisonSociale || c.clientId || '-';
      },
    },
    {
      title: 'Total paye (FCFA)', key: 'totalPaid', width: 140, align: 'right' as const,
      render: (_: any, r: any) => fmt(Number(r.totalPaid || 0)),
    },
    {
      title: 'Statut', key: 'status', width: 90,
      render: (_: any, r: any) => (
        <Tag color={r.status === 'INACTIVE' ? 'default' : 'green'}>
          {r.status === 'INACTIVE' ? 'Inactif' : 'Actif'}
        </Tag>
      ),
    },
    ...(!isReadOnly && canDelete('CONTRIBUTIONS') ? [{
      title: '', key: 'actions', width: 60,
      render: (_: any, r: any) => (
        <Popconfirm title="Retirer ce membre du groupe ?" onConfirm={() => handleRemoveMember(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    }] : []),
  ];

  // ==================== RENDER TOURS (COLLAPSE) ====================
  const renderRounds = () => {
    if (!detail?.rounds || detail.rounds.length === 0) {
      return <Text type="secondary">Aucun tour enregistre.</Text>;
    }

    const roundItems = detail.rounds.map((round: any) => {
      const status = roundStatuses[round.id];
      const beneficiary = round.beneficiary
        ? (round.beneficiary.firstName
          ? `${round.beneficiary.firstName} ${round.beneficiary.lastName}`
          : round.beneficiary.raisonSociale || '-')
        : round.beneficiaryName || '-';

      return {
        key: round.id,
        label: (
          <Space>
            <span>Tour #{round.number || round.roundNumber || '?'}</span>
            <Tag color={round.status === 'COMPLETED' ? 'green' : 'orange'}>
              {round.status === 'COMPLETED' ? 'Termine' : 'En cours'}
            </Tag>
            <Text type="secondary">Beneficiaire : {beneficiary}</Text>
          </Space>
        ),
        children: (
          <div>
            {/* Paiements du tour */}
            {(round.payments && round.payments.length > 0) || status?.payments ? (
              <Table
                dataSource={status?.payments || round.payments || []}
                rowKey="id"
                size="small"
                pagination={false}
                columns={[
                  {
                    title: 'Membre', key: 'member',
                    render: (_: any, p: any) => {
                      const m = p.member || p;
                      return m.firstName ? `${m.firstName} ${m.lastName}` : m.memberName || '-';
                    },
                  },
                  {
                    title: 'Montant (FCFA)', dataIndex: 'amount', width: 130, align: 'right' as const,
                    render: (v: any) => v ? `${fmt(Number(v))} FCFA` : '-',
                  },
                  {
                    title: 'Paye', key: 'paid', width: 80, align: 'center' as const,
                    render: (_: any, p: any) => (
                      <Tag color={p.paid || p.status === 'PAID' ? 'green' : 'default'}>
                        {p.paid || p.status === 'PAID' ? 'Oui' : 'Non'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Date', key: 'date', width: 120,
                    render: (_: any, p: any) => p.paidAt || p.createdAt
                      ? dayjs(p.paidAt || p.createdAt).format('DD/MM/YYYY')
                      : '-',
                  },
                ]}
              />
            ) : (
              <Text type="secondary">Aucun paiement enregistre pour ce tour.</Text>
            )}

            {/* Boutons actions du tour */}
            {!isReadOnly && detail.status === 'ACTIVE' && (
              <Space style={{ marginTop: 12 }}>
                {canUpdate('CONTRIBUTIONS') && (
                  <Button
                    size="small"
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => {
                      setPaymentModal({ roundId: round.id });
                      paymentForm.resetFields();
                    }}
                  >
                    Enregistrer paiement
                  </Button>
                )}
                {canUpdate('CONTRIBUTIONS') && (
                  <Popconfirm
                    title="Confirmer le decaissement au beneficiaire ?"
                    onConfirm={() => handleDisburse(round.id)}
                  >
                    <Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#F5A623', borderColor: '#F5A623' }}>
                      Decaisser
                    </Button>
                  </Popconfirm>
                )}
                <Button
                  size="small"
                  icon={<ClockCircleOutlined />}
                  onClick={() => fetchRoundStatus(round.id)}
                >
                  Rafraichir statut
                </Button>
              </Space>
            )}
          </div>
        ),
      };
    });

    return <Collapse items={roundItems} accordion />;
  };

  // ==================== RENDER ====================
  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <UsergroupAddOutlined /> Tontines
            </Title>
            <Text type="secondary">Gestion des groupes de tontine numerique</Text>
          </Col>
          <Col>
            {canCreate('CONTRIBUTIONS') && !isReadOnly && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => { setCreateModal(true); createForm.resetFields(); }}
                style={{ backgroundColor: '#F5A623', borderColor: '#F5A623' }}
              >
                Nouveau groupe
              </Button>
            )}
          </Col>
        </Row>
      </div>

      {/* Stats en haut */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Total groupes" value={totalGroups} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Groupes actifs"
              value={activeGroups}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Total membres"
              value={totalMembers}
              prefix={<UsergroupAddOutlined />}
              valueStyle={{ color: '#1B2A4A' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filtre statut */}
      <Card className="content-card">
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Text strong style={{ color: '#1B2A4A' }}>Filtre :</Text>
              <Select
                allowClear
                placeholder="Tous les statuts"
                style={{ width: 180 }}
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                options={[
                  { value: 'ACTIVE', label: 'Actif' },
                  { value: 'COMPLETED', label: 'Termine' },
                  { value: 'CANCELLED', label: 'Annule' },
                ]}
              />
            </Space>
          </Col>
        </Row>

        {/* Table des groupes */}
        <Table
          dataSource={groups}
          columns={columns}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            onChange: (p) => { setPage(p); fetchGroups(p); },
            showTotal: (t) => `${t} groupe(s)`,
          }}
        />
      </Card>

      {/* ==================== MODAL CREATION ==================== */}
      <Modal
        title="Creer un nouveau groupe tontine"
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Creer le groupe"
        width={550}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="Nom du groupe" rules={[{ required: true, message: 'Le nom est requis' }]}>
            <Input placeholder="Ex: Tontine Femmes de Douala" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Description du groupe..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contributionAmount"
                label="Montant cotisation (FCFA)"
                rules={[{ required: true, message: 'Le montant est requis' }]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={100}
                  step={1000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                  parser={v => v!.replace(/\s/g, '') as any}
                  placeholder="Ex: 10 000"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="frequency"
                label="Frequence"
                rules={[{ required: true, message: 'La frequence est requise' }]}
              >
                <Select options={FREQ_OPTIONS} placeholder="Choisir" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="maxMembers"
            label="Nombre max de membres"
            rules={[{ required: true, message: 'Le nombre max est requis' }]}
          >
            <InputNumber style={{ width: '100%' }} min={2} max={100} placeholder="Ex: 12" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==================== DRAWER DETAIL ==================== */}
      <Drawer
        title={detail ? `Tontine : ${detail.name}` : 'Detail du groupe'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDetail(null); }}
        width={700}
        loading={detailLoading}
      >
        {detail && (
          <>
            {/* Infos du groupe */}
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Nom">{detail.name}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={STATUS_COLORS[detail.status] || 'default'}>
                  {STATUS_LABELS[detail.status] || detail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Frequence">
                <Tag color={FREQ_COLORS[detail.frequency] || 'default'}>
                  {FREQ_LABELS[detail.frequency] || detail.frequency}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Cotisation">
                <strong>{fmt(Number(detail.contributionAmount))} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Membres">
                {detail.members?.length || 0} / {detail.maxMembers || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tours">
                {detail.rounds?.length || 0}
              </Descriptions.Item>
              {detail.description && (
                <Descriptions.Item label="Description" span={2}>
                  {detail.description}
                </Descriptions.Item>
              )}
              {detail.createdAt && (
                <Descriptions.Item label="Cree le" span={2}>
                  {dayjs(detail.createdAt).format('DD/MM/YYYY HH:mm')}
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Section Membres */}
            <div style={{ marginBottom: 24 }}>
              <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                <Col>
                  <Text strong style={{ fontSize: 15, color: '#1B2A4A' }}>
                    <TeamOutlined /> Membres ({detail.members?.length || 0})
                  </Text>
                </Col>
                <Col>
                  {!isReadOnly && canUpdate('CONTRIBUTIONS') && detail.status === 'ACTIVE' && (
                    <Button
                      size="small"
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => { setAddMemberModal(true); addMemberForm.resetFields(); }}
                    >
                      Ajouter un membre
                    </Button>
                  )}
                </Col>
              </Row>
              <Table
                dataSource={detail.members || []}
                columns={memberColumns}
                rowKey="id"
                size="small"
                pagination={false}
              />
            </div>

            {/* Section Tours */}
            <div>
              <Text strong style={{ fontSize: 15, color: '#1B2A4A', display: 'block', marginBottom: 12 }}>
                <CalendarOutlined /> Tours ({detail.rounds?.length || 0})
              </Text>
              {renderRounds()}
            </div>
          </>
        )}
      </Drawer>

      {/* ==================== MODAL AJOUTER MEMBRE ==================== */}
      <Modal
        title="Ajouter un membre au groupe"
        open={addMemberModal}
        onCancel={() => setAddMemberModal(false)}
        onOk={handleAddMember}
        confirmLoading={submitting}
        okText="Ajouter"
      >
        <Form form={addMemberForm} layout="vertical">
          <Form.Item
            name="clientId"
            label="ID du client"
            rules={[{ required: true, message: 'Saisissez l\'ID du client' }]}
          >
            <Input placeholder="Entrez l'identifiant du client" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ==================== MODAL PAIEMENT ==================== */}
      <Modal
        title="Enregistrer un paiement"
        open={!!paymentModal}
        onCancel={() => { setPaymentModal(null); paymentForm.resetFields(); }}
        onOk={handlePayment}
        confirmLoading={submitting}
        okText="Enregistrer"
      >
        <Form form={paymentForm} layout="vertical">
          <Form.Item
            name="memberId"
            label="Membre"
            rules={[{ required: true, message: 'Selectionnez un membre' }]}
          >
            <Select placeholder="Choisir un membre">
              {(detail?.members || []).map((m: any) => {
                const name = m.client
                  ? (m.client.firstName ? `${m.client.firstName} ${m.client.lastName}` : m.client.raisonSociale)
                  : m.firstName ? `${m.firstName} ${m.lastName}` : m.clientId || m.id;
                return (
                  <Select.Option key={m.id} value={m.id}>
                    {name}
                  </Select.Option>
                );
              })}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="Montant (FCFA)"
            rules={[{ required: true, message: 'Saisissez le montant' }]}
            initialValue={detail?.contributionAmount ? Number(detail.contributionAmount) : undefined}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              step={1000}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v!.replace(/\s/g, '') as any}
              placeholder="Montant du paiement"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
