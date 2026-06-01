import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Tabs, Statistic, Tag, Table, Descriptions, DatePicker, Button, Space, message } from 'antd';
import {
  BarChartOutlined, TeamOutlined, BankOutlined, CreditCardOutlined,
  DollarOutlined, SafetyOutlined, RiseOutlined, FileAddOutlined,
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

export default function Reports() {
  const tabItems = [
    { key: 'kpis', label: <span><BarChartOutlined /> KPIs & Ratios</span>, children: <KPIsTab /> },
    { key: 'cobac', label: <span><SafetyOutlined /> Rapport COBAC</span>, children: <RapportCOBACTab /> },
    { key: 'monthly', label: <span><DollarOutlined /> Rapport mensuel</span>, children: <RapportMensuelTab /> },
    { key: 'evolution', label: <span><RiseOutlined /> Evolution 12 mois</span>, children: <EvolutionTab /> },
    { key: 'ouvertures', label: <span><FileAddOutlined /> Ouvertures de comptes</span>, children: <OuverturesComptesTab /> },
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
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
