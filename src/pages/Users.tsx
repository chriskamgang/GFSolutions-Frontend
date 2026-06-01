import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message, Modal, Form, Input, Select, Space, Popconfirm, Statistic,
} from 'antd';
import {
  PlusOutlined, EditOutlined, UserOutlined, StopOutlined, CheckCircleOutlined,
  DownloadOutlined, FilePdfOutlined, SearchOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const { canCreate, canUpdate, isReadOnly } = usePermissions();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.data || data);
    } catch { message.error('Erreur chargement utilisateurs'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUsers();
    api.get('/roles').then(r => setRoles(r.data)).catch(() => {});
    api.get('/agencies').then(r => setAgencies(r.data)).catch(() => {});
  }, []);

  const generateEmail = (firstName: string, lastName: string) => {
    const normalize = (s: string) =>
      s.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().replace(/\s+/g, '.')
        .replace(/[^a-z0-9.-]/g, '');
    if (!firstName && !lastName) return '';
    return `${normalize(firstName || '')}.${normalize(lastName || '')}@gfs-cameroun.com`;
  };

  const handleNameChange = () => {
    if (editingUser) return; // Ne pas écraser l'email en mode édition
    const firstName = form.getFieldValue('firstName') || '';
    const lastName = form.getFieldValue('lastName') || '';
    if (firstName || lastName) {
      form.setFieldValue('email', generateEmail(firstName, lastName));
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ language: 'FR' });
    setModalVisible(true);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      roleId: user.roleId,
      agencyId: user.agencyId,
      language: user.language,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, values);
        message.success('Utilisateur modifie');
      } else {
        await api.post('/users', values);
        message.success('Utilisateur cree');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleToggle = async (userId: string) => {
    try {
      await api.patch(`/users/${userId}/toggle-active`);
      message.success('Statut modifie');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${u.firstName} ${u.lastName}`.toLowerCase().includes(s)
      || u.email.toLowerCase().includes(s)
      || (u.role?.name || '').toLowerCase().includes(s);
  });

  const activeCount = users.filter(u => u.isActive).length;

  const columns = [
    { title: 'Nom', key: 'name', render: (_: any, r: any) => (
      <span><UserOutlined style={{ marginRight: 6 }} /><strong>{r.firstName} {r.lastName}</strong></span>
    )},
    { title: 'Email', dataIndex: 'email' },
    { title: 'Telephone', dataIndex: 'phone' },
    { title: 'Role', key: 'role', render: (_: any, r: any) => <Tag color="blue">{r.role?.name || '-'}</Tag> },
    { title: 'Agence', key: 'agency', render: (_: any, r: any) => r.agency?.name || '-' },
    { title: 'Langue', dataIndex: 'language', width: 70, render: (v: string) => <Tag>{v}</Tag> },
    { title: 'Statut', dataIndex: 'isActive', width: 90,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Actif' : 'Inactif'}</Tag>,
    },
    { title: 'Derniere connexion', dataIndex: 'lastLoginAt', width: 140,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YY HH:mm') : 'Jamais',
    },
    { title: 'Actions', key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space size="small">
          {canUpdate('USERS') && (
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          )}
          {canUpdate('USERS') && (
            <Popconfirm title={r.isActive ? 'Desactiver cet utilisateur ?' : 'Reactiver cet utilisateur ?'}
              onConfirm={() => handleToggle(r.id)}>
              <Button size="small" danger={r.isActive} icon={r.isActive ? <StopOutlined /> : <CheckCircleOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const exportCols = [
    { title: 'Nom', key: 'firstName', format: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
    { title: 'Email', key: 'email' },
    { title: 'Telephone', key: 'phone' },
    { title: 'Role', key: 'role', format: (_: any, r: any) => r.role?.name || '' },
    { title: 'Agence', key: 'agency', format: (_: any, r: any) => r.agency?.name || '' },
    { title: 'Statut', key: 'isActive', format: (v: any) => v ? 'Actif' : 'Inactif' },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}><UserOutlined /> Utilisateurs</Title>
            <Text type="secondary">Gestion du personnel ({users.length} utilisateurs)</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(users, exportCols, 'utilisateurs')}>Excel</Button>
              <Button icon={<FilePdfOutlined />} onClick={() => exportToPdf({ title: 'Liste des utilisateurs', columns: exportCols, data: users, filename: 'utilisateurs' })}>PDF</Button>
              {canCreate('USERS') && !isReadOnly && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>Nouvel utilisateur</Button>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Total" value={users.length} /></Card></Col>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Actifs" value={activeCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={8} lg={4}><Card size="small"><Statistic title="Inactifs" value={users.length - activeCount} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Input.Search placeholder="Rechercher par nom, email ou role..." allowClear style={{ width: 350, marginBottom: 16 }}
          prefix={<SearchOutlined />} onChange={e => setSearch(e.target.value)} />
        <Table dataSource={filtered} columns={columns} loading={loading} rowKey="id" size="small" />
      </Card>

      <Modal
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        okText={editingUser ? 'Modifier' : 'Creer'}
        width={550}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="Prenom" rules={[{ required: true }]}>
                <Input onChange={handleNameChange} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Nom" rules={[{ required: true }]}>
                <Input onChange={handleNameChange} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="email"
                label="Email professionnel"
                rules={[
                  { required: true },
                  { pattern: /@gfs-cameroun\.com$/, message: 'Doit être @gfs-cameroun.com' },
                ]}
                extra={!editingUser ? <span style={{ fontSize: 11, color: '#94a3b8' }}>Auto-généré depuis le prénom/nom</span> : undefined}
              >
                <Input
                  suffix={<span style={{ color: '#94a3b8', fontSize: 12, userSelect: 'none' }}>@gfs-cameroun.com</span>}
                  onChange={(e) => {
                    // Permettre de saisir seulement la partie avant @
                    const val = e.target.value;
                    if (val.includes('@') && !val.endsWith('@gfs-cameroun.com')) {
                      form.setFieldValue('email', val.split('@')[0] + '@gfs-cameroun.com');
                    }
                  }}
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="phone" label="Telephone" rules={[{ required: true }]}>
                <Input placeholder="+237..." />
              </Form.Item>
            </Col>
          </Row>
          {!editingUser && (
            <Form.Item name="password" label="Mot de passe" rules={[{ required: true, min: 8 }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
                <Select placeholder="Selectionner un role">
                  {roles.map((r: any) => (
                    <Select.Option key={r.id} value={r.id}>{r.name} — {r.description?.slice(0, 30)}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="agencyId" label="Agence">
                <Select placeholder="Agence" allowClear>
                  {agencies.map((a: any) => (
                    <Select.Option key={a.id} value={a.id}>{a.name} ({a.code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="language" label="Langue">
            <Select>
              <Select.Option value="FR">Francais</Select.Option>
              <Select.Option value="EN">English</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
