import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message, Modal, Form, Input, Select, Space, Statistic, Descriptions,
} from 'antd';
import {
  PlusOutlined, ApartmentOutlined, EditOutlined, EyeOutlined, TeamOutlined, UserOutlined,
  EnvironmentOutlined, PhoneOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;

export default function Agencies() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { canCreate, canUpdate, isReadOnly } = usePermissions();

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/agencies');
      setAgencies(data);
    } catch { message.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAgencies(); }, []);

  const handleCreate = () => {
    setEditingAgency(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (agency: any) => {
    setEditingAgency(agency);
    form.setFieldsValue({
      name: agency.name,
      code: agency.code,
      address: agency.address,
      city: agency.city,
      region: agency.region,
      phone: agency.phone,
      email: agency.email,
      parentId: agency.parentId,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingAgency) {
        const { code, ...updateData } = values;
        await api.patch(`/agencies/${editingAgency.id}`, updateData);
        message.success('Agence modifiee');
      } else {
        await api.post('/agencies', values);
        message.success('Agence creee');
      }
      setModalVisible(false);
      fetchAgencies();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleViewDetail = async (agencyId: string) => {
    try {
      const { data } = await api.get(`/agencies/${agencyId}`);
      setSelectedAgency(data);
      setDetailVisible(true);
    } catch { message.error('Erreur chargement detail'); }
  };

  const totalClients = agencies.reduce((sum, a) => sum + (a._count?.clients || 0), 0);
  const totalStaff = agencies.reduce((sum, a) => sum + (a._count?.users || 0), 0);

  const regionColors: Record<string, string> = {
    'Centre': 'blue', 'Littoral': 'cyan', 'Ouest': 'green', 'Nord-Ouest': 'orange',
    'Sud-Ouest': 'purple', 'Nord': 'red', 'Extreme-Nord': 'volcano', 'Adamaoua': 'gold',
    'Est': 'lime', 'Sud': 'magenta',
  };

  const columns = [
    { title: 'Agence', key: 'name', render: (_: any, r: any) => (
      <span>
        <ApartmentOutlined style={{ marginRight: 6, color: '#1B2A4A' }} />
        <strong>{r.name}</strong>
        <Text type="secondary" style={{ marginLeft: 8 }}>({r.code})</Text>
      </span>
    )},
    { title: 'Ville', dataIndex: 'city', render: (v: string) => <span><EnvironmentOutlined style={{ marginRight: 4 }} />{v}</span> },
    { title: 'Region', dataIndex: 'region', render: (v: string) => <Tag color={regionColors[v] || 'default'}>{v}</Tag> },
    { title: 'Telephone', dataIndex: 'phone', render: (v: string) => <span><PhoneOutlined style={{ marginRight: 4 }} />{v}</span> },
    { title: 'Agence mere', key: 'parent', render: (_: any, r: any) => r.parent?.name || <Text type="secondary">Siege</Text> },
    { title: 'Clients', key: 'clients', width: 80, align: 'center' as const,
      render: (_: any, r: any) => <Tag icon={<TeamOutlined />}>{r._count?.clients || 0}</Tag>,
    },
    { title: 'Staff', key: 'staff', width: 70, align: 'center' as const,
      render: (_: any, r: any) => <Tag icon={<UserOutlined />}>{r._count?.users || 0}</Tag>,
    },
    { title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)} />
          {canUpdate('AGENCIES') && !isReadOnly && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
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
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}><ApartmentOutlined /> Reseau d'agences</Title>
            <Text type="secondary">Gestion des agences et succursales</Text>
          </Col>
          <Col>
            {canCreate('AGENCIES') && !isReadOnly && (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Nouvelle agence</Button>
            )}
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Agences" value={agencies.length} /></Card></Col>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Clients total" value={totalClients} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Personnel" value={totalStaff} valueStyle={{ color: '#1B2A4A' }} /></Card></Col>
      </Row>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Table dataSource={agencies} columns={columns} loading={loading} rowKey="id" size="small" />
      </Card>

      {/* Modal creation/edition */}
      <Modal title={editingAgency ? 'Modifier l\'agence' : 'Nouvelle agence'} open={modalVisible}
        onCancel={() => setModalVisible(false)} onOk={handleSubmit} confirmLoading={submitting}
        okText={editingAgency ? 'Modifier' : 'Creer'} width={550}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="name" label="Nom de l'agence" rules={[{ required: true }]}>
                <Input placeholder="Ex: Agence Douala Akwa" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                <Input placeholder="AG-001" disabled={!!editingAgency} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Adresse" rules={[{ required: true }]}>
            <Input placeholder="Rue, quartier..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="Ville" rules={[{ required: true }]}>
                <Input placeholder="Douala" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="Region" rules={[{ required: true }]}>
                <Select placeholder="Region">
                  {['Centre', 'Littoral', 'Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Nord', 'Extreme-Nord', 'Adamaoua', 'Est', 'Sud'].map(r => (
                    <Select.Option key={r} value={r}>{r}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Telephone" rules={[{ required: true }]}>
                <Input placeholder="+237..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="agence@microfinance.cm" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="parentId" label="Agence mere (hierarchie)">
            <Select placeholder="Siege (aucun parent)" allowClear>
              {agencies.filter(a => !editingAgency || a.id !== editingAgency.id).map(a => (
                <Select.Option key={a.id} value={a.id}>{a.name} ({a.code})</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal detail */}
      <Modal title={`Detail — ${selectedAgency?.name}`} open={detailVisible}
        onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {selectedAgency && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Nom">{selectedAgency.name}</Descriptions.Item>
              <Descriptions.Item label="Code">{selectedAgency.code}</Descriptions.Item>
              <Descriptions.Item label="Adresse" span={2}>{selectedAgency.address}</Descriptions.Item>
              <Descriptions.Item label="Ville">{selectedAgency.city}</Descriptions.Item>
              <Descriptions.Item label="Region">{selectedAgency.region}</Descriptions.Item>
              <Descriptions.Item label="Telephone">{selectedAgency.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedAgency.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Agence mere">{selectedAgency.parent?.name || 'Siege'}</Descriptions.Item>
              <Descriptions.Item label="Clients">{selectedAgency._count?.clients || 0}</Descriptions.Item>
              <Descriptions.Item label="Utilisateurs">{selectedAgency._count?.users || 0}</Descriptions.Item>
              <Descriptions.Item label="Transactions">{selectedAgency._count?.transactions || 0}</Descriptions.Item>
            </Descriptions>
            {selectedAgency.children?.length > 0 && (
              <>
                <Title level={5}>Sous-agences ({selectedAgency.children.length})</Title>
                {selectedAgency.children.map((c: any) => (
                  <Tag key={c.id} style={{ margin: 4 }}>{c.name} ({c.code})</Tag>
                ))}
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
