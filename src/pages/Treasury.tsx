import { useState, useEffect } from 'react';
import {
  Card, Typography, Row, Col, Tabs, Tag, Alert, Statistic, Table, message,
  Button, Modal, Form, InputNumber, Input, Space, Descriptions,
} from 'antd';
import {
  BankOutlined, WalletOutlined, SafetyOutlined,
  ShopOutlined, TeamOutlined, DollarOutlined,
  PlayCircleOutlined, StopOutlined, HistoryOutlined,
} from '@ant-design/icons';
import { Column, Line } from '@ant-design/charts';
import api from '../services/api';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;

export default function Treasury() {
  const [position, setPosition] = useState<any>(null);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [trend30, setTrend30] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [posRes, agRes, trendRes] = await Promise.all([
          api.get('/treasury/position'),
          api.get('/treasury/by-agency'),
          api.get('/treasury/trend').catch(() => ({ data: [] })),
        ]);
        setPosition(posRes.data);
        setAgencies(agRes.data);
        setTrend30(trendRes.data || []);
      } catch {
        message.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  // ==================== VUE D'ENSEMBLE ====================
  function VueEnsemble() {
    if (!position) return null;
    return (
      <div>
        {/* Totaux */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} md={12}>
            <div style={{
              background: 'linear-gradient(135deg, #1B2A4A 0%, #2a3f6a 100%)',
              borderRadius: 12, padding: '24px 32px', color: '#fff', textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                <BankOutlined /> TOTAL FCFA
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>
                {fmt(position.totalDepots + position.caissePrincipale)} FCFA
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Toutes sources confondues</div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div style={{
              background: 'linear-gradient(135deg, #0e4d64 0%, #13c2c2 100%)',
              borderRadius: 12, padding: '24px 32px', color: '#fff', textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                <DollarOutlined /> ACTIVITE DU MOIS
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>
                {fmt(position.month.depots)} FCFA
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Depots - {fmt(position.month.retraits)} FCFA retraits</div>
            </div>
          </Col>
        </Row>

        {/* 4 cartes : Caisse, Comptes Bancaires, Coffres-forts, Caisses & Guichets */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #1B2A4A' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ color: '#1B2A4A' }}>
                  <WalletOutlined /> Caisse Principale
                </Text>
                <Tag color="blue">{position.caisses.length} caisse(s)</Tag>
              </div>
              <div style={{ fontSize: 13 }}>
                <div>FCFA <strong style={{ float: 'right' }}>{fmt(position.caissePrincipale)} FCFA</strong></div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #F5A623' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ color: '#F5A623' }}>
                  <BankOutlined /> Comptes Bancaires
                </Text>
                <Tag color="orange">0 compte(s)</Tag>
              </div>
              <div style={{ fontSize: 13 }}>
                <div>FCFA <strong style={{ float: 'right' }}>0 FCFA</strong></div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #52c41a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ color: '#52c41a' }}>
                  <SafetyOutlined /> Coffres-forts Agences
                </Text>
                <Tag color="green">{agencies.length} agence(s)</Tag>
              </div>
              <div style={{ fontSize: 13 }}>
                <div>FCFA <strong style={{ float: 'right' }}>{fmt(agencies.reduce((s, a) => s + a.soldeCaisse, 0))} FCFA</strong></div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ borderRadius: 8, borderTop: '3px solid #13c2c2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text strong style={{ color: '#13c2c2' }}>
                  <ShopOutlined /> Caisses & Guichets
                </Text>
                <Tag color="cyan">{position.caisses.length} caisse(s) active(s)</Tag>
              </div>
              <div style={{ fontSize: 13 }}>
                <div>FCFA <strong style={{ float: 'right' }}>{fmt(position.caissePrincipale)} FCFA</strong></div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Encours des depots */}
        <Card
          size="small"
          style={{ borderRadius: 8, marginBottom: 24 }}
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#1B2A4A', fontWeight: 600 }}>
                <BankOutlined /> Encours des Depots — Comptes Deposants
              </span>
              <Tag color="blue">{position.today.nbTransactions || 0} comptes actifs</Tag>
            </div>
          }
        >
          <Alert
            type="info"
            showIcon
            message="Ces montants representent l'argent detenu pour le compte des membres, entreprises et agents. Ce sont des engagements (passif) de l'institution."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1B2A4A' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong><TeamOutlined /> Membres / Clients</Text>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>
                  {fmt(position.depotClients)} FCFA
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>Comptes courants actifs</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #52c41a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong><WalletOutlined /> Epargne</Text>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                  {fmt(position.epargneClients)} FCFA
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>Comptes epargne</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #F5A623' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong><SafetyOutlined /> DAT</Text>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#F5A623' }}>
                  {fmt(position.datClients)} FCFA
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>Depots a terme</Text>
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Tendance 30 jours */}
        {trend30.length > 0 && (
          <Card
            title={<span style={{ color: '#1B2A4A', fontWeight: 600 }}>Tendance des flux — 30 derniers jours</span>}
            size="small"
            style={{ borderRadius: 8, marginBottom: 24 }}
          >
            <Line
              height={250}
              data={trend30.flatMap((d: any) => [
                { date: dayjs(d.date).format('DD/MM'), value: d.depots, type: 'Depots' },
                { date: dayjs(d.date).format('DD/MM'), value: d.retraits, type: 'Retraits' },
              ])}
              xField="date"
              yField="value"
              colorField="type"
              scale={{ color: { range: ['#52c41a', '#ff4d4f'] } }}
              style={{ lineWidth: 2 }}
              axis={{ y: { title: 'FCFA', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
              legend={{ color: { position: 'top' } }}
            />
          </Card>
        )}

        {/* Activite du jour */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Activite du jour" size="small" style={{ borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Depots" value={position.today.depots} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#52c41a' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Retraits" value={position.today.retraits} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#ff4d4f' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Solde net" value={position.today.soldeJour} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#1B2A4A' }} />
                </Col>
              </Row>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Activite du mois" size="small" style={{ borderRadius: 8 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="Depots" value={position.month.depots} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#52c41a' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Retraits" value={position.month.retraits} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#ff4d4f' }} />
                </Col>
                <Col span={8}>
                  <Statistic title="Frais percus" value={position.month.fraisPercus} suffix="FCFA" valueStyle={{ fontSize: 16, color: '#F5A623' }} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // ==================== POSITION PAR AGENCE ====================
  function AgencesTab() {
    const columns = [
      { title: 'Agence', dataIndex: 'name', key: 'name' },
      { title: 'Code', dataIndex: 'code', key: 'code' },
      { title: 'Ville', dataIndex: 'city', key: 'city' },
      { title: 'Clients', dataIndex: 'nbClients', key: 'clients', align: 'center' as const },
      { title: 'Total depots (FCFA)', dataIndex: 'totalDepots', key: 'depots',
        render: (v: number) => fmt(v), align: 'right' as const,
      },
      { title: 'Solde caisse (FCFA)', dataIndex: 'soldeCaisse', key: 'caisse',
        render: (v: number) => fmt(v), align: 'right' as const,
      },
    ];

    const barData = agencies.flatMap(a => [
      { agence: a.name, value: a.totalDepots, type: 'Depots' },
      { agence: a.name, value: a.soldeCaisse, type: 'Caisse' },
    ]);

    return (
      <div>
        {agencies.length > 0 && (
          <Card title="Comparaison par agence" size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
            <Column
              height={250}
              data={barData}
              xField="agence"
              yField="value"
              colorField="type"
              group={true}
              scale={{ color: { range: ['#1B2A4A', '#F5A623'] } }}
              style={{ radiusTopLeft: 3, radiusTopRight: 3 }}
              axis={{ y: { title: 'FCFA', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
              legend={{ color: { position: 'top' } }}
            />
          </Card>
        )}
        <Table dataSource={agencies} columns={columns} rowKey="agencyId" pagination={false} />
      </div>
    );
  }

  // ==================== CAISSES & GUICHETS ====================
  function CaissesTab() {
    const [registers, setRegisters] = useState<any[]>([]);
    const [loadingReg, setLoadingReg] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState<any>(null);
    const [detailModal, setDetailModal] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [openForm] = Form.useForm();
    const [closeForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const { canCreate, isReadOnly } = usePermissions();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchRegisters = async () => {
      setLoadingReg(true);
      try {
        const params: any = { limit: 50 };
        if (statusFilter) params.status = statusFilter;
        const { data } = await api.get('/savings/cash-registers', { params });
        setRegisters(data.data || []);
      } catch { /* silent */ }
      finally { setLoadingReg(false); }
    };

    useEffect(() => { fetchRegisters(); }, [statusFilter]);

    // Ma caisse ouverte
    const myCashRegister = registers.find(r => r.userId === currentUser.id && r.status === 'OPEN');
    const openCount = registers.filter(r => r.status === 'OPEN').length;
    const closedCount = registers.filter(r => r.status === 'CLOSED').length;

    const handleOpen = async () => {
      try {
        const values = await openForm.validateFields();
        setSubmitting(true);
        await api.post('/savings/cash-register/open', {
          agencyId: currentUser.agencyId,
          openingBalance: values.openingBalance,
        });
        message.success('Caisse ouverte avec succes');
        setOpenModal(false);
        openForm.resetFields();
        fetchRegisters();
      } catch (err: any) {
        if (err.response?.data?.message) message.error(err.response.data.message);
      } finally { setSubmitting(false); }
    };

    const handleClose = async () => {
      try {
        const values = await closeForm.validateFields();
        setSubmitting(true);
        await api.post('/savings/cash-register/close', {
          cashRegisterId: closeModal.id,
          physicalBalance: values.physicalBalance,
          notes: values.notes,
        });
        message.success('Caisse fermee avec succes');
        setCloseModal(null);
        closeForm.resetFields();
        fetchRegisters();
      } catch (err: any) {
        if (err.response?.data?.message) message.error(err.response.data.message);
      } finally { setSubmitting(false); }
    };

    const theoreticalBalance = (r: any) =>
      Number(r.openingBalance) + Number(r.totalDeposits) - Number(r.totalWithdrawals);

    const columns = [
      { title: 'Caissier', key: 'user', render: (_: any, r: any) =>
        r.user ? `${r.user.firstName} ${r.user.lastName}` : r.userId.slice(0, 8),
      },
      { title: 'Agence', key: 'agency', render: (_: any, r: any) => r.agency?.name || '-' },
      { title: 'Statut', dataIndex: 'status', width: 90,
        render: (s: string) => <Tag color={s === 'OPEN' ? 'green' : 'default'}>{s === 'OPEN' ? 'Ouverte' : 'Fermee'}</Tag>,
      },
      { title: 'Ouverture', key: 'opened', width: 130,
        render: (_: any, r: any) => dayjs(r.openedAt).format('DD/MM HH:mm'),
      },
      { title: 'Fermeture', key: 'closed', width: 130,
        render: (_: any, r: any) => r.closedAt ? dayjs(r.closedAt).format('DD/MM HH:mm') : '-',
      },
      { title: 'Solde ouverture', dataIndex: 'openingBalance', align: 'right' as const,
        render: (v: any) => `${fmt(Number(v))}`,
      },
      { title: 'Depots', dataIndex: 'totalDeposits', align: 'right' as const,
        render: (v: any) => <span style={{ color: '#52c41a' }}>+{fmt(Number(v))}</span>,
      },
      { title: 'Retraits', dataIndex: 'totalWithdrawals', align: 'right' as const,
        render: (v: any) => <span style={{ color: '#ff4d4f' }}>-{fmt(Number(v))}</span>,
      },
      { title: 'Solde theorique', key: 'theo', align: 'right' as const,
        render: (_: any, r: any) => <strong>{fmt(theoreticalBalance(r))} FCFA</strong>,
      },
      { title: 'Ecart', key: 'diff', width: 100, align: 'right' as const,
        render: (_: any, r: any) => {
          if (r.status === 'OPEN') return '-';
          const diff = Number(r.difference || 0);
          return <Tag color={diff === 0 ? 'green' : diff > 0 ? 'blue' : 'red'}>{diff > 0 ? '+' : ''}{fmt(diff)}</Tag>;
        },
      },
      { title: 'Actions', key: 'actions', width: 150,
        render: (_: any, r: any) => (
          <Space size="small">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => setDetailModal(r)}>
              Detail
            </Button>
            {r.status === 'OPEN' && r.userId === currentUser.id && !isReadOnly && (
              <Button size="small" danger icon={<StopOutlined />} onClick={() => {
                setCloseModal(r);
                closeForm.resetFields();
              }}>
                Fermer
              </Button>
            )}
          </Space>
        ),
      },
    ];

    return (
      <div>
        {/* Barre d'etat + actions */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            {myCashRegister ? (
              <Alert
                type="success"
                showIcon
                message={
                  <span>
                    Votre caisse est ouverte depuis <strong>{dayjs(myCashRegister.openedAt).format('HH:mm')}</strong>
                    {' — '}Depots : <span style={{ color: '#52c41a' }}>+{fmt(Number(myCashRegister.totalDeposits))}</span>
                    {' — '}Retraits : <span style={{ color: '#ff4d4f' }}>-{fmt(Number(myCashRegister.totalWithdrawals))}</span>
                    {' — '}Solde theorique : <strong>{fmt(theoreticalBalance(myCashRegister))} FCFA</strong>
                  </span>
                }
              />
            ) : (
              <Alert type="warning" showIcon message="Vous n'avez pas de caisse ouverte." />
            )}
          </Col>
          <Col>
            <Space>
              <Button.Group>
                <Button type={!statusFilter ? 'primary' : 'default'} onClick={() => setStatusFilter(undefined)}>
                  Toutes
                </Button>
                <Button type={statusFilter === 'OPEN' ? 'primary' : 'default'} onClick={() => setStatusFilter('OPEN')}>
                  Ouvertes ({openCount})
                </Button>
                <Button type={statusFilter === 'CLOSED' ? 'primary' : 'default'} onClick={() => setStatusFilter('CLOSED')}>
                  Fermees ({closedCount})
                </Button>
              </Button.Group>
              {!myCashRegister && canCreate('TRANSACTIONS') && !isReadOnly && (
                <Button type="primary" icon={<PlayCircleOutlined />} onClick={() => { setOpenModal(true); openForm.resetFields(); }}>
                  Ouvrir ma caisse
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={registers}
          columns={columns}
          loading={loadingReg}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
        />

        {/* Modal ouverture */}
        <Modal
          title="Ouvrir ma caisse"
          open={openModal}
          onCancel={() => setOpenModal(false)}
          onOk={handleOpen}
          confirmLoading={submitting}
          okText="Ouvrir la caisse"
        >
          <Alert
            type="info"
            showIcon
            message="Comptez physiquement les billets et pieces dans votre caisse avant de declarer le solde d'ouverture."
            style={{ marginBottom: 16 }}
          />
          <Form form={openForm} layout="vertical">
            <Form.Item name="openingBalance" label="Solde physique d'ouverture (FCFA)" rules={[{ required: true, message: 'Saisissez le montant' }]}>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                step={1000}
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={v => v!.replace(/\s/g, '') as any}
                placeholder="Ex: 500 000"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Modal fermeture */}
        <Modal
          title="Fermer ma caisse"
          open={!!closeModal}
          onCancel={() => setCloseModal(null)}
          onOk={handleClose}
          confirmLoading={submitting}
          okText="Fermer la caisse"
          okButtonProps={{ danger: true }}
          width={600}
        >
          {closeModal && (
            <>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Ouverture">{fmt(Number(closeModal.openingBalance))} FCFA</Descriptions.Item>
                <Descriptions.Item label="Depuis">{dayjs(closeModal.openedAt).format('DD/MM HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Depots journee">
                  <span style={{ color: '#52c41a' }}>+{fmt(Number(closeModal.totalDeposits))} FCFA</span>
                </Descriptions.Item>
                <Descriptions.Item label="Retraits journee">
                  <span style={{ color: '#ff4d4f' }}>-{fmt(Number(closeModal.totalWithdrawals))} FCFA</span>
                </Descriptions.Item>
                <Descriptions.Item label="Solde theorique" span={2}>
                  <strong style={{ fontSize: 16, color: '#1B2A4A' }}>
                    {fmt(theoreticalBalance(closeModal))} FCFA
                  </strong>
                </Descriptions.Item>
              </Descriptions>

              <Alert
                type="warning"
                showIcon
                message="Comptez physiquement tous les billets et pieces dans votre caisse. Saisissez le montant exact."
                style={{ marginBottom: 16 }}
              />

              <Form form={closeForm} layout="vertical">
                <Form.Item name="physicalBalance" label="Solde physique compte (FCFA)" rules={[{ required: true, message: 'Saisissez le montant physique' }]}>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    step={1000}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    parser={v => v!.replace(/\s/g, '') as any}
                    placeholder="Montant physique en caisse"
                  />
                </Form.Item>
                <Form.Item name="notes" label="Notes / motif ecart (si applicable)">
                  <Input.TextArea rows={2} placeholder="Ex: Erreur de rendu monnaie, billet suspect..." />
                </Form.Item>
              </Form>
            </>
          )}
        </Modal>

        {/* Modal detail session */}
        <Modal
          title={detailModal ? `Detail session — ${detailModal.user ? `${detailModal.user.firstName} ${detailModal.user.lastName}` : ''}` : ''}
          open={!!detailModal}
          onCancel={() => setDetailModal(null)}
          footer={<Button onClick={() => setDetailModal(null)}>Fermer</Button>}
          width={650}
        >
          {detailModal && (
            <>
              <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Agence">{detailModal.agency?.name || '-'}</Descriptions.Item>
                <Descriptions.Item label="Statut">
                  <Tag color={detailModal.status === 'OPEN' ? 'green' : 'default'}>
                    {detailModal.status === 'OPEN' ? 'Ouverte' : 'Fermee'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ouverture">{dayjs(detailModal.openedAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                <Descriptions.Item label="Fermeture">{detailModal.closedAt ? dayjs(detailModal.closedAt).format('DD/MM/YYYY HH:mm') : 'En cours'}</Descriptions.Item>
                <Descriptions.Item label="Solde ouverture">{fmt(Number(detailModal.openingBalance))} FCFA</Descriptions.Item>
                <Descriptions.Item label="Nb operations">
                  {Number(detailModal.totalDeposits) > 0 || Number(detailModal.totalWithdrawals) > 0 ? 'Voir ci-dessous' : 'Aucune'}
                </Descriptions.Item>
              </Descriptions>

              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #52c41a', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Depots</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>
                      +{fmt(Number(detailModal.totalDeposits))}
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #ff4d4f', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Retraits</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}>
                      -{fmt(Number(detailModal.totalWithdrawals))}
                    </div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ borderTop: '3px solid #1B2A4A', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>Solde theorique</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1B2A4A' }}>
                      {fmt(theoreticalBalance(detailModal))}
                    </div>
                  </Card>
                </Col>
              </Row>

              {detailModal.status === 'CLOSED' && (
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Solde physique declare">{fmt(Number(detailModal.physicalBalance))} FCFA</Descriptions.Item>
                  <Descriptions.Item label="Ecart">
                    {(() => {
                      const diff = Number(detailModal.difference || 0);
                      return <Tag color={diff === 0 ? 'green' : diff > 0 ? 'blue' : 'red'} style={{ fontSize: 14 }}>
                        {diff > 0 ? '+' : ''}{fmt(diff)} FCFA
                      </Tag>;
                    })()}
                  </Descriptions.Item>
                  {detailModal.notes && (
                    <Descriptions.Item label="Notes" span={2}>{detailModal.notes}</Descriptions.Item>
                  )}
                </Descriptions>
              )}
            </>
          )}
        </Modal>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'vue',
      label: <span><BankOutlined /> Vue d'ensemble</span>,
      children: <VueEnsemble />,
    },
    {
      key: 'agences',
      label: <span><SafetyOutlined /> Coffres-forts Agences</span>,
      children: <AgencesTab />,
    },
    {
      key: 'caisses',
      label: <span><ShopOutlined /> Caisses & Guichets</span>,
      children: <CaissesTab />,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
              <BankOutlined /> Position de Tresorerie
            </Title>
            <Text type="secondary">Vue consolidee de toutes les liquidites de l'institution</Text>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mis a jour le {dayjs().format('DD/MM/YYYY [a] HH:mm')}
            </Text>
          </Col>
        </Row>
      </div>

      <Card style={{ borderRadius: 8 }} loading={loading}>
        <Tabs items={tabItems} defaultActiveKey="vue" />
      </Card>
    </div>
  );
}
