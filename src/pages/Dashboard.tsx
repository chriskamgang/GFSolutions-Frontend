import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, message } from 'antd';
import {
  ArrowUpOutlined,
  TeamOutlined,
  BankOutlined,
  WalletOutlined,
  TransactionOutlined,
} from '@ant-design/icons';
import { DualAxes, Pie } from '@ant-design/charts';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const fmt = (v: number) => v.toLocaleString('fr-FR');

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [statsRes, trendRes, kpisRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/reports/yearly-trend'),
          api.get('/reports/kpis'),
        ]);
        setStats(statsRes.data);
        setTrend(trendRes.data || []);
        setKpis(kpisRes.data);
      } catch {
        message.error('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Client', dataIndex: 'client', key: 'client' },
    { title: 'Type', dataIndex: 'type', key: 'type',
      render: (type: string) => {
        const colors: Record<string, string> = { DEPOSIT: 'green', WITHDRAWAL: 'red', TRANSFER: 'blue' };
        const labels: Record<string, string> = { DEPOSIT: 'Depot', WITHDRAWAL: 'Retrait', TRANSFER: 'Transfert' };
        return <Tag color={colors[type] || 'default'}>{labels[type] || type}</Tag>;
      },
    },
    { title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount',
      render: (v: number) => fmt(v),
      align: 'right' as const,
    },
    { title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s: string) => (
        <Tag color={s === 'COMPLETED' ? 'green' : 'orange'}>
          {s === 'COMPLETED' ? 'Effectue' : 'En attente'}
        </Tag>
      ),
    },
  ];

  // --- Donnees pour le graphique Evolution 12 mois ---
  const trendChartData = trend.flatMap((m: any) => [
    { mois: m.mois, value: m.depots, type: 'Depots' },
    { mois: m.mois, value: m.retraits, type: 'Retraits' },
  ]);

  const trendClientsData = trend.map((m: any) => ({
    mois: m.mois,
    value: m.nouveauxClients,
    type: 'Nouveaux clients',
  }));

  // --- Donnees pour le graphique Repartition comptes ---
  const accountPieData = kpis ? [
    { type: 'Comptes courants', value: kpis.comptes.totalDepots || 0 },
    { type: 'Epargne', value: kpis.comptes.totalEpargne || 0 },
    { type: 'DAT', value: kpis.comptes.totalDAT || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Tableau de bord</Title>
        <Text type="secondary">Vue d'ensemble de votre microfinance</Text>
      </div>

      {/* Position de tresorerie */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div className="treasury-card blue">
            <WalletOutlined style={{ fontSize: 28, marginBottom: 8 }} />
            <div style={{ fontSize: 11, opacity: 0.8 }}>Depots du mois</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {fmt(stats?.depositsMonth || 0)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>FCFA</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="treasury-card orange">
            <BankOutlined style={{ fontSize: 28, marginBottom: 8 }} />
            <div style={{ fontSize: 11, opacity: 0.8 }}>Retraits du mois</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {fmt(stats?.withdrawalsMonth || 0)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>FCFA</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="treasury-card green">
            <TeamOutlined style={{ fontSize: 28, marginBottom: 8 }} />
            <div style={{ fontSize: 11, opacity: 0.8 }}>Total Clients</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {stats?.totalClients || 0}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>inscrits</div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="treasury-card cyan">
            <TransactionOutlined style={{ fontSize: 28, marginBottom: 8 }} />
            <div style={{ fontSize: 11, opacity: 0.8 }}>Transactions</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {stats?.totalTransactions || 0}
            </div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>operations</div>
          </div>
        </Col>
      </Row>

      {/* Graphiques : Evolution + Repartition */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ color: '#1B2A4A', fontWeight: 600 }}>Evolution des flux — 12 derniers mois</span>}
            size="small"
            style={{ borderRadius: 8 }}
            loading={loading}
          >
            {trendChartData.length > 0 ? (
              <DualAxes
                height={280}
                xField="mois"
                children={[
                  {
                    data: trendChartData,
                    type: 'interval',
                    yField: 'value',
                    colorField: 'type',
                    group: true,
                    style: { maxWidth: 20, radiusTopLeft: 3, radiusTopRight: 3 },
                    axis: { y: { title: 'Montant (FCFA)', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } },
                    scale: { color: { range: ['#52c41a', '#ff4d4f'] } },
                  },
                  {
                    data: trendClientsData,
                    type: 'line',
                    yField: 'value',
                    colorField: 'type',
                    style: { lineWidth: 2 },
                    axis: { y: { position: 'right', title: 'Clients' } },
                    scale: { color: { range: ['#F5A623'] } },
                  },
                ]}
              />
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Pas de donnees disponibles
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ color: '#1B2A4A', fontWeight: 600 }}>Repartition des encours</span>}
            size="small"
            style={{ borderRadius: 8 }}
            loading={loading}
          >
            {accountPieData.length > 0 ? (
              <Pie
                height={280}
                data={accountPieData}
                angleField="value"
                colorField="type"
                innerRadius={0.55}
                scale={{ color: { range: ['#1B2A4A', '#52c41a', '#F5A623'] } }}
                label={{
                  text: (d: any) => `${d.type}\n${fmt(d.value)}`,
                  style: { fontSize: 11 },
                  position: 'outside',
                }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                annotations={[{
                  type: 'text',
                  style: {
                    text: `${fmt(accountPieData.reduce((s, d) => s + d.value, 0))}`,
                    x: '50%', y: '50%',
                    textAlign: 'center', fontSize: 16, fontWeight: 'bold', fill: '#1B2A4A',
                  },
                }]}
              />
            ) : (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                Pas de donnees
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card" loading={loading}>
            <Statistic
              title="Comptes actifs"
              value={stats?.activeAccounts || 0}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card" loading={loading}>
            <Statistic
              title="Total comptes"
              value={stats?.totalAccounts || 0}
              prefix={<BankOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card className="stat-card" loading={loading}>
            <Statistic
              title="Depots ce mois"
              value={stats?.depositsMonth || 0}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              suffix="FCFA"
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Dernieres transactions */}
      <Card title="Dernieres transactions" className="content-card" style={{ padding: 0 }}>
        <Table
          dataSource={stats?.recentTransactions || []}
          columns={columns}
          pagination={false}
          size="small"
          loading={loading}
          rowKey="id"
          locale={{ emptyText: 'Aucune transaction' }}
        />
      </Card>
    </div>
  );
}
