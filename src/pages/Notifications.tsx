import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Tag,
  Badge,
  Button,
  Select,
  message,
  Row,
  Col,
  Space,
  Typography,
  Empty,
  Statistic,
} from 'antd';
import {
  BellOutlined,
  CheckOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title } = Typography;

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  SYSTEM: 'blue',
  SMS: 'green',
  ALERT: 'red',
  EMAIL: 'purple',
};

const typeLabels: Record<string, string> = {
  SYSTEM: 'Systeme',
  SMS: 'SMS',
  ALERT: 'Alerte',
  EMAIL: 'Email',
};

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

  const fetchNotifications = useCallback(async (page = 1, limit = 15) => {
    if (!user) return;
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications', { params: { page, limit } }),
        api.get('/notifications/unread-count'),
      ]);
      const data = notifRes.data.data || notifRes.data || [];
      const total = notifRes.data.total || notifRes.data.meta?.total || data.length;
      setNotifications(data);
      setUnreadCount(countRes.data.count || 0);
      setPagination(prev => ({ ...prev, current: page, total }));
    } catch {
      message.error('Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      message.success('Toutes les notifications ont ete marquees comme lues');
    } catch {
      message.error('Erreur lors de la mise a jour');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      message.error('Erreur lors de la mise a jour');
    }
  };

  const handleTableChange = (pag: any) => {
    fetchNotifications(pag.current, pag.pageSize);
  };

  const filteredNotifications =
    typeFilter === 'ALL'
      ? notifications
      : notifications.filter(n => n.type === typeFilter);

  const todayCount = notifications.filter(n =>
    dayjs(n.createdAt).isSame(dayjs(), 'day')
  ).length;

  const columns = [
    {
      title: 'Statut',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 70,
      align: 'center' as const,
      render: (isRead: boolean) =>
        isRead ? (
          <Badge status="default" />
        ) : (
          <Badge status="processing" color="#F5A623" />
        ),
    },
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Notification) => (
        <span style={{ fontWeight: record.isRead ? 400 : 600 }}>{title}</span>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (msg: string) => (
        <Typography.Text type="secondary" ellipsis style={{ maxWidth: 400 }}>
          {msg}
        </Typography.Text>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => (
        <Tag color={typeColors[type] || 'default'}>
          {typeLabels[type] || type}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => (
        <span title={dayjs(date).format('DD/MM/YYYY HH:mm')}>
          {dayjs(date).fromNow()}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: Notification) =>
        !record.isRead ? (
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleMarkAsRead(record.id);
            }}
          >
            Lire
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        <BellOutlined style={{ marginRight: 8, color: '#F5A623' }} />
        Centre de notifications
      </Title>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total notifications"
              value={pagination.total}
              prefix={<BellOutlined />}
              valueStyle={{ color: '#1B2A4A' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Non lues"
              value={unreadCount}
              valueStyle={{ color: unreadCount > 0 ? '#ff4d4f' : '#1B2A4A' }}
              suffix={
                unreadCount > 0 ? (
                  <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />
                ) : null
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Aujourd'hui"
              value={todayCount}
              valueStyle={{ color: '#F5A623' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Actions */}
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Space wrap>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tous les types' },
                { value: 'SYSTEM', label: 'Systeme' },
                { value: 'SMS', label: 'SMS' },
                { value: 'ALERT', label: 'Alerte' },
                { value: 'EMAIL', label: 'Email' },
              ]}
            />
          </Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            style={{ backgroundColor: '#1B2A4A', borderColor: '#1B2A4A' }}
          >
            Tout marquer comme lu
          </Button>
        </div>

        {filteredNotifications.length === 0 && !loading ? (
          <Empty description="Aucune notification" />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredNotifications}
            rowKey="id"
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} sur ${total}`,
            }}
            onChange={handleTableChange}
            onRow={(record) => ({
              onClick: () => {
                if (!record.isRead) {
                  handleMarkAsRead(record.id);
                }
              },
              style: {
                cursor: record.isRead ? 'default' : 'pointer',
                backgroundColor: record.isRead ? undefined : '#f0f5ff',
              },
            })}
            size="middle"
          />
        )}
      </Card>
    </div>
  );
}
