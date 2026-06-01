import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Typography, Row, Col, message, Modal, Form, Input, InputNumber, Checkbox, Badge, Space, Descriptions, Collapse,
} from 'antd';
import { PlusOutlined, SafetyOutlined, EditOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;

export default function Roles() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [permVisible, setPermVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { canCreate, canUpdate, isReadOnly } = usePermissions();

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);
      setRoles(rolesRes.data);
      setAllPermissions(permsRes.data);
    } catch { message.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  // Grouper les permissions par module
  const permissionsByModule = allPermissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, any[]>);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await api.post('/roles', {
        name: values.name,
        description: values.description,
        maxTransactionAmount: values.maxTransactionAmount,
        sessionTimeout: values.sessionTimeout || 30,
      });
      message.success('Role cree');
      setCreateVisible(false);
      form.resetFields();
      fetchRoles();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleEditPerms = (role: any) => {
    setSelectedRole(role);
    setSelectedPermIds(role.permissions?.map((rp: any) => rp.permission?.id || rp.permissionId) || []);
    setPermVisible(true);
  };

  const handleSavePerms = async () => {
    try {
      setSubmitting(true);
      await api.patch(`/roles/${selectedRole.id}/permissions`, { permissionIds: selectedPermIds });
      message.success('Permissions mises a jour');
      setPermVisible(false);
      fetchRoles();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    } finally { setSubmitting(false); }
  };

  const handleSeed = async () => {
    try {
      setLoading(true);
      await api.post('/roles/seed');
      message.success('Roles et permissions initialises');
      fetchRoles();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    } finally { setLoading(false); }
  };

  const handleViewDetail = (role: any) => {
    setSelectedRole(role);
    setDetailVisible(true);
  };

  const moduleLabels: Record<string, string> = {
    CLIENTS: 'Clients', ACCOUNTS: 'Comptes', TRANSACTIONS: 'Transactions',
    CREDITS: 'Credits', CONTRIBUTIONS: 'Epargne/Cotisations', COMPANIES: 'Entreprises',
    ACCOUNTING: 'Comptabilite', REPORTS: 'Rapports', AGENCIES: 'Agences',
    USERS: 'Utilisateurs', ROLES: 'Roles', SETTINGS: 'Parametres', AUDIT: 'Audit',
  };

  const columns = [
    { title: 'Role', dataIndex: 'name', render: (name: string, r: any) => (
      <span>
        <SafetyOutlined style={{ marginRight: 8, color: '#1B2A4A' }} />
        <strong>{name}</strong>
        {r.isSystem && <Tag color="purple" style={{ marginLeft: 8 }}>Systeme</Tag>}
      </span>
    )},
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    { title: 'Permissions', key: 'permissions', width: 100, align: 'center' as const,
      render: (_: any, r: any) => <Badge count={r.permissions?.length || 0} style={{ backgroundColor: '#1B2A4A' }} />,
    },
    { title: 'Utilisateurs', key: 'users', width: 100, align: 'center' as const,
      render: (_: any, r: any) => <Badge count={r._count?.users || 0} style={{ backgroundColor: '#52c41a' }} showZero />,
    },
    { title: 'Plafond', dataIndex: 'maxTransactionAmount', width: 140,
      render: (v: any) => v ? `${Number(v).toLocaleString('fr-FR')} F` : <Text type="secondary">Illimite</Text>,
    },
    { title: 'Session', dataIndex: 'sessionTimeout', width: 80,
      render: (v: number) => `${v || 30} min`,
    },
    { title: 'Actions', key: 'actions', width: 150,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r)} />
          {canUpdate('ROLES') && !isReadOnly && (
            <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => handleEditPerms(r)}>
              Permissions
            </Button>
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
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}><SafetyOutlined /> Roles & Permissions</Title>
            <Text type="secondary">Gestion des droits d'acces ({roles.length} roles, {allPermissions.length} permissions)</Text>
          </Col>
          <Col>
            <Space>
              {canCreate('ROLES') && !isReadOnly && (
                <>
                  <Button onClick={handleSeed} icon={<SettingOutlined />}>Initialiser roles par defaut</Button>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setCreateVisible(true); }}>
                    Nouveau role
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Table dataSource={roles} columns={columns} loading={loading} rowKey="id" size="small" />
      </Card>

      {/* Modal creation role */}
      <Modal title="Nouveau role" open={createVisible} onCancel={() => setCreateVisible(false)}
        onOk={handleCreate} confirmLoading={submitting} okText="Creer">
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nom du role" rules={[{ required: true }]}>
            <Input placeholder="Ex: RESPONSABLE_EPARGNE" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="maxTransactionAmount" label="Plafond transaction (FCFA)">
                <InputNumber style={{ width: '100%' }} min={0} step={100000} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sessionTimeout" label="Timeout session (min)">
                <InputNumber style={{ width: '100%' }} min={5} max={480} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal edition permissions */}
      <Modal title={`Permissions — ${selectedRole?.name}`} open={permVisible}
        onCancel={() => setPermVisible(false)} onOk={handleSavePerms}
        confirmLoading={submitting} okText="Enregistrer" width={700}>
        <div style={{ marginBottom: 12 }}>
          <Space>
            <Button size="small" onClick={() => setSelectedPermIds(allPermissions.map(p => p.id))}>Tout selectionner</Button>
            <Button size="small" onClick={() => setSelectedPermIds([])}>Tout deselectionner</Button>
            <Text type="secondary">{selectedPermIds.length} / {allPermissions.length} permissions</Text>
          </Space>
        </div>
        <Collapse defaultActiveKey={Object.keys(permissionsByModule)}>
          {Object.entries(permissionsByModule).map(([module, perms]: [string, any]) => (
            <Collapse.Panel
              key={module}
              header={
                <span>
                  <strong>{moduleLabels[module] || module}</strong>
                  <Badge count={perms.filter((p: any) => selectedPermIds.includes(p.id)).length}
                    style={{ backgroundColor: '#1B2A4A', marginLeft: 8 }} />
                  <Text type="secondary" style={{ marginLeft: 8 }}>/ {perms.length}</Text>
                </span>
              }
            >
              <Checkbox.Group
                value={selectedPermIds.filter((id: string) => perms.some((p: any) => p.id === id))}
                onChange={(checked) => {
                  const modulePermIds = perms.map((p: any) => p.id);
                  const other = selectedPermIds.filter(id => !modulePermIds.includes(id));
                  setSelectedPermIds([...other, ...(checked as string[])]);
                }}
              >
                <Row>
                  {perms.map((p: any) => (
                    <Col span={6} key={p.id}>
                      <Checkbox value={p.id}>
                        <Tag color={p.action === 'CREATE' ? 'green' : p.action === 'READ' ? 'blue' : p.action === 'UPDATE' ? 'orange' : 'red'}>
                          {p.action}
                        </Tag>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Collapse.Panel>
          ))}
        </Collapse>
      </Modal>

      {/* Modal detail role */}
      <Modal title={`Detail — ${selectedRole?.name}`} open={detailVisible}
        onCancel={() => setDetailVisible(false)} footer={null} width={600}>
        {selectedRole && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Nom">{selectedRole.name}</Descriptions.Item>
              <Descriptions.Item label="Description">{selectedRole.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="Plafond transaction">
                {selectedRole.maxTransactionAmount ? `${Number(selectedRole.maxTransactionAmount).toLocaleString('fr-FR')} FCFA` : 'Illimite'}
              </Descriptions.Item>
              <Descriptions.Item label="Timeout session">{selectedRole.sessionTimeout || 30} min</Descriptions.Item>
              <Descriptions.Item label="Utilisateurs">{selectedRole._count?.users || 0}</Descriptions.Item>
              <Descriptions.Item label="Systeme">{selectedRole.isSystem ? 'Oui' : 'Non'}</Descriptions.Item>
            </Descriptions>
            <Title level={5}>Permissions ({selectedRole.permissions?.length || 0})</Title>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedRole.permissions?.map((rp: any, i: number) => {
                const p = rp.permission || rp;
                return (
                  <Tag key={i} color={p.action === 'CREATE' ? 'green' : p.action === 'READ' ? 'blue' : p.action === 'UPDATE' ? 'orange' : 'red'}>
                    {p.module}:{p.action}
                  </Tag>
                );
              })}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
