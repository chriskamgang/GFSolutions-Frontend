import { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography, Tag, Tooltip, List, Empty, Button as AntButton } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  BankOutlined,
  WalletOutlined,
  SafetyOutlined,
  ApartmentOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CreditCardOutlined,
  FundOutlined,
  AuditOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
  ContainerOutlined,
  DollarOutlined,
  ReconciliationOutlined,
  FileProtectOutlined,
  TrophyOutlined,
  NotificationOutlined,
  AimOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, remainingTime } = useAuth();
  const { canAccessRoute } = usePermissions();
  const [displayTime, setDisplayTime] = useState('');
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications', { params: { targetId: user.id, limit: 8 } }),
        api.get('/notifications/unread-count', { params: { targetId: user.id } }),
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(countRes.data.count || 0);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await api.patch('/notifications/read-all', { targetId: user.id });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  useEffect(() => {
    const updateTimer = () => {
      const expiresIn = parseInt(localStorage.getItem('sessionExpiresIn') || '0');
      const loginAt = parseInt(localStorage.getItem('loginAt') || '0');
      if (!expiresIn || !loginAt) return;
      const elapsed = Math.floor((Date.now() - loginAt) / 1000);
      const remaining = Math.max(0, expiresIn - elapsed);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setDisplayTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [remainingTime]);

  // Auto-ouvrir le sous-menu actif au chargement
  useEffect(() => {
    const path = location.pathname;
    const submenuMap: Record<string, string> = {
      '/clients': 'sub-clients',
      '/companies': 'sub-clients',
      '/accounts': 'sub-operations',
      '/transactions': 'sub-operations',
      '/savings': 'sub-epargne',
      '/credits': 'sub-credits',
      '/treasury': 'sub-compta',
      '/accounting': 'sub-compta',
      '/reports': 'sub-compta',
      '/agencies': 'sub-admin',
      '/users': 'sub-admin',
      '/roles': 'sub-admin',
      '/audit': 'sub-admin',
      '/settings': 'sub-admin',
      '/checkbooks': 'sub-operations',
      '/tontines': 'sub-epargne',
      '/savings-goals': 'sub-epargne',
      '/notifications': 'sub-admin',
      '/callbox': 'sub-admin',
    };
    const key = submenuMap[path];
    if (key && !openKeys.includes(key)) {
      setOpenKeys(prev => [...prev, key]);
    }
  }, [location.pathname]);

  /** Filtre recursif : supprime les items inaccessibles */
  const filterItems = (items: any[]): any[] => {
    return items.map(item => {
      if (item.children) {
        const filtered = filterItems(item.children);
        if (filtered.length === 0) return null;
        return { ...item, children: filtered };
      }
      if (item.key && item.key.startsWith('/')) {
        return canAccessRoute(item.key) ? item : null;
      }
      return item;
    }).filter(Boolean);
  };

  const groupLabel = (label: string) => collapsed ? '' : label;

  const allMenuItems: any[] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tableau de bord',
    },

    // ===== CLIENTELE =====
    {
      type: 'group',
      label: groupLabel('CLIENTELE'),
      children: [
        {
          key: 'sub-clients',
          icon: <TeamOutlined />,
          label: 'Membres',
          children: [
            { key: '/clients', icon: <UserOutlined />, label: 'Personnes physiques' },
            { key: '/companies', icon: <IdcardOutlined />, label: 'Personnes morales' },
          ],
        },
      ],
    },

    // ===== OPERATIONS =====
    {
      type: 'group',
      label: groupLabel('OPERATIONS'),
      children: [
        { key: '/transactions', icon: <DollarOutlined />, label: 'Transactions' },
        { key: '/accounts', icon: <BankOutlined />, label: 'Comptes' },
        { key: '/bill-payments', icon: <ThunderboltOutlined />, label: 'Paiements Factures' },
        { key: '/checkbooks', icon: <FileProtectOutlined />, label: 'Chequiers' },
      ],
    },

    // ===== EPARGNE & PLACEMENTS =====
    {
      type: 'group',
      label: groupLabel('EPARGNE & PLACEMENTS'),
      children: [
        {
          key: 'sub-epargne',
          icon: <WalletOutlined />,
          label: 'Epargne',
          children: [
            { key: '/savings', icon: <ContainerOutlined />, label: 'Cotisations' },
            { key: '/tontines', icon: <TrophyOutlined />, label: 'Tontines / Njangi' },
            { key: '/savings-goals', icon: <AimOutlined />, label: 'Epargne objectif' },
          ],
        },
      ],
    },

    // ===== CREDIT =====
    {
      type: 'group',
      label: groupLabel('CREDIT'),
      children: [
        { key: '/credits', icon: <CreditCardOutlined />, label: 'Gestion des credits' },
      ],
    },

    // ===== COMPTABILITE =====
    {
      type: 'group',
      label: groupLabel('COMPTABILITE'),
      children: [
        {
          key: 'sub-compta',
          icon: <AuditOutlined />,
          label: 'Comptabilite',
          children: [
            { key: '/treasury', icon: <FundOutlined />, label: 'Tresorerie' },
            { key: '/accounting', icon: <ReconciliationOutlined />, label: 'Ecritures & Bilan' },
            { key: '/reports', icon: <BarChartOutlined />, label: 'Rapports & KPIs' },
          ],
        },
      ],
    },

    // ===== ADMINISTRATION =====
    {
      type: 'group',
      label: groupLabel('ADMINISTRATION'),
      children: [
        {
          key: 'sub-admin',
          icon: <SettingOutlined />,
          label: 'Administration',
          children: [
            { key: '/agencies', icon: <ApartmentOutlined />, label: 'Agences' },
            { key: '/users', icon: <UserOutlined />, label: 'Utilisateurs' },
            { key: '/callbox', icon: <ThunderboltOutlined />, label: 'Callbox' },
            { key: '/roles', icon: <SafetyOutlined />, label: 'Roles & Permissions' },
            { key: '/audit', icon: <AuditOutlined />, label: 'Piste d\'audit' },
            { key: '/settings', icon: <SettingOutlined />, label: 'Parametres' },
            { key: '/notifications', icon: <NotificationOutlined />, label: 'Notifications' },
          ],
        },
      ],
    },
  ];

  const menuItems = filterItems(allMenuItems);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  const selectedKey = location.pathname;

  const userMenu = {
    items: [
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Parametres & Securite',
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Deconnexion',
        danger: true,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') logout();
      if (key === 'settings') navigate('/settings');
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="logo-container">
          {collapsed ? (
            <span className="logo-text-collapsed">GFS</span>
          ) : (
            <span className="logo-text">Global Financial Solution</span>
          )}
        </div>

        {!collapsed && user && (
          <div style={{ padding: '8px 16px 16px', textAlign: 'center' }}>
            <Avatar
              size={48}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#F5A623', marginBottom: 8 }}
            />
            <div>
              <Text style={{ color: '#fff', fontSize: 13, display: 'block' }}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={{ color: '#ffffffaa', fontSize: 11 }}>
                {user.role} - {user.agency}
              </Text>
            </div>
          </div>
        )}

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={handleOpenChange}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'all 0.2s' }}>
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {collapsed ? (
              <MenuUnfoldOutlined
                onClick={() => setCollapsed(false)}
                style={{ fontSize: 18, cursor: 'pointer' }}
              />
            ) : (
              <MenuFoldOutlined
                onClick={() => setCollapsed(true)}
                style={{ fontSize: 18, cursor: 'pointer' }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {displayTime && (
              <Tooltip title="Temps restant avant expiration de la session">
                <Tag icon={<ClockCircleOutlined />} color={
                  parseInt(displayTime) <= 5 ? 'red' : parseInt(displayTime) <= 15 ? 'orange' : 'default'
                } style={{ cursor: 'default' }}>
                  {displayTime}
                </Tag>
              </Tooltip>
            )}
            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              dropdownRender={() => (
                <div style={{
                  width: 360, background: '#fff', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: 420, overflow: 'auto',
                }}>
                  <div style={{
                    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <Text strong>Notifications</Text>
                    {unreadCount > 0 && (
                      <AntButton type="link" size="small" onClick={handleMarkAllRead}>
                        Tout marquer lu
                      </AntButton>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <Empty description="Aucune notification" style={{ padding: 24 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <List
                      dataSource={notifications}
                      renderItem={(item: any) => (
                        <List.Item style={{
                          padding: '10px 16px',
                          background: item.isRead ? '#fff' : '#f6f8fa',
                          cursor: 'default',
                        }}>
                          <List.Item.Meta
                            title={<Text strong={!item.isRead} style={{ fontSize: 13 }}>{item.title}</Text>}
                            description={
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>{item.message}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.createdAt).fromNow()}</Text>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              )}
            >
              <Badge count={unreadCount} size="small">
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
              </Badge>
            </Dropdown>

            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1B2A4A' }} />
                <span style={{ fontSize: 13 }}>
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ margin: 24, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
