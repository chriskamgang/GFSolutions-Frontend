import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Tabs, Statistic, Tag, Table, Descriptions, DatePicker, Button, Space, message } from 'antd';
import {
  BarChartOutlined, TeamOutlined, BankOutlined, CreditCardOutlined,
  DollarOutlined, SafetyOutlined, RiseOutlined, FileAddOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';
import { Column, Pie, Line } from '@ant-design/charts';
import { DownloadOutlined, FilePdfOutlined } from '@ant-design/icons';
import api from '../services/api';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const fmt = (v: number) => v.toLocaleString('fr-FR');

function KPIsTab() {
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/kpis').then(r => setKpis(r.data)).catch(() => message.error('Erreur chargement KPIs')).finally(() => setLoading(false));
  }, []);

  if (loading || !kpis) return <Card loading={loading} />;

  // Donnees pour le donut credits
  const creditPieData = [
    { type: 'Actifs', value: kpis.credits.actifs || 0 },
    { type: 'En attente', value: kpis.credits.enAttente || 0 },
    { type: 'Impayes', value: kpis.credits.impayes || 0 },
  ].filter(d => d.value > 0);

  // Donnees pour le bar activite du mois
  const activiteData = [
    { type: 'Depots', value: kpis.activiteMois?.depots || 0 },
    { type: 'Retraits', value: kpis.activiteMois?.retraits || 0 },
    { type: 'Frais percus', value: kpis.activiteMois?.fraisPercus || 0 },
  ];

  return (
    <div>
      {/* Clientele */}
      <Text strong style={{ color: '#1B2A4A', fontSize: 14, display: 'block', marginBottom: 12 }}>
        <TeamOutlined /> Clientele
      </Text>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card size="small" className="stat-card">
            <Statistic title="Total clients" value={kpis.clientele.totalClients} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small" className="stat-card">
            <Statistic title="Clients actifs" value={kpis.clientele.activeClients} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small" className="stat-card">
            <Statistic title="Nouveaux (mois)" value={kpis.clientele.newClientsMonth} valueStyle={{ color: '#F5A623' }} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card size="small" className="stat-card">
            <Statistic title="Taux d'activite" value={kpis.clientele.tauxActivite} />
          </Card>
        </Col>
      </Row>

      {/* Depots + Activite du mois (graphique) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Text strong style={{ color: '#1B2A4A', fontSize: 14, display: 'block', marginBottom: 12 }}>
            <BankOutlined /> Depots & Epargne
          </Text>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="Comptes courants" value={kpis.comptes.totalDepots} suffix="FCFA" valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="Epargne" value={kpis.comptes.totalEpargne} suffix="FCFA" valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="DAT" value={kpis.comptes.totalDAT} suffix="FCFA" valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="Total engage" value={kpis.comptes.totalEngage} suffix="FCFA" valueStyle={{ fontSize: 14, color: '#1B2A4A', fontWeight: 700 }} />
              </Card>
            </Col>
          </Row>
        </Col>
        <Col xs={24} lg={12}>
          <Text strong style={{ color: '#1B2A4A', fontSize: 14, display: 'block', marginBottom: 12 }}>
            <DollarOutlined /> Activite du mois
          </Text>
          <Card size="small" style={{ borderRadius: 8 }}>
            {activiteData.some(d => d.value > 0) ? (
              <Column
                height={180}
                data={activiteData}
                xField="type"
                yField="value"
                colorField="type"
                scale={{ color: { range: ['#52c41a', '#ff4d4f', '#F5A623'] } }}
                style={{ radiusTopLeft: 4, radiusTopRight: 4 }}
                axis={{ y: { labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
                label={{ text: (d: any) => fmt(d.value), position: 'inside', style: { fill: '#fff', fontSize: 11, fontWeight: 600 } }}
                legend={false}
              />
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Aucune activite</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Credits (KPI + donut) */}
      <Text strong style={{ color: '#1B2A4A', fontSize: 14, display: 'block', marginBottom: 12 }}>
        <CreditCardOutlined /> Credits
      </Text>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="Credits actifs" value={kpis.credits.actifs} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="En attente" value={kpis.credits.enAttente} valueStyle={{ color: '#F5A623' }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="Encours credits" value={kpis.credits.encours} suffix="FCFA" valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="stat-card">
                <Statistic title="PAR > 30j" value={kpis.credits.par30}
                  valueStyle={{ color: parseFloat(kpis.credits.par30) > 5 ? '#ff4d4f' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
        </Col>
        <Col xs={24} lg={12}>
          <Card size="small" style={{ borderRadius: 8 }}>
            {creditPieData.length > 0 ? (
              <Pie
                height={200}
                data={creditPieData}
                angleField="value"
                colorField="type"
                innerRadius={0.5}
                scale={{ color: { range: ['#52c41a', '#F5A623', '#ff4d4f'] } }}
                label={{ text: (d: any) => `${d.type}: ${d.value}`, position: 'outside', style: { fontSize: 11 } }}
                legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
              />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Aucun credit</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Ratios prudentiels COBAC */}
      <Text strong style={{ color: '#1B2A4A', fontSize: 14, display: 'block', marginBottom: 12 }}>
        <SafetyOutlined /> Ratios prudentiels COBAC
      </Text>
      <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #1B2A4A' }}>
        <Descriptions column={{ xs: 1, sm: 2, lg: 4 }} size="small">
          <Descriptions.Item label="Ratio de liquidite">
            <Tag color="blue">{kpis.ratiosPrudentiels.ratioLiquidite}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Credits / Depots">
            <Tag color="orange">{kpis.ratiosPrudentiels.ratioCreditsDepots}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="PAR > 30 jours">
            <Tag color={parseFloat(kpis.ratiosPrudentiels.par30) > 5 ? 'red' : 'green'}>
              {kpis.ratiosPrudentiels.par30}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Taux impayes">
            <Tag color={parseFloat(kpis.ratiosPrudentiels.tauxImpayes) > 5 ? 'red' : 'green'}>
              {kpis.ratiosPrudentiels.tauxImpayes}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

function RapportMensuelTab() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/monthly').then(r => setReport(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || !report) return <Card loading={loading} />;

  // Donnees pour le graphique
  const transData = [
    { type: 'Depots', count: report.transactions.depots.count, montant: report.transactions.depots.montant },
    { type: 'Retraits', count: report.transactions.retraits.count, montant: report.transactions.retraits.montant },
    { type: 'Transferts', count: report.transactions.transferts.count, montant: report.transactions.transferts.montant },
  ];

  return (
    <div>
      <Title level={5} style={{ color: '#1B2A4A' }}>Rapport du mois : {report.periode}</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card title="Clientele" size="small" style={{ borderRadius: 8 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Nouveaux clients">{report.clientele.nouveauxClients}</Descriptions.Item>
              <Descriptions.Item label="Nouveaux comptes">{report.clientele.nouveauxComptes}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Transactions" size="small" style={{ borderRadius: 8 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Depots">{fmt(report.transactions.depots.montant)} FCFA ({report.transactions.depots.count})</Descriptions.Item>
              <Descriptions.Item label="Retraits">{fmt(report.transactions.retraits.montant)} FCFA ({report.transactions.retraits.count})</Descriptions.Item>
              <Descriptions.Item label="Transferts">{fmt(report.transactions.transferts.montant)} FCFA ({report.transactions.transferts.count})</Descriptions.Item>
              <Descriptions.Item label="Total operations">{report.transactions.total}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Revenus & Credits" size="small" style={{ borderRadius: 8 }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Frais percus">{fmt(report.revenus.frais)} FCFA</Descriptions.Item>
              <Descriptions.Item label="TVA collectee">{fmt(report.revenus.tva)} FCFA</Descriptions.Item>
              <Descriptions.Item label="Credits decaisses">{fmt(report.credits.montantDecaisse)} FCFA</Descriptions.Item>
              <Descriptions.Item label="Remboursements">{fmt(report.credits.remboursementsRecus)} FCFA</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Graphique transactions du mois */}
      <Card title="Volume des transactions" size="small" style={{ borderRadius: 8 }}>
        <Column
          height={250}
          data={transData}
          xField="type"
          yField="montant"
          colorField="type"
          scale={{ color: { range: ['#52c41a', '#ff4d4f', '#1890ff'] } }}
          style={{ radiusTopLeft: 4, radiusTopRight: 4, maxWidth: 60 }}
          axis={{ y: { title: 'Montant (FCFA)', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
          label={{
            text: (d: any) => `${fmt(d.montant)}\n(${d.count} ops)`,
            position: 'inside',
            style: { fill: '#fff', fontSize: 11, fontWeight: 600 },
          }}
          legend={false}
        />
      </Card>
    </div>
  );
}

function EvolutionTab() {
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/yearly-trend').then(r => setTrend(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Donnees pour les graphiques
  const barData = trend.flatMap((m: any) => [
    { mois: m.mois, value: m.depots, type: 'Depots' },
    { mois: m.mois, value: m.retraits, type: 'Retraits' },
  ]);

  const lineData = trend.map((m: any) => ({
    mois: m.mois,
    clients: m.nouveauxClients,
  }));

  const netData = trend.map((m: any) => ({
    mois: m.mois,
    value: m.depots - m.retraits,
  }));

  return (
    <div>
      {/* Graphique barres depots vs retraits */}
      <Card title="Depots vs Retraits — Evolution 12 mois" size="small" style={{ borderRadius: 8, marginBottom: 16 }}>
        {barData.length > 0 ? (
          <Column
            height={300}
            data={barData}
            xField="mois"
            yField="value"
            colorField="type"
            group={true}
            scale={{ color: { range: ['#52c41a', '#ff4d4f'] } }}
            style={{ radiusTopLeft: 3, radiusTopRight: 3 }}
            axis={{ y: { title: 'Montant (FCFA)', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
            legend={{ color: { position: 'top' } }}
          />
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Pas de donnees</div>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Solde net mensuel */}
        <Col xs={24} lg={12}>
          <Card title="Solde net mensuel (Depots - Retraits)" size="small" style={{ borderRadius: 8 }}>
            {netData.length > 0 ? (
              <Line
                height={220}
                data={netData}
                xField="mois"
                yField="value"
                style={{ lineWidth: 2, stroke: '#1B2A4A' }}
                point={{ style: { fill: '#1B2A4A', r: 3 } }}
                axis={{ y: { title: 'FCFA', labelFormatter: (v: number) => `${(v / 1000).toFixed(0)}K` } }}
              />
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Pas de donnees</div>
            )}
          </Card>
        </Col>
        {/* Nouveaux clients par mois */}
        <Col xs={24} lg={12}>
          <Card title="Nouveaux clients par mois" size="small" style={{ borderRadius: 8 }}>
            {lineData.length > 0 ? (
              <Column
                height={220}
                data={lineData}
                xField="mois"
                yField="clients"
                style={{ fill: '#F5A623', radiusTopLeft: 4, radiusTopRight: 4 }}
                axis={{ y: { title: 'Clients' } }}
                label={{ text: 'clients', position: 'inside', style: { fill: '#fff', fontSize: 11, fontWeight: 600 } }}
              />
            ) : (
              <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Pas de donnees</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tableau de details (conserve) */}
      <Card title="Donnees detaillees" size="small" style={{ borderRadius: 8 }}
        extra={
          <Space>
            <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(trend, [
              { title: 'Mois', key: 'mois' },
              { title: 'Depots (FCFA)', key: 'depots', format: (v: any) => Number(v).toLocaleString('fr-FR') },
              { title: 'Retraits (FCFA)', key: 'retraits', format: (v: any) => Number(v).toLocaleString('fr-FR') },
              { title: 'Solde net', key: 'depots', format: (_: any, r: any) => (r.depots - r.retraits).toLocaleString('fr-FR') },
              { title: 'Nouveaux clients', key: 'nouveauxClients' },
            ], 'evolution_12_mois')}>Excel</Button>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
              title: 'Evolution 12 mois', columns: [
                { title: 'Mois', key: 'mois' },
                { title: 'Depots (FCFA)', key: 'depots', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                { title: 'Retraits (FCFA)', key: 'retraits', format: (v: any) => Number(v).toLocaleString('fr-FR') },
                { title: 'Solde net', key: 'depots', format: (_: any, r: any) => (r.depots - r.retraits).toLocaleString('fr-FR') },
                { title: 'Nouveaux clients', key: 'nouveauxClients' },
              ], data: trend, filename: 'evolution_12_mois',
            })}>PDF</Button>
          </Space>
        }>
        <Table
          dataSource={trend}
          columns={[
            { title: 'Mois', dataIndex: 'mois', key: 'mois' },
            { title: 'Depots (FCFA)', dataIndex: 'depots', key: 'dep', render: (v: number) => fmt(v), align: 'right' as const },
            { title: 'Retraits (FCFA)', dataIndex: 'retraits', key: 'ret', render: (v: number) => fmt(v), align: 'right' as const },
            { title: 'Solde net', key: 'net',
              render: (_: any, r: any) => {
                const net = r.depots - r.retraits;
                return <span style={{ color: net >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>{fmt(net)} FCFA</span>;
              },
              align: 'right' as const,
            },
            { title: 'Nouveaux clients', dataIndex: 'nouveauxClients', key: 'nc', align: 'center' as const },
          ]}
          loading={loading}
          rowKey="mois"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}

function OuverturesComptesTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/reports/account-openings';
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      if (params.length) url += '?' + params.join('&');
      const { data: res } = await api.get(url);
      setData(res);
    } catch { message.error('Erreur chargement rapport'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const columns = [
    { title: 'Date', dataIndex: 'dateOuverture', render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'), width: 140 },
    { title: 'N° Compte', dataIndex: 'accountNumber', width: 180 },
    { title: 'Client', dataIndex: 'client' },
    { title: 'N° Client', dataIndex: 'clientNumber', width: 140 },
    { title: 'Produit', dataIndex: 'produit', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Frais percus', dataIndex: 'fraisOuverture', align: 'right' as const,
      render: (v: number) => v > 0 ? <span style={{ color: '#389e0d', fontWeight: 600 }}>{fmt(v)} FCFA</span> : '-',
    },
    { title: 'Solde initial', dataIndex: 'solde', align: 'right' as const,
      render: (v: number) => `${fmt(v)} FCFA`,
    },
    { title: 'Agence', dataIndex: 'agence', width: 120 },
  ];

  // Pie repartition par produit
  const produitPieData = data?.parProduit?.map((p: any) => ({
    type: p.productName, value: p.count,
  })) || [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker format="DD/MM/YYYY" onChange={(dates) => setDateRange(dates as any)} />
        <Button type="primary" onClick={fetchReport}>Filtrer</Button>
      </Space>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #1B2A4A' }}>
                <Statistic title="Comptes ouverts" value={data.totalComptesOuverts}
                  prefix={<FileAddOutlined />} valueStyle={{ color: '#1B2A4A' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #389e0d' }}>
                <Statistic title="Total frais collectes" value={data.totalFraisCollectes}
                  suffix="FCFA" prefix={<DollarOutlined />}
                  valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #F5A623' }}>
                <Statistic title="Frais moyen / compte"
                  value={data.totalComptesOuverts > 0 ? Math.round(data.totalFraisCollectes / data.totalComptesOuverts) : 0}
                  suffix="FCFA" valueStyle={{ color: '#F5A623' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
          </Row>

          {/* Repartition par produit - graphique + tableau */}
          {data.parProduit?.length > 0 && (
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} lg={12}>
                <Card size="small" title="Repartition par produit" style={{ borderRadius: 8 }}>
                  <Table dataSource={data.parProduit} rowKey="productName" pagination={false} size="small"
                    columns={[
                      { title: 'Produit', dataIndex: 'productName' },
                      { title: 'Nb comptes', dataIndex: 'count', align: 'center' as const },
                      { title: 'Frais collectes', dataIndex: 'fees', align: 'right' as const,
                        render: (v: number) => <strong>{fmt(v)} FCFA</strong>,
                      },
                    ]}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card size="small" title="Repartition visuelle" style={{ borderRadius: 8 }}>
                  {produitPieData.length > 0 ? (
                    <Pie
                      height={200}
                      data={produitPieData}
                      angleField="value"
                      colorField="type"
                      innerRadius={0.5}
                      label={{ text: (d: any) => `${d.type}: ${d.value}`, position: 'outside', style: { fontSize: 11 } }}
                      legend={{ color: { position: 'bottom', layout: { justifyContent: 'center' } } }}
                    />
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Pas de donnees</div>
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* Detail */}
          <Table dataSource={data.details} columns={columns} loading={loading} rowKey="id" size="small"
            pagination={{ pageSize: 15 }} />
        </>
      )}
    </div>
  );
}

function RapportCOBACTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/cobac')
      .then(r => setData(r.data))
      .catch(() => message.error('Erreur chargement rapport COBAC'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return <Card loading={loading} />;

  const r = data.ratiosPrudentiels;
  const sp = data.situationPatrimoniale;
  const qp = data.qualitePortefeuille;
  const ex = data.exploitation;

  const ratiosList = Object.values(r) as any[];

  const conformeColor = data.conformiteGlobale ? '#52c41a' : '#cf1322';

  const exportAllPdf = () => {
    const ratiosData = ratiosList.map((rt: any) => ({
      indicateur: rt.label,
      description: rt.description,
      valeur: `${rt.valeur.toFixed(1)}%`,
      norme: `${rt.comparaison} ${rt.norme}%`,
      statut: rt.conforme ? 'CONFORME' : 'NON CONFORME',
    }));

    const patrimoineData = [
      { poste: 'Tresorerie (Caisse + Banque)', montant: sp.tresorerie },
      { poste: 'Depots courants', montant: sp.depotsCourants },
      { poste: 'Epargne', montant: sp.epargne },
      { poste: 'Depots a terme (DAT)', montant: sp.dat },
      { poste: 'Total depots clients', montant: sp.totalDepotsClients },
      { poste: 'Encours credits', montant: sp.encourCredits },
      { poste: 'Fonds propres', montant: sp.fondsPropres },
    ];

    const parData = [
      { tranche: 'PAR > 30 jours', montant: qp.par30.montant, taux: `${qp.par30.taux.toFixed(1)}%` },
      { tranche: 'PAR > 90 jours', montant: qp.par90.montant, taux: `${qp.par90.taux.toFixed(1)}%` },
      { tranche: 'PAR > 180 jours', montant: qp.par180.montant, taux: `${qp.par180.taux.toFixed(1)}%` },
      { tranche: 'PAR > 360 jours', montant: qp.par360.montant, taux: `${qp.par360.taux.toFixed(1)}%` },
    ];

    // Export multi-sections en PDF
    exportToPdf({
      title: 'RAPPORT REGLEMENTAIRE COBAC / CEMAC',
      subtitle: `Exercice ${data.exercice} — Genere le ${dayjs(data.dateGeneration).format('DD/MM/YYYY HH:mm')} — Conformite : ${data.scoreConformite}`,
      columns: [
        { title: 'Indicateur', key: 'indicateur' },
        { title: 'Formule', key: 'description' },
        { title: 'Valeur', key: 'valeur' },
        { title: 'Norme COBAC', key: 'norme' },
        { title: 'Statut', key: 'statut' },
      ],
      data: [
        ...ratiosData,
        { indicateur: '', description: '', valeur: '', norme: '', statut: '' },
        { indicateur: 'SITUATION PATRIMONIALE', description: '', valeur: 'Montant (FCFA)', norme: '', statut: '' },
        ...patrimoineData.map(p => ({
          indicateur: p.poste,
          description: '',
          valeur: fmt(p.montant),
          norme: '',
          statut: '',
        })),
        { indicateur: '', description: '', valeur: '', norme: '', statut: '' },
        { indicateur: 'QUALITE PORTEFEUILLE', description: '', valeur: 'Montant', norme: 'Taux', statut: '' },
        ...parData.map(p => ({
          indicateur: p.tranche,
          description: '',
          valeur: fmt(p.montant),
          norme: p.taux,
          statut: '',
        })),
      ],
      filename: `rapport_cobac_${data.exercice}`,
      orientation: 'landscape',
      summary: [
        { label: 'Conformite', value: data.scoreConformite },
        { label: 'Fonds propres', value: `${fmt(sp.fondsPropres)} FCFA` },
        { label: 'Encours credits', value: `${fmt(sp.encourCredits)} FCFA` },
        { label: 'Resultat net', value: `${fmt(ex.resultatNet)} FCFA` },
      ],
    });
  };

  return (
    <div>
      {/* En-tete avec conformite globale */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderLeft: `4px solid ${conformeColor}`, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: conformeColor }}>
              {data.scoreConformite}
            </div>
            <div style={{ fontSize: 12 }}>Ratios conformes</div>
            <Tag color={data.conformiteGlobale ? 'green' : 'red'} style={{ marginTop: 4 }}>
              {data.conformiteGlobale ? 'CONFORME COBAC' : 'NON CONFORME'}
            </Tag>
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Fonds propres" value={sp.fondsPropres} suffix="FCFA"
              valueStyle={{ fontSize: 13 }} formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Depots clients" value={sp.totalDepotsClients} suffix="FCFA"
              valueStyle={{ fontSize: 13 }} formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Encours credits" value={sp.encourCredits} suffix="FCFA"
              valueStyle={{ fontSize: 13 }} formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={3}>
          <Card size="small">
            <Statistic title="Resultat net" value={ex.resultatNet} suffix="FCFA"
              valueStyle={{ fontSize: 13, color: ex.resultatNet >= 0 ? '#52c41a' : '#cf1322' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={3} style={{ display: 'flex', alignItems: 'center' }}>
          <Button type="primary" icon={<FilePdfOutlined />} onClick={exportAllPdf} block danger>
            Export COBAC PDF
          </Button>
        </Col>
      </Row>

      {/* Ratios prudentiels */}
      <Card title={<span style={{ color: '#1B2A4A' }}><SafetyOutlined /> Ratios prudentiels COBAC</span>}
        size="small" style={{ marginBottom: 16 }}
        styles={{ header: { background: '#f6f9fc' } }}>
        <Row gutter={[12, 12]}>
          {ratiosList.map((ratio: any, idx: number) => (
            <Col span={8} key={idx}>
              <Card size="small"
                style={{
                  borderLeft: `4px solid ${ratio.conforme ? '#52c41a' : '#cf1322'}`,
                  background: ratio.conforme ? '#f6ffed' : '#fff2f0',
                }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Text strong style={{ fontSize: 13 }}>{ratio.label}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>{ratio.description}</Text>
                  </Col>
                  <Col style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', color: ratio.conforme ? '#52c41a' : '#cf1322' }}>
                      {ratio.valeur.toFixed(1)}%
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Norme : {ratio.comparaison} {ratio.norme}%
                    </Text>
                  </Col>
                </Row>
                <Tag color={ratio.conforme ? 'green' : 'red'} style={{ marginTop: 6 }}>
                  {ratio.conforme ? 'CONFORME' : 'NON CONFORME'}
                </Tag>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Situation patrimoniale + Qualite portefeuille */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="Situation patrimoniale" size="small">
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Tresorerie (Caisse + Banque)">
                <strong>{fmt(sp.tresorerie)} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Depots courants">{fmt(sp.depotsCourants)} FCFA</Descriptions.Item>
              <Descriptions.Item label="Epargne">{fmt(sp.epargne)} FCFA</Descriptions.Item>
              <Descriptions.Item label="DAT">{fmt(sp.dat)} FCFA</Descriptions.Item>
              <Descriptions.Item label="Total depots clients">
                <strong style={{ color: '#1B2A4A' }}>{fmt(sp.totalDepotsClients)} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Encours credits">
                <strong>{fmt(sp.encourCredits)} FCFA</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Fonds propres">
                <strong style={{ color: '#52c41a' }}>{fmt(sp.fondsPropres)} FCFA</strong>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Qualite du portefeuille de credits" size="small">
            <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
              <Col span={8}>
                <Statistic title="Credits actifs" value={qp.creditsActifs} valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={8}>
                <Statistic title="En attente" value={qp.creditsPending} valueStyle={{ fontSize: 16, color: '#F5A623' }} />
              </Col>
              <Col span={8}>
                <Statistic title="En defaut" value={qp.creditsDefaulted} valueStyle={{ fontSize: 16, color: '#cf1322' }} />
              </Col>
            </Row>
            <Table
              dataSource={[
                { tranche: 'PAR > 30 jours', ...qp.par30, norme: '< 5%' },
                { tranche: 'PAR > 90 jours', ...qp.par90, norme: '< 3%' },
                { tranche: 'PAR > 180 jours', ...qp.par180, norme: '< 2%' },
                { tranche: 'PAR > 360 jours', ...qp.par360, norme: '< 1%' },
              ]}
              rowKey="tranche"
              pagination={false}
              size="small"
              columns={[
                { title: 'Tranche', dataIndex: 'tranche' },
                { title: 'Montant', dataIndex: 'montant', align: 'right' as const,
                  render: (v: number) => `${fmt(v)} FCFA`,
                },
                { title: 'Taux', dataIndex: 'taux', align: 'right' as const,
                  render: (v: number) => (
                    <strong style={{ color: v > 5 ? '#cf1322' : '#52c41a' }}>{v.toFixed(1)}%</strong>
                  ),
                },
                { title: 'Norme', dataIndex: 'norme', align: 'center' as const },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Exploitation */}
      <Card size="small">
        <Row gutter={16} justify="center">
          <Col span={8}>
            <Statistic title="Total Produits" value={ex.totalProduits} suffix="FCFA"
              valueStyle={{ color: '#F5A623' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Col>
          <Col span={8}>
            <Statistic title="Total Charges" value={ex.totalCharges} suffix="FCFA"
              valueStyle={{ color: '#cf1322' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Col>
          <Col span={8}>
            <Statistic title="Resultat Net" value={ex.resultatNet} suffix="FCFA"
              valueStyle={{ color: ex.resultatNet >= 0 ? '#52c41a' : '#cf1322', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Col>
        </Row>
      </Card>
    </div>
  );
}

// ==================== PROVISIONNEMENT COBAC ====================
function ProvisionnementTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/provisioning')
      .then(res => setData(res.data))
      .catch(() => message.error('Erreur chargement provisionnement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>;
  if (!data) return <div>Aucune donnee</div>;

  const tiers = [
    { label: 'Saines (1%)', key: 'saines', color: 'green' },
    { label: 'Pre-douteuses (25%)', key: 'preDouteuses', color: 'gold' },
    { label: 'Douteuses (50%)', key: 'douteuses', color: 'orange' },
    { label: 'Contentieuses (75%)', key: 'contentieuses', color: 'volcano' },
    { label: 'Compromises (100%)', key: 'compromises', color: 'red' },
  ];

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card><Statistic title="Encours total credits" value={data.totalOutstanding} suffix="FCFA" formatter={(v: any) => fmt(Number(v))} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Provision totale requise" value={data.totalProvision} suffix="FCFA" valueStyle={{ color: '#f5222d' }} formatter={(v: any) => fmt(Number(v))} /></Card>
        </Col>
        <Col span={8}>
          <Card><Statistic title="Taux de provisionnement" value={data.provisionRate} suffix="%" precision={2} /></Card>
        </Col>
      </Row>

      <Table
        dataSource={tiers.map(t => ({
          key: t.key,
          category: t.label,
          count: data.tiers?.[t.key]?.count || 0,
          outstanding: data.tiers?.[t.key]?.outstanding || 0,
          provision: data.tiers?.[t.key]?.provision || 0,
          color: t.color,
        }))}
        columns={[
          { title: 'Classification', dataIndex: 'category', render: (v: string, r: any) => <Tag color={r.color}>{v}</Tag> },
          { title: 'Nombre credits', dataIndex: 'count', align: 'right' as const },
          { title: 'Encours (FCFA)', dataIndex: 'outstanding', align: 'right' as const, render: (v: number) => fmt(v) },
          { title: 'Provision (FCFA)', dataIndex: 'provision', align: 'right' as const, render: (v: number) => <Text type="danger">{fmt(v)}</Text> },
        ]}
        pagination={false}
        size="small"
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}><Text strong>TOTAL</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right"><Text strong>{tiers.reduce((s, t) => s + (data.tiers?.[t.key]?.count || 0), 0)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right"><Text strong>{fmt(data.totalOutstanding || 0)}</Text></Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right"><Text strong type="danger">{fmt(data.totalProvision || 0)}</Text></Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </div>
  );
}

// ==================== TAFIRE ====================
function TafireTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(dayjs().year());

  const fetchTafire = () => {
    setLoading(true);
    api.get('/reports/tafire', { params: { year } })
      .then(res => setData(res.data))
      .catch(() => message.error('Erreur chargement TAFIRE'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTafire(); }, [year]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>;
  if (!data) return <div>Aucune donnee</div>;

  const sections = [
    { title: 'A. Flux de tresorerie d\'exploitation', key: 'exploitation', color: '#1B2A4A' },
    { title: 'B. Flux de tresorerie d\'investissement', key: 'investissement', color: '#2196F3' },
    { title: 'C. Flux de tresorerie de financement', key: 'financement', color: '#F5A623' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Text strong>Exercice :</Text>
        <DatePicker picker="year" value={dayjs().year(year)} onChange={d => d && setYear(d.year())} />
        <Button icon={<DownloadOutlined />} onClick={() => {
          const rows = sections.flatMap(s => [
            { Rubrique: s.title, Montant: '' },
            ...(data[s.key]?.items || []).map((item: any) => ({ Rubrique: `  ${item.label}`, Montant: item.amount })),
            { Rubrique: `TOTAL ${s.title}`, Montant: data[s.key]?.total || 0 },
            { Rubrique: '', Montant: '' },
          ]);
          rows.push({ Rubrique: 'Tresorerie ouverture', Montant: data.tresorerieOuverture || 0 });
          rows.push({ Rubrique: 'Variation nette', Montant: data.variationNette || 0 });
          rows.push({ Rubrique: 'Tresorerie cloture', Montant: data.tresorerieCloture || 0 });
          exportToExcel(rows, [
            { title: 'Rubrique', key: 'Rubrique' },
            { title: 'Montant', key: 'Montant' },
          ], `TAFIRE_${year}`);
        }}>Export Excel</Button>
      </Space>

      {sections.map(s => (
        <Card key={s.key} size="small" title={<Text strong style={{ color: s.color }}>{s.title}</Text>} style={{ marginBottom: 12 }}>
          <Table
            dataSource={(data[s.key]?.items || []).map((item: any, i: number) => ({ key: i, ...item }))}
            columns={[
              { title: 'Rubrique', dataIndex: 'label' },
              { title: 'Montant (FCFA)', dataIndex: 'amount', align: 'right' as const, render: (v: number) => fmt(v) },
            ]}
            pagination={false}
            size="small"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}><Text strong>TOTAL</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right"><Text strong>{fmt(data[s.key]?.total || 0)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Card>
      ))}

      <Card size="small" style={{ marginTop: 12 }}>
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label={<Text strong>Tresorerie en debut d'exercice</Text>}>{fmt(data.tresorerieOuverture || 0)} FCFA</Descriptions.Item>
          <Descriptions.Item label={<Text strong>Variation nette de tresorerie</Text>}>
            <Text type={data.variationNette >= 0 ? 'success' : 'danger'}>{fmt(data.variationNette || 0)} FCFA</Text>
          </Descriptions.Item>
          <Descriptions.Item label={<Text strong>Tresorerie en fin d'exercice</Text>}>
            <Text strong style={{ fontSize: 16 }}>{fmt(data.tresorerieCloture || 0)} FCFA</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Depot', WITHDRAWAL: 'Retrait', TRANSFER: 'Transfert',
  EXTERNAL_TRANSFER: 'Virement externe', FEE: 'Frais', SALARY_PAYMENT: 'Salaire',
  LOAN_DISBURSEMENT: 'Decaissement', LOAN_REPAYMENT: 'Remboursement',
  CONTRIBUTION_PAYMENT: 'Cotisation', INTEREST: 'Interet',
};

const ACCT_TYPE_LABELS: Record<string, string> = {
  SALARY: 'Salaire', CURRENT: 'Courant', SAVINGS: 'Epargne', DAT: 'DAT',
  COLLECTE: 'Collecte', JOINT: 'Joint', SCOLARITE: 'Scolarite',
};

function FraisPercusTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<[any, any]>([dayjs().startOf('month'), dayjs()]);

  const fetchData = (start?: string, end?: string) => {
    setLoading(true);
    const params: any = {};
    if (start) params.startDate = start;
    if (end) params.endDate = end;
    api.get('/reports/fees', { params })
      .then(r => setData(r.data))
      .catch(() => message.error('Erreur chargement rapport frais'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(dates[0]?.format('YYYY-MM-DD'), dates[1]?.format('YYYY-MM-DD'));
  }, []);

  const handleSearch = () => {
    fetchData(dates[0]?.format('YYYY-MM-DD'), dates[1]?.format('YYYY-MM-DD'));
  };

  const handleExportPdf = () => {
    if (!data?.details?.length) return;
    exportToPdf({
      title: 'Rapport des Frais Percus',
      subtitle: `Periode: ${dayjs(data.period.start).format('DD/MM/YYYY')} - ${dayjs(data.period.end).format('DD/MM/YYYY')}`,
      filename: 'Rapport_Frais',
      orientation: 'landscape',
      summary: [
        { label: 'Total transactions', value: String(data.summary.totalTransactions) },
        { label: 'Frais percus', value: `${fmt(data.summary.totalFees)} FCFA` },
        { label: 'Taxes (TVA)', value: `${fmt(data.summary.totalTax)} FCFA` },
        { label: 'Total general', value: `${fmt(data.summary.grandTotal)} FCFA` },
      ],
      columns: [
        { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
        { title: 'Reference', key: 'reference' },
        { title: 'Type', key: 'type', format: (v: string) => TYPE_LABELS[v] || v },
        { title: 'Client', key: 'clientName' },
        { title: 'N° Compte', key: 'accountNumber' },
        { title: 'Type Compte', key: 'accountType', format: (v: string) => ACCT_TYPE_LABELS[v] || v },
        { title: 'Montant (FCFA)', key: 'amount', format: (v: number) => fmt(v) },
        { title: 'Frais (FCFA)', key: 'fees', format: (v: number) => fmt(v) },
        { title: 'Taxes (FCFA)', key: 'tax', format: (v: number) => fmt(v) },
        { title: 'Total Frais', key: 'totalFees', format: (v: number) => fmt(v) },
      ],
      data: data.details,
    });
  };

  const handleExportExcel = () => {
    if (!data?.details?.length) return;
    exportToExcel(data.details, [
      { title: 'Date', key: 'date', format: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
      { title: 'Reference', key: 'reference' },
      { title: 'Type', key: 'type', format: (v: string) => TYPE_LABELS[v] || v },
      { title: 'Client', key: 'clientName' },
      { title: 'N° Compte', key: 'accountNumber' },
      { title: 'Type Compte', key: 'accountType', format: (v: string) => ACCT_TYPE_LABELS[v] || v },
      { title: 'Montant', key: 'amount' },
      { title: 'Frais', key: 'fees' },
      { title: 'Taxes', key: 'tax' },
      { title: 'Total Frais', key: 'totalFees' },
    ], 'Rapport_Frais');
  };

  const detailColumns = [
    { title: 'Date', dataIndex: 'date', key: 'date', width: 140, render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Reference', dataIndex: 'reference', key: 'ref', width: 180, ellipsis: true },
    { title: 'Type', dataIndex: 'type', key: 'type', width: 100, render: (v: string) => <Tag color={v === 'DEPOSIT' ? 'green' : v === 'WITHDRAWAL' ? 'red' : 'blue'}>{TYPE_LABELS[v] || v}</Tag> },
    { title: 'Client', dataIndex: 'clientName', key: 'client', width: 160, ellipsis: true },
    { title: 'N° Compte', dataIndex: 'accountNumber', key: 'acct', width: 120 },
    { title: 'Type Compte', dataIndex: 'accountType', key: 'acctType', width: 100, render: (v: string) => ACCT_TYPE_LABELS[v] || v },
    { title: 'Montant', dataIndex: 'amount', key: 'amt', width: 110, align: 'right' as const, render: (v: number) => `${fmt(v)} F` },
    { title: 'Frais', dataIndex: 'fees', key: 'fees', width: 90, align: 'right' as const, render: (v: number) => <span style={{ color: '#F5A623', fontWeight: 600 }}>{fmt(v)}</span> },
    { title: 'Taxes', dataIndex: 'tax', key: 'tax', width: 80, align: 'right' as const, render: (v: number) => fmt(v) },
    { title: 'Total', dataIndex: 'totalFees', key: 'total', width: 100, align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 700, color: '#1B2A4A' }}>{fmt(v)} F</span> },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <DatePicker.RangePicker value={dates as any} onChange={(v: any) => setDates(v || [dayjs().startOf('month'), dayjs()])} format="DD/MM/YYYY" />
        <Button type="primary" onClick={handleSearch} loading={loading}>Rechercher</Button>
        <Button icon={<FilePdfOutlined />} onClick={handleExportPdf} disabled={!data?.details?.length}>PDF</Button>
        <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={!data?.details?.length}>Excel</Button>
      </Space>

      {data && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Transactions" value={data.summary.totalTransactions} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Frais percus" value={data.summary.totalFees} suffix="FCFA" valueStyle={{ color: '#F5A623' }} /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Taxes (TVA)" value={data.summary.totalTax} suffix="FCFA" /></Card></Col>
            <Col xs={12} sm={6}><Card size="small"><Statistic title="Total general" value={data.summary.grandTotal} suffix="FCFA" valueStyle={{ color: '#1B2A4A', fontWeight: 700 }} /></Card></Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} md={12}>
              <Card size="small" title="Par type de transaction">
                <Table size="small" pagination={false}
                  dataSource={(data.byTransactionType || []).map((r: any, i: number) => ({ key: i, ...r }))}
                  columns={[
                    { title: 'Type', dataIndex: 'type', render: (v: string) => TYPE_LABELS[v] || v },
                    { title: 'Nb', dataIndex: 'count', align: 'center' as const },
                    { title: 'Frais', dataIndex: 'totalFees', align: 'right' as const, render: (v: number) => `${fmt(v)} F` },
                    { title: 'Taxes', dataIndex: 'totalTax', align: 'right' as const, render: (v: number) => `${fmt(v)} F` },
                    { title: 'Total', dataIndex: 'grandTotal', align: 'right' as const, render: (v: number) => <b>{fmt(v)} F</b> },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" title="Par type de compte">
                <Table size="small" pagination={false}
                  dataSource={(data.byAccountType || []).map((r: any, i: number) => ({ key: i, ...r }))}
                  columns={[
                    { title: 'Compte', dataIndex: 'accountType', render: (v: string) => ACCT_TYPE_LABELS[v] || v },
                    { title: 'Nb', dataIndex: 'count', align: 'center' as const },
                    { title: 'Frais', dataIndex: 'totalFees', align: 'right' as const, render: (v: number) => `${fmt(v)} F` },
                    { title: 'Taxes', dataIndex: 'totalTax', align: 'right' as const, render: (v: number) => `${fmt(v)} F` },
                    { title: 'Total', dataIndex: 'grandTotal', align: 'right' as const, render: (v: number) => <b>{fmt(v)} F</b> },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" title={`Detail des frais (${data.details?.length || 0} transactions)`}>
            <Table size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 20, showTotal: (t: number) => `${t} transaction(s)` }}
              dataSource={(data.details || []).map((r: any, i: number) => ({ key: i, ...r }))}
              columns={detailColumns}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={7}><b>TOTAL</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="right"><b style={{ color: '#F5A623' }}>{fmt(data.summary.totalFees)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={8} align="right"><b>{fmt(data.summary.totalTax)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={9} align="right"><b style={{ color: '#1B2A4A' }}>{fmt(data.summary.grandTotal)} F</b></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );
}

export default function Reports() {
  const tabItems = [
    { key: 'kpis', label: <span><BarChartOutlined /> KPIs</span>, children: <KPIsTab /> },
    { key: 'frais', label: <span><DollarOutlined /> Frais percus</span>, children: <FraisPercusTab /> },
    { key: 'cobac', label: <span><SafetyOutlined /> COBAC</span>, children: <RapportCOBACTab /> },
    { key: 'monthly', label: <span><DollarOutlined /> Mensuel</span>, children: <RapportMensuelTab /> },
    { key: 'evolution', label: <span><RiseOutlined /> Evolution 12 mois</span>, children: <EvolutionTab /> },
    { key: 'ouvertures', label: <span><FileAddOutlined /> Ouvertures</span>, children: <OuverturesComptesTab /> },
    { key: 'provisionnement', label: <span><SafetyOutlined /> Provisionnement</span>, children: <ProvisionnementTab /> },
    { key: 'tafire', label: <span><FundProjectionScreenOutlined /> TAFIRE</span>, children: <TafireTab /> },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
          <BarChartOutlined /> Rapports & KPIs
        </Title>
        <Text type="secondary">Indicateurs de performance, ratios prudentiels COBAC, rapports mensuels</Text>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Tabs items={tabItems} tabPosition="top" type="card" />
      </Card>
    </div>
  );
}
