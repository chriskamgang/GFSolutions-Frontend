import { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Typography, Row, Col, message, Select, Space, Statistic, DatePicker, Input,
} from 'antd';
import {
  AuditOutlined, UserOutlined, SearchOutlined, DownloadOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import api from '../services/api';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState<string | undefined>();

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const params: any = { page: p, limit: 20 };
      if (moduleFilter) params.module = moduleFilter;
      const { data } = await api.get('/audit', { params });
      setLogs(data.data || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch { message.error('Erreur chargement'); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/audit/stats');
      setStats(data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [moduleFilter]);

  const actionColors: Record<string, string> = {
    CREATE: 'green', READ: 'blue', UPDATE: 'orange', DELETE: 'red', LOGIN: 'purple',
  };

  const moduleLabels: Record<string, string> = {
    CLIENTS: 'Clients', ACCOUNTS: 'Comptes', TRANSACTIONS: 'Transactions',
    CREDITS: 'Credits', CONTRIBUTIONS: 'Epargne', COMPANIES: 'Entreprises',
    ACCOUNTING: 'Comptabilite', REPORTS: 'Rapports', AGENCIES: 'Agences',
    USERS: 'Utilisateurs', ROLES: 'Roles', SETTINGS: 'Parametres', AUTH: 'Auth',
  };

  const columns = [
    { title: 'Date', dataIndex: 'createdAt', width: 150,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm:ss'),
    },
    { title: 'Utilisateur', key: 'user', width: 160,
      render: (_: any, r: any) => r.user ? (
        <span><UserOutlined style={{ marginRight: 4 }} />{r.user.firstName} {r.user.lastName}</span>
      ) : '-',
    },
    { title: 'Action', dataIndex: 'action', width: 90,
      render: (v: string) => <Tag color={actionColors[v] || 'default'}>{v}</Tag>,
    },
    { title: 'Module', dataIndex: 'module', width: 120,
      render: (v: string) => <Tag>{moduleLabels[v] || v}</Tag>,
    },
    { title: 'Type entite', dataIndex: 'entityType', width: 100 },
    { title: 'Details', key: 'details', ellipsis: true,
      render: (_: any, r: any) => {
        if (r.newValues?.details) return r.newValues.details;
        if (r.newValues) return JSON.stringify(r.newValues).slice(0, 100);
        return '-';
      },
    },
  ];

  const modules = ['CLIENTS', 'ACCOUNTS', 'TRANSACTIONS', 'CREDITS', 'CONTRIBUTIONS', 'COMPANIES', 'ACCOUNTING', 'AGENCIES', 'USERS', 'ROLES'];

  const exportCols = [
    { title: 'Date', key: 'createdAt', format: (v: any) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Utilisateur', key: 'user', format: (_: any, r: any) => r.user ? `${r.user.firstName} ${r.user.lastName}` : '' },
    { title: 'Action', key: 'action' },
    { title: 'Module', key: 'module' },
    { title: 'Entite', key: 'entityType' },
    { title: 'Details', key: 'newValues', format: (v: any) => v?.details || JSON.stringify(v || '').slice(0, 80) },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}><AuditOutlined /> Piste d'audit</Title>
            <Text type="secondary">Historique complet des actions ({total} enregistrements)</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={() => exportToExcel(logs, exportCols, 'audit')}>Excel</Button>
              <Button icon={<FilePdfOutlined />} onClick={() => exportToPdf({
                title: 'Piste d\'audit', columns: exportCols, data: logs, filename: 'audit', orientation: 'landscape',
              })}>PDF</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={12} lg={6}>
            <Card size="small"><Statistic title="Actions aujourd'hui" value={stats.totalToday} valueStyle={{ color: '#F5A623' }} /></Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card size="small"><Statistic title="Actions cette semaine" value={stats.totalWeek} valueStyle={{ color: '#1B2A4A' }} /></Card>
          </Col>
        </Row>
      )}

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select placeholder="Filtrer par module" allowClear style={{ width: 200 }}
            onChange={v => setModuleFilter(v)} value={moduleFilter}>
            {modules.map(m => (
              <Select.Option key={m} value={m}>{moduleLabels[m] || m}</Select.Option>
            ))}
          </Select>
        </Space>

        <Table
          dataSource={logs}
          columns={columns}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 20,
            showTotal: (t) => `${t} enregistrements`,
            onChange: (p) => fetchLogs(p),
          }}
        />
      </Card>
    </div>
  );
}
