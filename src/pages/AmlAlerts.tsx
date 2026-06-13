import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Table, Button, Space, Tag, Modal, Form, Input, Select,
  message, Descriptions, Row, Col, Statistic, Badge, Popconfirm, Tooltip,
} from 'antd';
import {
  AlertOutlined, ExclamationCircleOutlined, SearchOutlined, FileProtectOutlined,
  CheckCircleOutlined, EyeOutlined, WarningOutlined, SafetyOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const riskColors: Record<string, string> = {
  LOW: 'blue', MEDIUM: 'orange', HIGH: 'red', CRITICAL: '#8B0000',
};
const statusColors: Record<string, string> = {
  OPEN: 'red', INVESTIGATING: 'orange', ESCALATED: 'volcano',
  CLOSED_FALSE_POSITIVE: 'default', CLOSED_CONFIRMED: 'green', REPORTED: 'purple',
};
const typeLabels: Record<string, string> = {
  SEUIL_DECLARATION: 'Seuil declaration',
  FRACTIONNEMENT: 'Fractionnement',
  PEP: 'Client PEP',
  PAYS_RISQUE: 'Pays a risque',
  CASH_SUSPECT: 'Cash suspect',
  COMPORTEMENT_INHABITUEL: 'Comportement inhabituel',
};

export default function AmlAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<any>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/aml', { params: { ...filters, page, limit: 20 } });
      setAlerts(res.data.data);
      setTotal(res.data.total);
    } catch { message.error('Erreur chargement alertes'); }
    setLoading(false);
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/aml/stats');
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchAlerts(); fetchStats(); }, [fetchAlerts, fetchStats]);

  const viewDetail = async (id: string) => {
    try {
      const res = await api.get(`/aml/${id}`);
      setSelected(res.data);
      setDetailOpen(true);
    } catch { message.error('Erreur'); }
  };

  const handleUpdateStatus = async (values: any) => {
    if (!selected) return;
    try {
      await api.patch(`/aml/${selected.id}/status`, values);
      message.success('Statut mis a jour');
      setUpdateOpen(false);
      form.resetFields();
      fetchAlerts();
      fetchStats();
      viewDetail(selected.id);
    } catch (e: any) { message.error(e.response?.data?.message || 'Erreur'); }
  };

  const handleReport = async (id: string) => {
    try {
      await api.post(`/aml/${id}/report`);
      message.success('Alerte declaree a l\'ANIF');
      fetchAlerts();
      fetchStats();
      if (selected?.id === id) viewDetail(id);
    } catch (e: any) { message.error(e.response?.data?.message || 'Erreur'); }
  };

  const columns = [
    {
      title: 'Ref', dataIndex: 'reference', key: 'ref', width: 140,
      render: (v: string) => <Text strong copyable={{ text: v }}>{v}</Text>,
    },
    {
      title: 'Type', dataIndex: 'alertType', key: 'type',
      render: (v: string) => <Tag>{typeLabels[v] || v}</Tag>,
    },
    {
      title: 'Risque', dataIndex: 'riskLevel', key: 'risk',
      render: (v: string) => <Tag color={riskColors[v]}>{v}</Tag>,
    },
    {
      title: 'Client', key: 'client',
      render: (_: any, r: any) => r.client
        ? `${r.client.firstName || ''} ${r.client.lastName || r.client.raisonSociale || ''}`
        : '-',
    },
    {
      title: 'Montant', dataIndex: 'amount', key: 'amount',
      render: (v: any) => v ? `${Number(v).toLocaleString()} FCFA` : '-',
    },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={statusColors[v]}>{v.replace(/_/g, ' ')}</Tag>,
    },
    {
      title: 'Date', dataIndex: 'createdAt', key: 'date',
      render: (v: string) => dayjs(v).format('DD/MM/YY HH:mm'),
    },
    {
      title: 'Actions', key: 'actions', width: 180,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewDetail(r.id)} />
          {!r.reportedToAuthority && r.status !== 'CLOSED_FALSE_POSITIVE' && (
            <Popconfirm title="Declarer cette alerte a l'ANIF ?" onConfirm={() => handleReport(r.id)}>
              <Tooltip title="Declarer a l'ANIF">
                <Button size="small" icon={<FileProtectOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
            <AlertOutlined /> LAB/FT - Anti-blanchiment
          </Title>
          <Text type="secondary">Surveillance des operations suspectes - Conformite COBAC/CEMAC</Text>
        </div>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card><Statistic title="Total alertes" value={stats.total} prefix={<AlertOutlined />} /></Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Ouvertes" value={stats.open} valueStyle={{ color: '#f5222d' }}
                prefix={<Badge status="error" />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="En investigation" value={stats.investigating} valueStyle={{ color: '#faad14' }}
                prefix={<SearchOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Escaladees" value={stats.escalated} valueStyle={{ color: '#fa541c' }}
                prefix={<ExclamationCircleOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Declarees ANIF" value={stats.reported} valueStyle={{ color: '#722ed1' }}
                prefix={<FileProtectOutlined />} />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic title="Cloturees" value={(stats.total || 0) - (stats.open || 0) - (stats.investigating || 0) - (stats.escalated || 0)}
                valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
        </Row>
      )}

      <Card style={{ borderRadius: 8, marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select placeholder="Statut" allowClear style={{ width: 180 }}
            onChange={v => setFilters((f: any) => ({ ...f, status: v }))}>
            <Select.Option value="OPEN">Ouvert</Select.Option>
            <Select.Option value="INVESTIGATING">Investigation</Select.Option>
            <Select.Option value="ESCALATED">Escalade</Select.Option>
            <Select.Option value="REPORTED">Declare</Select.Option>
            <Select.Option value="CLOSED_FALSE_POSITIVE">Faux positif</Select.Option>
            <Select.Option value="CLOSED_CONFIRMED">Confirme</Select.Option>
          </Select>
          <Select placeholder="Niveau risque" allowClear style={{ width: 150 }}
            onChange={v => setFilters((f: any) => ({ ...f, riskLevel: v }))}>
            <Select.Option value="LOW">Bas</Select.Option>
            <Select.Option value="MEDIUM">Moyen</Select.Option>
            <Select.Option value="HIGH">Eleve</Select.Option>
            <Select.Option value="CRITICAL">Critique</Select.Option>
          </Select>
          <Select placeholder="Type d'alerte" allowClear style={{ width: 200 }}
            onChange={v => setFilters((f: any) => ({ ...f, alertType: v }))}>
            <Select.Option value="SEUIL_DECLARATION">Seuil declaration</Select.Option>
            <Select.Option value="FRACTIONNEMENT">Fractionnement</Select.Option>
            <Select.Option value="PEP">Client PEP</Select.Option>
            <Select.Option value="CASH_SUSPECT">Cash suspect</Select.Option>
          </Select>
          <Button icon={<SearchOutlined />} onClick={() => { setPage(1); fetchAlerts(); }}>Filtrer</Button>
        </Space>

        <Table
          dataSource={alerts}
          columns={columns}
          loading={loading}
          rowKey="id"
          pagination={{ current: page, total, pageSize: 20, onChange: setPage }}
        />
      </Card>

      {/* Modal detail */}
      <Modal
        title={selected ? <span><AlertOutlined /> Alerte {selected.reference}</span> : 'Detail'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={650}
        footer={
          selected && !selected.reportedToAuthority && selected.status !== 'CLOSED_FALSE_POSITIVE' ? (
            <Space>
              <Button onClick={() => { form.resetFields(); setUpdateOpen(true); }}>Changer statut</Button>
              <Popconfirm title="Declarer cette alerte a l'ANIF ?" onConfirm={() => handleReport(selected.id)}>
                <Button type="primary" danger icon={<FileProtectOutlined />}>Declarer ANIF</Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        {selected && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Reference">{selected.reference}</Descriptions.Item>
            <Descriptions.Item label="Risque">
              <Tag color={riskColors[selected.riskLevel]}>{selected.riskLevel}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{typeLabels[selected.alertType] || selected.alertType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={statusColors[selected.status]}>{selected.status.replace(/_/g, ' ')}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Titre" span={2}>{selected.title}</Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{selected.description}</Descriptions.Item>
            <Descriptions.Item label="Montant">
              {selected.amount ? `${Number(selected.amount).toLocaleString()} FCFA` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Date">{dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Client" span={2}>
              {selected.client
                ? `${selected.client.firstName || ''} ${selected.client.lastName || selected.client.raisonSociale || ''} (${selected.client.clientNumber})`
                : '-'
              }
            </Descriptions.Item>
            {selected.client?.isPEP && (
              <Descriptions.Item label="PEP" span={2}>
                <Tag color="red" icon={<WarningOutlined />}>Personne Politiquement Exposee</Tag>
              </Descriptions.Item>
            )}
            {selected.investigationNotes && (
              <Descriptions.Item label="Notes investigation" span={2}>{selected.investigationNotes}</Descriptions.Item>
            )}
            {selected.resolution && (
              <Descriptions.Item label="Resolution" span={2}>{selected.resolution}</Descriptions.Item>
            )}
            {selected.reportedToAuthority && (
              <Descriptions.Item label="Declare ANIF" span={2}>
                <Tag color="purple" icon={<SafetyOutlined />}>
                  Oui - {selected.reportDate ? dayjs(selected.reportDate).format('DD/MM/YYYY') : ''}
                </Tag>
              </Descriptions.Item>
            )}
            {selected.assignedTo && (
              <Descriptions.Item label="Assigne a" span={2}>
                {selected.assignedTo.firstName} {selected.assignedTo.lastName}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Modal changer statut */}
      <Modal
        title="Mettre a jour le statut"
        open={updateOpen}
        onCancel={() => setUpdateOpen(false)}
        onOk={() => form.submit()}
        okText="Valider"
        width={450}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="Nouveau statut" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="INVESTIGATING">En investigation</Select.Option>
              <Select.Option value="ESCALATED">Escalader</Select.Option>
              <Select.Option value="CLOSED_FALSE_POSITIVE">Cloturer (faux positif)</Select.Option>
              <Select.Option value="CLOSED_CONFIRMED">Cloturer (confirme)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="investigationNotes" label="Notes d'investigation">
            <Input.TextArea rows={3} placeholder="Observations, elements collectes..." />
          </Form.Item>
          <Form.Item name="resolution" label="Resolution (si cloture)">
            <Input.TextArea rows={2} placeholder="Conclusion de l'enquete..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
