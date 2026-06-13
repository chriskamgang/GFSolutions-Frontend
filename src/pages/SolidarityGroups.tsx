import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, InputNumber,
  Select, message, Descriptions, List, Avatar, Popconfirm, Row, Col, Statistic, Empty,
} from 'antd';
import {
  TeamOutlined, PlusOutlined, UserAddOutlined, UserDeleteOutlined,
  EyeOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function SolidarityGroups() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [form] = Form.useForm();

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/solidarity-groups');
      setGroups(res.data);
    } catch { message.error('Erreur chargement groupes'); }
    setLoading(false);
  }, []);

  const fetchAgencies = useCallback(async () => {
    try {
      const res = await api.get('/agencies');
      setAgencies(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchGroups(); fetchAgencies(); }, [fetchGroups, fetchAgencies]);

  const handleCreate = async (values: any) => {
    try {
      await api.post('/solidarity-groups', values);
      message.success('Groupe cree');
      setCreateOpen(false);
      form.resetFields();
      fetchGroups();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const res = await api.get(`/solidarity-groups/${id}`);
      setSelectedGroup(res.data);
      setDetailOpen(true);
    } catch { message.error('Erreur chargement'); }
  };

  const searchClients = async (query: string) => {
    if (query.length < 2) return;
    setSearching(true);
    try {
      const res = await api.get('/clients', { params: { search: query, limit: 10 } });
      setClientSearch(res.data.data || []);
    } catch {}
    setSearching(false);
  };

  const addMember = async (clientId: string, role?: string) => {
    if (!selectedGroup) return;
    try {
      await api.post(`/solidarity-groups/${selectedGroup.id}/members`, { clientId, role });
      message.success('Membre ajoute');
      setAddMemberOpen(false);
      viewDetail(selectedGroup.id);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const removeMember = async (clientId: string) => {
    if (!selectedGroup) return;
    try {
      await api.delete(`/solidarity-groups/${selectedGroup.id}/members/${clientId}`);
      message.success('Membre retire');
      viewDetail(selectedGroup.id);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const changeStatus = async (id: string, action: string) => {
    try {
      await api.patch(`/solidarity-groups/${id}/${action}`);
      message.success('Statut mis a jour');
      fetchGroups();
      if (selectedGroup?.id === id) viewDetail(id);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Erreur');
    }
  };

  const statusColor: Record<string, string> = {
    ACTIVE: 'green', SUSPENDED: 'orange', DISSOLVED: 'red',
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', render: (v: string) => <Text strong>{v}</Text> },
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Membres', key: 'members',
      render: (_: any, r: any) => <Tag>{r.members?.filter((m: any) => m.isActive).length || 0} / {r.maxMembers}</Tag>,
    },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColor[v] || 'default'}>{v}</Tag>,
    },
    {
      title: 'Cree le', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(r.id)}>Detail</Button>
          {r.status === 'ACTIVE' && (
            <Popconfirm title="Suspendre ce groupe ?" onConfirm={() => changeStatus(r.id, 'suspend')}>
              <Button size="small" icon={<StopOutlined />} danger>Suspendre</Button>
            </Popconfirm>
          )}
          {r.status === 'SUSPENDED' && (
            <Button size="small" icon={<CheckCircleOutlined />} onClick={() => changeStatus(r.id, 'reactivate')}>
              Reactiver
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const activeGroups = groups.filter(g => g.status === 'ACTIVE').length;
  const totalMembers = groups.reduce((s, g) => s + (g.members?.filter((m: any) => m.isActive).length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
            <TeamOutlined /> Groupes Solidaires
          </Title>
          <Text type="secondary">Gestion des groupes de pret solidaire avec garantie mutuelle</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          Nouveau groupe
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card><Statistic title="Total groupes" value={groups.length} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Groupes actifs" value={activeGroups} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Total membres" value={totalMembers} prefix={<TeamOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Suspendus" value={groups.filter(g => g.status === 'SUSPENDED').length} valueStyle={{ color: '#faad14' }} /></Card></Col>
      </Row>

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={groups}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Modal creation */}
      <Modal
        title={<span><PlusOutlined /> Creer un groupe solidaire</span>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Creer"
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="Nom du groupe" rules={[{ required: true }]}>
            <Input placeholder="Ex: Groupe Espoir Douala" />
          </Form.Item>
          <Form.Item name="code" label="Code unique" rules={[{ required: true }]}>
            <Input placeholder="Ex: GS-001" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="agencyId" label="Agence" rules={[{ required: true }]}>
            <Select placeholder="Selectionner une agence">
              {agencies.map((a: any) => <Select.Option key={a.id} value={a.id}>{a.name}</Select.Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="minMembers" label="Min. membres" initialValue={3}>
                <InputNumber min={2} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="maxMembers" label="Max. membres" initialValue={10}>
                <InputNumber min={3} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="presidentId" label="ID President (client)" rules={[{ required: true }]}>
            <Input placeholder="UUID du client president" />
          </Form.Item>
          <Form.Item name="treasurerId" label="ID Tresorier (optionnel)">
            <Input placeholder="UUID du client tresorier" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detail */}
      <Modal
        title={selectedGroup ? <span><TeamOutlined /> {selectedGroup.name} ({selectedGroup.code})</span> : 'Detail'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {selectedGroup && (
          <>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Code">{selectedGroup.code}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={statusColor[selectedGroup.status]}>{selectedGroup.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Min/Max membres">{selectedGroup.minMembers} - {selectedGroup.maxMembers}</Descriptions.Item>
              <Descriptions.Item label="Cree le">{dayjs(selectedGroup.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{selectedGroup.description || '-'}</Descriptions.Item>
            </Descriptions>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text strong>Membres ({selectedGroup.members?.filter((m: any) => m.isActive).length || 0})</Text>
              <Space>
                {selectedGroup.status === 'ACTIVE' && (
                  <>
                    <Button size="small" icon={<UserAddOutlined />} type="primary" onClick={() => { setClientSearch([]); setAddMemberOpen(true); }}>
                      Ajouter
                    </Button>
                    <Popconfirm title="Dissoudre ce groupe ?" onConfirm={() => changeStatus(selectedGroup.id, 'dissolve')}>
                      <Button size="small" icon={<DeleteOutlined />} danger>Dissoudre</Button>
                    </Popconfirm>
                  </>
                )}
                <Button size="small" icon={<ReloadOutlined />} onClick={() => viewDetail(selectedGroup.id)}>Rafraichir</Button>
              </Space>
            </div>

            {selectedGroup.members?.filter((m: any) => m.isActive).length > 0 ? (
              <List
                dataSource={selectedGroup.members.filter((m: any) => m.isActive)}
                renderItem={(m: any) => (
                  <List.Item
                    actions={[
                      <Tag color={m.role === 'PRESIDENT' ? 'gold' : m.role === 'TREASURER' ? 'blue' : 'default'}>{m.role}</Tag>,
                      selectedGroup.status === 'ACTIVE' && (
                        <Popconfirm title="Retirer ce membre ?" onConfirm={() => removeMember(m.clientId)}>
                          <Button size="small" danger icon={<UserDeleteOutlined />} />
                        </Popconfirm>
                      ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<TeamOutlined />} style={{ background: '#1B2A4A' }} />}
                      title={m.client ? `${m.client.firstName || ''} ${m.client.lastName || m.client.raisonSociale || ''}` : m.clientId}
                      description={m.client?.phone || `Depuis ${dayjs(m.joinedAt).format('DD/MM/YYYY')}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucun membre actif" />
            )}
          </>
        )}
      </Modal>

      {/* Modal ajout membre */}
      <Modal
        title="Ajouter un membre au groupe"
        open={addMemberOpen}
        onCancel={() => setAddMemberOpen(false)}
        footer={null}
        width={500}
      >
        <Input.Search
          placeholder="Rechercher un client (nom, telephone...)"
          onSearch={searchClients}
          loading={searching}
          enterButton
          style={{ marginBottom: 16 }}
        />
        <List
          dataSource={clientSearch}
          locale={{ emptyText: 'Recherchez un client' }}
          renderItem={(c: any) => (
            <List.Item
              actions={[
                <Button size="small" type="primary" onClick={() => addMember(c.id, 'MEMBER')}>
                  Ajouter
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<TeamOutlined />} />}
                title={`${c.firstName || ''} ${c.lastName || c.raisonSociale || ''}`}
                description={`${c.phone} - ${c.clientNumber}`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
}
