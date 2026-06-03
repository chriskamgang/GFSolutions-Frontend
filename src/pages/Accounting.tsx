import { useState, useEffect } from 'react';
import {
  Card, Typography, Tabs, Table, Tag, Button, Select, Row, Col, Statistic,
  DatePicker, Space, message, Modal, Form, Input, Popconfirm, Alert, Descriptions,
} from 'antd';
import {
  AuditOutlined, BookOutlined, BarChartOutlined, FileTextOutlined,
  LockOutlined, PlusOutlined, CheckCircleOutlined,
  DownloadOutlined, FilePdfOutlined, BankOutlined, FundOutlined, SwapOutlined,
  ContainerOutlined, ReconciliationOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

function PlanComptableTab() {
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounting/plan');
      setPlan(data);
    } catch {
      message.error('Plan comptable non initialise. Cliquez "Initialiser".');
    } finally {
      setLoading(false);
    }
  };

  const seedPlan = async () => {
    try {
      await api.post('/accounting/plan/seed');
      message.success('Plan comptable initialise');
      fetchPlan();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    }
  };

  useEffect(() => { fetchPlan(); }, []);

  const typeColors: Record<string, string> = {
    ACTIF: 'blue', PASSIF: 'green', CHARGE: 'red', PRODUIT: 'orange',
  };

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 80,
      render: (v: string) => <strong>{v}</strong>,
    },
    { title: 'Intitule', dataIndex: 'name', key: 'name',
      render: (name: string, r: any) => (
        <span style={{ paddingLeft: (r.level - 1) * 20 }}>
          {r.level === 1 ? <strong>{name}</strong> : name}
        </span>
      ),
    },
    { title: 'Type', dataIndex: 'type', key: 'type',
      render: (t: string) => <Tag color={typeColors[t]}>{t}</Tag>,
    },
    { title: 'Niveau', dataIndex: 'level', key: 'level', width: 80, align: 'center' as const },
  ];

  return (
    <div>
      {plan.length === 0 && !loading && (
        <Button type="primary" onClick={seedPlan} style={{ marginBottom: 16 }}>
          Initialiser le plan comptable EMF
        </Button>
      )}
      <Table dataSource={plan} columns={columns} loading={loading} rowKey="id" pagination={false} size="small" />
    </div>
  );
}

function JournalTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/accounting/journal');
        setEntries(data.data || []);
        setTotal(data.total || 0);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const columns = [
    { title: 'N° Ecriture', dataIndex: 'entryNumber', key: 'num', width: 160 },
    { title: 'Date', dataIndex: 'date', key: 'date',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    { title: 'Compte', key: 'account',
      render: (_: any, r: any) => r.account ? `${r.account.code} - ${r.account.name}` : '-',
    },
    { title: 'Debit (FCFA)', dataIndex: 'debit', key: 'debit',
      render: (v: any) => { const n = Number(v); return n > 0 ? n.toLocaleString('fr-FR') : ''; },
      align: 'right' as const,
    },
    { title: 'Credit (FCFA)', dataIndex: 'credit', key: 'credit',
      render: (v: any) => { const n = Number(v); return n > 0 ? n.toLocaleString('fr-FR') : ''; },
      align: 'right' as const,
    },
    { title: 'Libelle', dataIndex: 'label', key: 'label' },
  ];

  const exportCols = [
    { title: 'N° Ecriture', key: 'entryNumber' },
    { title: 'Date', key: 'date', format: (v: any) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Compte', key: 'account', format: (_: any, r: any) => r.account ? `${r.account.code} - ${r.account.name}` : '' },
    { title: 'Debit (FCFA)', key: 'debit', format: (v: any) => Number(v) > 0 ? Number(v).toLocaleString('fr-FR') : '' },
    { title: 'Credit (FCFA)', key: 'credit', format: (v: any) => Number(v) > 0 ? Number(v).toLocaleString('fr-FR') : '' },
    { title: 'Libelle', key: 'label' },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col><Text type="secondary">{total} ecritures au total</Text></Col>
        <Col>
          <Space>
            <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(entries, exportCols, 'journal_comptable')}>Excel</Button>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
              title: 'Journal comptable', subtitle: `${total} ecritures`,
              columns: exportCols, data: entries, filename: 'journal_comptable', orientation: 'landscape',
            })}>PDF</Button>
          </Space>
        </Col>
      </Row>
      <Table dataSource={entries} columns={columns} loading={loading} rowKey="id" size="small"
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}

function JournauxAuxiliairesTab() {
  const [journalType, setJournalType] = useState<'CAISSE' | 'BANQUE' | 'OD'>('CAISSE');
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchJournal = async (type?: string, p?: number) => {
    const t = type || journalType;
    const pg = p || page;
    setLoading(true);
    try {
      let url = `/accounting/journal-auxiliaire?type=${t}&page=${pg}&limit=30`;
      if (dateRange?.[0]) url += `&startDate=${dateRange[0].format('YYYY-MM-DD')}`;
      if (dateRange?.[1]) url += `&endDate=${dateRange[1].format('YYYY-MM-DD')}`;
      const { data } = await api.get(url);
      setEntries(data.data || []);
      setTotal(data.total || 0);
      setTotals({ debit: data.totalDebit || 0, credit: data.totalCredit || 0 });
    } catch { message.error('Erreur chargement journal auxiliaire'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchJournal(); }, []);

  const handleTypeChange = (t: 'CAISSE' | 'BANQUE' | 'OD') => {
    setJournalType(t);
    setPage(1);
    fetchJournal(t, 1);
  };

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  const journalLabels: Record<string, { label: string; color: string; icon: string }> = {
    CAISSE: { label: 'Journal de Caisse', color: '#1B2A4A', icon: 'Comptes 101, 102' },
    BANQUE: { label: 'Journal de Banque', color: '#52c41a', icon: 'Compte 111' },
    OD: { label: 'Journal des Operations Diverses', color: '#F5A623', icon: 'Hors caisse et banque' },
  };

  const columns = [
    { title: 'N° Ecriture', dataIndex: 'entryNumber', width: 160 },
    { title: 'Date', dataIndex: 'date',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'), width: 100,
    },
    { title: 'Compte', key: 'account',
      render: (_: any, r: any) => r.account ? `${r.account.code} - ${r.account.name}` : '-',
    },
    { title: 'Debit (FCFA)', dataIndex: 'debit', align: 'right' as const,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#cf1322' }}>{fmt(n)}</span> : ''; },
    },
    { title: 'Credit (FCFA)', dataIndex: 'credit', align: 'right' as const,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#389e0d' }}>{fmt(n)}</span> : ''; },
    },
    { title: 'Libelle', dataIndex: 'label' },
    { title: 'Reference', dataIndex: 'reference', width: 130 },
  ];

  const exportCols = [
    { title: 'N° Ecriture', key: 'entryNumber' },
    { title: 'Date', key: 'date', format: (v: any) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Compte', key: 'account', format: (_: any, r: any) => r.account ? `${r.account.code} - ${r.account.name}` : '' },
    { title: 'Debit (FCFA)', key: 'debit', format: (v: any) => Number(v) > 0 ? fmt(Number(v)) : '' },
    { title: 'Credit (FCFA)', key: 'credit', format: (v: any) => Number(v) > 0 ? fmt(Number(v)) : '' },
    { title: 'Libelle', key: 'label' },
    { title: 'Reference', key: 'reference' },
  ];

  const info = journalLabels[journalType];
  const solde = totals.debit - totals.credit;

  return (
    <div>
      {/* Selecteur de journal */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Select value={journalType} onChange={handleTypeChange} style={{ width: '100%' }}>
            <Select.Option value="CAISSE">Journal de Caisse</Select.Option>
            <Select.Option value="BANQUE">Journal de Banque</Select.Option>
            <Select.Option value="OD">Operations Diverses</Select.Option>
          </Select>
        </Col>
        <Col span={8}>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={3}>
          <Button type="primary" onClick={() => { setPage(1); fetchJournal(journalType, 1); }}>Filtrer</Button>
        </Col>
        <Col span={7} style={{ textAlign: 'right' }}>
          <Space>
            <Button size="small" icon={<DownloadOutlined />} onClick={() =>
              exportToExcel(entries, exportCols, `journal_${journalType.toLowerCase()}_${dayjs().format('YYYYMMDD')}`)
            }>Excel</Button>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() =>
              exportToPdf({
                title: info.label.toUpperCase(),
                subtitle: `${total} ecritures${dateRange?.[0] ? ` — du ${dateRange[0].format('DD/MM/YYYY')} au ${dateRange[1]?.format('DD/MM/YYYY')}` : ''}`,
                columns: exportCols, data: entries,
                filename: `journal_${journalType.toLowerCase()}_${dayjs().format('YYYYMMDD')}`,
                orientation: 'landscape',
                summary: [
                  { label: 'Total Debits', value: `${fmt(totals.debit)} FCFA` },
                  { label: 'Total Credits', value: `${fmt(totals.credit)} FCFA` },
                  { label: 'Solde', value: `${fmt(Math.abs(solde))} FCFA ${solde >= 0 ? '(debiteur)' : '(crediteur)'}` },
                ],
              })
            }>PDF</Button>
          </Space>
        </Col>
      </Row>

      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderLeft: `4px solid ${info.color}` }}>
            <Statistic title={info.label} value={total} suffix="ecritures"
              valueStyle={{ fontSize: 14, color: info.color }} />
            <Text type="secondary" style={{ fontSize: 11 }}>{info.icon}</Text>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Debits" value={totals.debit} suffix="FCFA"
              valueStyle={{ fontSize: 14, color: '#cf1322' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total Credits" value={totals.credit} suffix="FCFA"
              valueStyle={{ fontSize: 14, color: '#389e0d' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Solde" value={Math.abs(solde)} suffix="FCFA"
              prefix={solde >= 0 ? 'D' : 'C'}
              valueStyle={{ fontSize: 14, color: '#1B2A4A', fontWeight: 'bold' }}
              formatter={(v) => Number(v).toLocaleString('fr-FR')} />
          </Card>
        </Col>
      </Row>

      <Table
        dataSource={entries} columns={columns} loading={loading} rowKey="id" size="small"
        pagination={{
          current: page, pageSize: 30, total,
          onChange: (p) => { setPage(p); fetchJournal(journalType, p); },
          showTotal: (t) => `${t} ecritures`,
        }}
      />
    </div>
  );
}

function BalanceTab() {
  const [balance, setBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/accounting/balance');
        setBalance(data);
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const columns = [
    { title: 'Code', dataIndex: 'code', key: 'code', width: 80, render: (v: string) => <strong>{v}</strong> },
    { title: 'Compte', dataIndex: 'name', key: 'name' },
    { title: 'Type', dataIndex: 'type', key: 'type',
      render: (t: string) => <Tag color={t === 'ACTIF' ? 'blue' : t === 'PASSIF' ? 'green' : t === 'CHARGE' ? 'red' : 'orange'}>{t}</Tag>,
    },
    { title: 'Total Debit', dataIndex: 'totalDebit', key: 'td',
      render: (v: number) => v.toLocaleString('fr-FR'), align: 'right' as const,
    },
    { title: 'Total Credit', dataIndex: 'totalCredit', key: 'tc',
      render: (v: number) => v.toLocaleString('fr-FR'), align: 'right' as const,
    },
    { title: 'Solde Debiteur', dataIndex: 'soldeDebiteur', key: 'sd',
      render: (v: number) => v > 0 ? <strong style={{ color: '#1B2A4A' }}>{v.toLocaleString('fr-FR')}</strong> : '',
      align: 'right' as const,
    },
    { title: 'Solde Crediteur', dataIndex: 'soldeCrediteur', key: 'sc',
      render: (v: number) => v > 0 ? <strong style={{ color: '#52c41a' }}>{v.toLocaleString('fr-FR')}</strong> : '',
      align: 'right' as const,
    },
  ];

  const exportCols = [
    { title: 'Code', key: 'code' },
    { title: 'Compte', key: 'name' },
    { title: 'Type', key: 'type' },
    { title: 'Total Debit', key: 'totalDebit', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Total Credit', key: 'totalCredit', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Solde Debiteur', key: 'soldeDebiteur', format: (v: any) => Number(v) > 0 ? Number(v).toLocaleString('fr-FR') : '' },
    { title: 'Solde Crediteur', key: 'soldeCrediteur', format: (v: any) => Number(v) > 0 ? Number(v).toLocaleString('fr-FR') : '' },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(balance, exportCols, 'balance_generale')}>Excel</Button>
        <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
          title: 'Balance generale', subtitle: `${balance.length} comptes — Plan comptable EMF SYSCOHADA`,
          columns: exportCols, data: balance, filename: 'balance_generale', orientation: 'landscape',
        })}>PDF</Button>
      </Space>
      <Table dataSource={balance} columns={columns} loading={loading} rowKey="code" pagination={false} size="small" />
    </div>
  );
}

function GrandLivreTab() {
  const [plan, setPlan] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('702');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  useEffect(() => {
    api.get('/accounting/plan').then(r => setPlan(r.data || [])).catch(() => {});
  }, []);

  const fetchGrandLivre = async (code?: string) => {
    const c = code || selectedCode;
    if (!c) return;
    setLoading(true);
    try {
      let url = `/accounting/grand-livre/${c}?limit=100`;
      if (dateRange?.[0]) url += `&startDate=${dateRange[0].format('YYYY-MM-DD')}`;
      if (dateRange?.[1]) url += `&endDate=${dateRange[1].format('YYYY-MM-DD')}`;
      const { data: res } = await api.get(url);
      setData(res);
    } catch { message.error('Erreur chargement grand livre'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedCode) fetchGrandLivre(); }, [selectedCode]);

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY'), width: 100 },
    { title: 'N° Ecriture', dataIndex: 'entryNumber', width: 160 },
    { title: 'Libelle', dataIndex: 'label' },
    { title: 'Reference', dataIndex: 'reference', width: 150 },
    { title: 'Source', dataIndex: 'sourceModule', width: 130, render: (v: string) => v ? <Tag>{v}</Tag> : '-' },
    { title: 'Debit', dataIndex: 'debit', align: 'right' as const,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#cf1322' }}>{n.toLocaleString('fr-FR')}</span> : ''; },
    },
    { title: 'Credit', dataIndex: 'credit', align: 'right' as const,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#389e0d' }}>{n.toLocaleString('fr-FR')}</span> : ''; },
    },
  ];

  // Filtrer les comptes de niveau 2+ (pas les classes)
  const accountOptions = plan.filter(p => p.level >= 2).map(p => ({
    value: p.code, label: `${p.code} - ${p.name}`,
  }));

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <Select
            showSearch
            optionFilterProp="label"
            style={{ width: '100%' }}
            placeholder="Selectionner un compte..."
            value={selectedCode}
            onChange={(v) => { setSelectedCode(v); fetchGrandLivre(v); }}
            options={accountOptions}
          />
        </Col>
        <Col span={8}>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" onClick={() => fetchGrandLivre()}>Filtrer</Button>
        </Col>
      </Row>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small" style={{ background: '#f6f9fc', borderLeft: '4px solid #1B2A4A' }}>
                <Statistic title={`Compte ${data.compte.code}`} value={data.compte.name} valueStyle={{ fontSize: 14 }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Total Debits" value={data.totalDebit} suffix="FCFA"
                  valueStyle={{ fontSize: 14, color: '#cf1322' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Total Credits" value={data.totalCredit} suffix="FCFA"
                  valueStyle={{ fontSize: 14, color: '#389e0d' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic title="Solde" value={Math.abs(data.solde)} suffix="FCFA"
                  prefix={data.solde >= 0 ? 'D' : 'C'}
                  valueStyle={{ fontSize: 14, color: '#1B2A4A', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
          </Row>
          <Table dataSource={data.entries} columns={columns} loading={loading} rowKey="id" size="small"
            pagination={{ pageSize: 20 }} />
        </>
      )}
    </div>
  );
}

function BilanTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchBilan = async () => {
    setLoading(true);
    try {
      let url = '/accounting/bilan';
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      if (params.length) url += `?${params.join('&')}`;
      const { data: res } = await api.get(url);
      setData(res);
    } catch { message.error('Erreur chargement bilan'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBilan(); }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 80, render: (v: string) => <strong>{v}</strong> },
    { title: 'Intitule', dataIndex: 'name' },
    { title: 'Montant (FCFA)', dataIndex: 'solde', align: 'right' as const,
      render: (v: number) => <strong>{fmt(v)}</strong>,
    },
  ];

  const exportCols = [
    { title: 'Code', key: 'code' },
    { title: 'Intitule', key: 'name' },
    { title: 'Montant (FCFA)', key: 'solde', format: (v: any) => Number(v).toLocaleString('fr-FR') },
  ];

  const bilanDate = dateRange?.[1] ? dateRange[1].format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }}
            placeholder={['Date debut', 'Date fin']}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" onClick={fetchBilan}>Generer</Button>
        </Col>
        {data && (
          <Col span={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => {
                const allLines = [
                  ...data.actif.map((a: any) => ({ ...a, section: 'ACTIF' })),
                  { code: '', name: 'TOTAL ACTIF', solde: data.totalActif, section: 'ACTIF' },
                  ...data.passif.map((p: any) => ({ ...p, section: 'PASSIF' })),
                  { code: '', name: 'TOTAL PASSIF', solde: data.totalPassif, section: 'PASSIF' },
                ];
                exportToExcel(allLines, [{ title: 'Section', key: 'section' }, ...exportCols], `bilan_${dayjs().format('YYYYMMDD')}`);
              }}>Excel</Button>
              <Button size="small" icon={<FilePdfOutlined />} onClick={() => {
                const allLines = [
                  ...data.actif.map((a: any) => ({ ...a, section: 'ACTIF' })),
                  { code: '', name: 'TOTAL ACTIF', solde: data.totalActif, section: '' },
                  { code: '', name: '', solde: 0, section: '' },
                  ...data.passif.map((p: any) => ({ ...p, section: 'PASSIF' })),
                  { code: '', name: 'TOTAL PASSIF', solde: data.totalPassif, section: '' },
                ];
                exportToPdf({
                  title: 'BILAN SYSCOHADA EMF', subtitle: `Au ${bilanDate}`,
                  columns: [{ title: 'Section', key: 'section' }, ...exportCols],
                  data: allLines, filename: `bilan_${dayjs().format('YYYYMMDD')}`,
                  summary: [
                    { label: 'Total Actif', value: `${fmt(data.totalActif)} FCFA` },
                    { label: 'Total Passif', value: `${fmt(data.totalPassif)} FCFA` },
                    { label: 'Resultat', value: `${fmt(data.resultat)} FCFA` },
                  ],
                });
              }}>PDF</Button>
            </Space>
          </Col>
        )}
      </Row>

      {data && (
        <>
          {/* KPIs */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #1B2A4A' }}>
                <Statistic title="Total Actif" value={data.totalActif} suffix="FCFA"
                  valueStyle={{ color: '#1B2A4A', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
                <Statistic title="Total Passif" value={data.totalPassif} suffix="FCFA"
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: `4px solid ${data.resultat >= 0 ? '#52c41a' : '#cf1322'}` }}>
                <Statistic title="Resultat de l'exercice" value={data.resultat} suffix="FCFA"
                  valueStyle={{ color: data.resultat >= 0 ? '#52c41a' : '#cf1322', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
          </Row>

          {/* Tables Actif / Passif cote a cote */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title={<span style={{ color: '#1B2A4A' }}>ACTIF</span>} size="small"
                styles={{ header: { background: '#f0f4f8' } }}>
                <Table dataSource={data.actif} columns={columns} rowKey="code" pagination={false} size="small"
                  loading={loading}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>TOTAL ACTIF</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#1B2A4A', fontSize: 15 }}>{fmt(data.totalActif)} FCFA</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={<span style={{ color: '#52c41a' }}>PASSIF</span>} size="small"
                styles={{ header: { background: '#f0f8f0' } }}>
                <Table dataSource={data.passif} columns={columns} rowKey="code" pagination={false} size="small"
                  loading={loading}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>TOTAL PASSIF</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#52c41a', fontSize: 15 }}>{fmt(data.totalPassif)} FCFA</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
          </Row>

          {data.totalActif !== data.totalPassif && (
            <Alert type="warning" showIcon style={{ marginTop: 12 }}
              message={`Ecart Actif/Passif : ${fmt(Math.abs(data.totalActif - data.totalPassif))} FCFA`}
              description="Le bilan n'est pas equilibre. Verifiez les ecritures comptables."
            />
          )}
        </>
      )}
    </div>
  );
}

function CompteResultatTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchCR = async () => {
    setLoading(true);
    try {
      let url = '/accounting/compte-resultat';
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      if (params.length) url += `?${params.join('&')}`;
      const { data: res } = await api.get(url);
      setData(res);
    } catch { message.error('Erreur chargement compte de resultat'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCR(); }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 80, render: (v: string) => <strong>{v}</strong> },
    { title: 'Intitule', dataIndex: 'name' },
    { title: 'Montant (FCFA)', dataIndex: 'solde', align: 'right' as const,
      render: (v: number) => <strong>{fmt(v)}</strong>,
    },
  ];

  const exportCols = [
    { title: 'Code', key: 'code' },
    { title: 'Intitule', key: 'name' },
    { title: 'Montant (FCFA)', key: 'solde', format: (v: any) => Number(v).toLocaleString('fr-FR') },
  ];

  const periodLabel = dateRange?.[0] && dateRange?.[1]
    ? `Du ${dateRange[0].format('DD/MM/YYYY')} au ${dateRange[1].format('DD/MM/YYYY')}`
    : `Exercice en cours`;

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }}
            placeholder={['Date debut', 'Date fin']}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" onClick={fetchCR}>Generer</Button>
        </Col>
        {data && (
          <Col span={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button size="small" icon={<DownloadOutlined />} onClick={() => {
                const allLines = [
                  ...data.produits.map((p: any) => ({ ...p, section: 'PRODUITS' })),
                  { code: '', name: 'TOTAL PRODUITS', solde: data.totalProduits, section: '' },
                  ...data.charges.map((c: any) => ({ ...c, section: 'CHARGES' })),
                  { code: '', name: 'TOTAL CHARGES', solde: data.totalCharges, section: '' },
                  { code: '', name: 'RESULTAT NET', solde: data.resultat, section: '' },
                ];
                exportToExcel(allLines, [{ title: 'Section', key: 'section' }, ...exportCols], `compte_resultat_${dayjs().format('YYYYMMDD')}`);
              }}>Excel</Button>
              <Button size="small" icon={<FilePdfOutlined />} onClick={() => {
                const allLines = [
                  ...data.produits.map((p: any) => ({ ...p, section: 'PRODUITS' })),
                  { code: '', name: 'TOTAL PRODUITS', solde: data.totalProduits, section: '' },
                  { code: '', name: '', solde: 0, section: '' },
                  ...data.charges.map((c: any) => ({ ...c, section: 'CHARGES' })),
                  { code: '', name: 'TOTAL CHARGES', solde: data.totalCharges, section: '' },
                ];
                exportToPdf({
                  title: 'COMPTE DE RESULTAT SYSCOHADA EMF', subtitle: periodLabel,
                  columns: [{ title: 'Section', key: 'section' }, ...exportCols],
                  data: allLines, filename: `compte_resultat_${dayjs().format('YYYYMMDD')}`,
                  summary: [
                    { label: 'Total Produits', value: `${fmt(data.totalProduits)} FCFA` },
                    { label: 'Total Charges', value: `${fmt(data.totalCharges)} FCFA` },
                    { label: 'Resultat Net', value: `${fmt(data.resultat)} FCFA` },
                  ],
                });
              }}>PDF</Button>
            </Space>
          </Col>
        )}
      </Row>

      {data && (
        <>
          {/* KPIs */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #F5A623' }}>
                <Statistic title="Total Produits" value={data.totalProduits} suffix="FCFA"
                  valueStyle={{ color: '#F5A623', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: '4px solid #cf1322' }}>
                <Statistic title="Total Charges" value={data.totalCharges} suffix="FCFA"
                  valueStyle={{ color: '#cf1322', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ borderLeft: `4px solid ${data.resultat >= 0 ? '#52c41a' : '#cf1322'}` }}>
                <Statistic title="Resultat Net"
                  value={data.resultat} suffix="FCFA"
                  prefix={data.resultat >= 0 ? 'Benefice' : 'Perte'}
                  valueStyle={{ color: data.resultat >= 0 ? '#52c41a' : '#cf1322', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
          </Row>

          {/* Tables Produits / Charges cote a cote */}
          <Row gutter={16}>
            <Col span={12}>
              <Card title={<span style={{ color: '#F5A623' }}>PRODUITS (Classe 7)</span>} size="small"
                styles={{ header: { background: '#fef8ee' } }}>
                <Table dataSource={data.produits} columns={columns} rowKey="code" pagination={false} size="small"
                  loading={loading}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>TOTAL PRODUITS</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#F5A623', fontSize: 15 }}>{fmt(data.totalProduits)} FCFA</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title={<span style={{ color: '#cf1322' }}>CHARGES (Classe 6)</span>} size="small"
                styles={{ header: { background: '#fff1f0' } }}>
                <Table dataSource={data.charges} columns={columns} rowKey="code" pagination={false} size="small"
                  loading={loading}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        <strong>TOTAL CHARGES</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong style={{ color: '#cf1322', fontSize: 15 }}>{fmt(data.totalCharges)} FCFA</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              </Card>
            </Col>
          </Row>

          {/* Resultat Net en bas */}
          <Card style={{ marginTop: 16, textAlign: 'center', background: data.resultat >= 0 ? '#f6ffed' : '#fff2f0' }}>
            <Title level={4} style={{ color: data.resultat >= 0 ? '#52c41a' : '#cf1322', margin: 0 }}>
              {data.resultat >= 0 ? 'BENEFICE NET' : 'PERTE NETTE'} : {fmt(Math.abs(data.resultat))} FCFA
            </Title>
          </Card>
        </>
      )}
    </div>
  );
}

function FluxTresorerieTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  const fetchFlux = async () => {
    setLoading(true);
    try {
      let url = '/accounting/flux-tresorerie';
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      if (params.length) url += `?${params.join('&')}`;
      const { data: res } = await api.get(url);
      setData(res);
    } catch { message.error('Erreur chargement flux de tresorerie'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFlux(); }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');
  const fmtSigned = (v: number) => `${v >= 0 ? '+' : ''}${fmt(v)}`;

  const columns = [
    { title: 'Code', dataIndex: 'code', width: 70, render: (v: string) => v ? <Tag>{v}</Tag> : '' },
    { title: 'Intitule', dataIndex: 'name' },
    { title: 'Categorie', dataIndex: 'categorie', width: 200,
      render: (v: string) => <Text type="secondary">{v}</Text>,
    },
    { title: 'Flux (FCFA)', dataIndex: 'flux', align: 'right' as const, width: 160,
      render: (v: number) => (
        <strong style={{ color: v >= 0 ? '#52c41a' : '#cf1322' }}>
          {fmtSigned(v)}
        </strong>
      ),
    },
  ];

  const periodLabel = dateRange?.[0] && dateRange?.[1]
    ? `Du ${dateRange[0].format('DD/MM/YYYY')} au ${dateRange[1].format('DD/MM/YYYY')}`
    : 'Exercice en cours';

  const exportCols = [
    { title: 'Code', key: 'code' },
    { title: 'Intitule', key: 'name' },
    { title: 'Section', key: 'section' },
    { title: 'Categorie', key: 'categorie' },
    { title: 'Flux (FCFA)', key: 'flux', format: (v: any) => Number(v).toLocaleString('fr-FR') },
  ];

  const getAllLines = () => {
    if (!data) return [];
    return [
      ...data.exploitation.details.map((l: any) => ({ ...l, section: 'EXPLOITATION' })),
      { code: '', name: 'TOTAL EXPLOITATION', section: '', categorie: '', flux: data.exploitation.total },
      ...data.investissement.details.map((l: any) => ({ ...l, section: 'INVESTISSEMENT' })),
      { code: '', name: 'TOTAL INVESTISSEMENT', section: '', categorie: '', flux: data.investissement.total },
      ...data.financement.details.map((l: any) => ({ ...l, section: 'FINANCEMENT' })),
      { code: '', name: 'TOTAL FINANCEMENT', section: '', categorie: '', flux: data.financement.total },
      { code: '', name: 'VARIATION NETTE', section: '', categorie: '', flux: data.variationNette },
    ];
  };

  const renderSection = (
    title: string, color: string, bgColor: string,
    details: any[], total: number,
  ) => (
    <Card
      title={<span style={{ color }}>{title}</span>}
      size="small"
      style={{ marginBottom: 16 }}
      styles={{ header: { background: bgColor } }}
    >
      <Table
        dataSource={details} columns={columns} rowKey={(r, i) => `${r.code}-${i}`}
        pagination={false} size="small" loading={loading}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} />
            <Table.Summary.Cell index={1} colSpan={2}>
              <strong>{title}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <strong style={{ color, fontSize: 15 }}>{fmtSigned(total)} FCFA</strong>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </Card>
  );

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={10}>
          <DatePicker.RangePicker
            format="DD/MM/YYYY"
            onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }}
            placeholder={['Date debut', 'Date fin']}
          />
        </Col>
        <Col span={4}>
          <Button type="primary" onClick={fetchFlux}>Generer</Button>
        </Col>
        {data && (
          <Col span={10} style={{ textAlign: 'right' }}>
            <Space>
              <Button size="small" icon={<DownloadOutlined />} onClick={() =>
                exportToExcel(getAllLines(), exportCols, `flux_tresorerie_${dayjs().format('YYYYMMDD')}`)
              }>Excel</Button>
              <Button size="small" icon={<FilePdfOutlined />} onClick={() =>
                exportToPdf({
                  title: 'FLUX DE TRESORERIE SYSCOHADA EMF', subtitle: periodLabel,
                  columns: exportCols, data: getAllLines(),
                  filename: `flux_tresorerie_${dayjs().format('YYYYMMDD')}`,
                  summary: [
                    { label: 'Tresorerie ouverture', value: `${fmt(data.tresorerieOuverture)} FCFA` },
                    { label: 'Flux exploitation', value: `${fmtSigned(data.exploitation.total)} FCFA` },
                    { label: 'Flux investissement', value: `${fmtSigned(data.investissement.total)} FCFA` },
                    { label: 'Flux financement', value: `${fmtSigned(data.financement.total)} FCFA` },
                    { label: 'Tresorerie cloture', value: `${fmt(data.tresorerieCloture)} FCFA` },
                  ],
                })
              }>PDF</Button>
            </Space>
          </Col>
        )}
      </Row>

      {data && (
        <>
          {/* KPIs synthese */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small" style={{ borderLeft: '4px solid #1B2A4A' }}>
                <Statistic title="Tresorerie ouverture" value={data.tresorerieOuverture} suffix="FCFA"
                  valueStyle={{ fontSize: 13, color: '#1B2A4A' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ borderLeft: `4px solid ${data.exploitation.total >= 0 ? '#52c41a' : '#cf1322'}` }}>
                <Statistic title="Flux exploitation" value={data.exploitation.total} suffix="FCFA"
                  valueStyle={{ fontSize: 13, color: data.exploitation.total >= 0 ? '#52c41a' : '#cf1322' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ borderLeft: `4px solid ${data.investissement.total >= 0 ? '#52c41a' : '#cf1322'}` }}>
                <Statistic title="Flux investissement" value={data.investissement.total} suffix="FCFA"
                  valueStyle={{ fontSize: 13, color: data.investissement.total >= 0 ? '#52c41a' : '#cf1322' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ borderLeft: `4px solid ${data.financement.total >= 0 ? '#52c41a' : '#cf1322'}` }}>
                <Statistic title="Flux financement" value={data.financement.total} suffix="FCFA"
                  valueStyle={{ fontSize: 13, color: data.financement.total >= 0 ? '#52c41a' : '#cf1322' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
            <Col span={5}>
              <Card size="small" style={{ borderLeft: '4px solid #F5A623' }}>
                <Statistic title="Tresorerie cloture" value={data.tresorerieCloture} suffix="FCFA"
                  valueStyle={{ fontSize: 13, color: '#F5A623', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Card>
            </Col>
          </Row>

          {/* 3 sections */}
          {renderSection(
            'FLUX DE TRESORERIE LIES A L\'EXPLOITATION',
            data.exploitation.total >= 0 ? '#52c41a' : '#cf1322', '#f6f9fc',
            data.exploitation.details, data.exploitation.total,
          )}

          {renderSection(
            'FLUX DE TRESORERIE LIES A L\'INVESTISSEMENT',
            data.investissement.total >= 0 ? '#52c41a' : '#cf1322', '#fef8ee',
            data.investissement.details, data.investissement.total,
          )}

          {renderSection(
            'FLUX DE TRESORERIE LIES AU FINANCEMENT',
            data.financement.total >= 0 ? '#52c41a' : '#cf1322', '#f0f8f0',
            data.financement.details, data.financement.total,
          )}

          {/* Synthese finale */}
          <Card style={{ textAlign: 'center', background: data.variationNette >= 0 ? '#f6ffed' : '#fff2f0' }}>
            <Row gutter={24} justify="center">
              <Col>
                <Statistic title="Tresorerie d'ouverture" value={data.tresorerieOuverture} suffix="FCFA"
                  valueStyle={{ fontSize: 16 }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Col>
              <Col>
                <Title level={3} style={{ margin: '16px 0 0', color: '#999' }}>+</Title>
              </Col>
              <Col>
                <Statistic title="Variation nette" value={data.variationNette} suffix="FCFA"
                  valueStyle={{ fontSize: 16, color: data.variationNette >= 0 ? '#52c41a' : '#cf1322' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Col>
              <Col>
                <Title level={3} style={{ margin: '16px 0 0', color: '#999' }}>=</Title>
              </Col>
              <Col>
                <Statistic title="Tresorerie de cloture" value={data.tresorerieCloture} suffix="FCFA"
                  valueStyle={{ fontSize: 18, color: '#F5A623', fontWeight: 'bold' }}
                  formatter={(v) => Number(v).toLocaleString('fr-FR')} />
              </Col>
            </Row>
          </Card>
        </>
      )}
    </div>
  );
}

function RapprochementBancaireTab() {
  const { canCreate: canCreateAcct, canUpdate: canUpdateAcct } = usePermissions();
  const [summary, setSummary] = useState<any>(null);
  const [bankLines, setBankLines] = useState<any[]>([]);
  const [internalEntries, setInternalEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [importModal, setImportModal] = useState(false);
  const [importLines, setImportLines] = useState<any[]>([{ date: '', label: '', debit: 0, credit: 0, reference: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [filterMatched, setFilterMatched] = useState<string>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      const qs = params.length ? `?${params.join('&')}` : '';

      const matchedParam = filterMatched !== 'ALL' ? `&matched=${filterMatched === 'MATCHED'}` : '';

      const [summaryRes, bankRes, internalRes] = await Promise.all([
        api.get(`/accounting/reconciliation/summary${qs}`),
        api.get(`/accounting/bank-statement${qs}${matchedParam}`),
        api.get(`/accounting/grand-livre/111${qs}&limit=500`),
      ]);
      setSummary(summaryRes.data);
      setBankLines(bankRes.data.lines || []);
      setInternalEntries(internalRes.data?.entries || []);
    } catch { message.error('Erreur chargement rapprochement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  const handleAutoReconcile = async () => {
    try {
      const params: string[] = [];
      if (dateRange?.[0]) params.push(`startDate=${dateRange[0].format('YYYY-MM-DD')}`);
      if (dateRange?.[1]) params.push(`endDate=${dateRange[1].format('YYYY-MM-DD')}`);
      const qs = params.length ? `?${params.join('&')}` : '';
      const { data } = await api.post(`/accounting/reconciliation/auto${qs}`);
      message.success(`${data.matched} ecritures rapprochees automatiquement. ${data.remaining} restantes.`);
      fetchData();
    } catch { message.error('Erreur rapprochement auto'); }
  };

  const handleUnmatch = async (id: string) => {
    try {
      await api.post(`/accounting/reconciliation/unmatch/${id}`);
      message.success('Rapprochement annule');
      fetchData();
    } catch { message.error('Erreur'); }
  };

  const handleDeleteLine = async (id: string) => {
    try {
      await api.delete(`/accounting/bank-statement/${id}`);
      message.success('Ligne supprimee');
      fetchData();
    } catch { message.error('Erreur suppression'); }
  };

  const handleImport = async () => {
    const valid = importLines.filter(l => l.date && l.label && (l.debit > 0 || l.credit > 0));
    if (valid.length === 0) { message.warning('Aucune ligne valide'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/accounting/bank-statement/import', { lines: valid });
      message.success(`${data.imported} lignes importees`);
      setImportModal(false);
      setImportLines([{ date: '', label: '', debit: 0, credit: 0, reference: '' }]);
      fetchData();
    } catch { message.error('Erreur import'); }
    finally { setSubmitting(false); }
  };

  const addImportLine = () => {
    setImportLines([...importLines, { date: '', label: '', debit: 0, credit: 0, reference: '' }]);
  };

  const updateImportLine = (idx: number, field: string, value: any) => {
    const updated = [...importLines];
    updated[idx] = { ...updated[idx], [field]: value };
    setImportLines(updated);
  };

  const removeImportLine = (idx: number) => {
    setImportLines(importLines.filter((_, i) => i !== idx));
  };

  const bankColumns = [
    { title: 'Date', dataIndex: 'date', width: 100,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    { title: 'Reference', dataIndex: 'reference', width: 130 },
    { title: 'Libelle', dataIndex: 'label' },
    { title: 'Debit', dataIndex: 'debit', align: 'right' as const, width: 120,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#cf1322' }}>{fmt(n)}</span> : ''; },
    },
    { title: 'Credit', dataIndex: 'credit', align: 'right' as const, width: 120,
      render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#389e0d' }}>{fmt(n)}</span> : ''; },
    },
    { title: 'Statut', dataIndex: 'matched', width: 110,
      render: (v: boolean) => v
        ? <Tag color="green">Rapprochee</Tag>
        : <Tag color="orange">Non rapprochee</Tag>,
    },
    { title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Space size="small">
          {r.matched && canUpdateAcct('ACCOUNTING') && (
            <Button size="small" onClick={() => handleUnmatch(r.id)}>Annuler</Button>
          )}
          {!r.matched && canUpdateAcct('ACCOUNTING') && (
            <Popconfirm title="Supprimer cette ligne ?" onConfirm={() => handleDeleteLine(r.id)}>
              <Button size="small" danger>Suppr.</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const exportCols = [
    { title: 'Date', key: 'date', format: (v: any) => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Reference', key: 'reference' },
    { title: 'Libelle', key: 'label' },
    { title: 'Debit', key: 'debit', format: (v: any) => Number(v) > 0 ? fmt(Number(v)) : '' },
    { title: 'Credit', key: 'credit', format: (v: any) => Number(v) > 0 ? fmt(Number(v)) : '' },
    { title: 'Statut', key: 'matched', format: (v: any) => v ? 'Rapprochee' : 'Non rapprochee' },
  ];

  return (
    <div>
      {/* Filtres */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <DatePicker.RangePicker format="DD/MM/YYYY" onChange={(dates) => setDateRange(dates as any)}
            style={{ width: '100%' }} placeholder={['Date debut', 'Date fin']} />
        </Col>
        <Col span={4}>
          <Select value={filterMatched} onChange={setFilterMatched} style={{ width: '100%' }}>
            <Select.Option value="ALL">Toutes</Select.Option>
            <Select.Option value="MATCHED">Rapprochees</Select.Option>
            <Select.Option value="UNMATCHED">Non rapprochees</Select.Option>
          </Select>
        </Col>
        <Col span={3}>
          <Button type="primary" onClick={fetchData}>Filtrer</Button>
        </Col>
        <Col span={9} style={{ textAlign: 'right' }}>
          <Space>
            {canCreateAcct('ACCOUNTING') && (
              <Button icon={<PlusOutlined />} onClick={() => setImportModal(true)}>
                Saisir releve
              </Button>
            )}
            {canUpdateAcct('ACCOUNTING') && (
              <Button type="primary" onClick={handleAutoReconcile} style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                Rapprochement auto
              </Button>
            )}
            <Button size="small" icon={<DownloadOutlined />} onClick={() => exportToExcel(bankLines, exportCols, 'rapprochement_bancaire')}>Excel</Button>
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => exportToPdf({
              title: 'RAPPROCHEMENT BANCAIRE', subtitle: `Compte 111 — ${dayjs().format('DD/MM/YYYY')}`,
              columns: exportCols, data: bankLines, filename: 'rapprochement_bancaire', orientation: 'landscape',
              summary: summary ? [
                { label: 'Solde interne', value: `${fmt(summary.soldeInterne)} FCFA` },
                { label: 'Solde banque', value: `${fmt(summary.soldeBanque)} FCFA` },
                { label: 'Ecart', value: `${fmt(summary.ecart)} FCFA` },
              ] : [],
            })}>PDF</Button>
          </Space>
        </Col>
      </Row>

      {/* KPIs synthese */}
      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small" style={{ borderLeft: '4px solid #1B2A4A' }}>
              <Statistic title="Solde interne (111)" value={summary.soldeInterne} suffix="FCFA"
                valueStyle={{ fontSize: 13, color: '#1B2A4A' }}
                formatter={(v) => Number(v).toLocaleString('fr-FR')} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
              <Statistic title="Solde banque" value={summary.soldeBanque} suffix="FCFA"
                valueStyle={{ fontSize: 13, color: '#52c41a' }}
                formatter={(v) => Number(v).toLocaleString('fr-FR')} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" style={{ borderLeft: `4px solid ${summary.ecart === 0 ? '#52c41a' : '#cf1322'}` }}>
              <Statistic title="Ecart" value={Math.abs(summary.ecart)} suffix="FCFA"
                valueStyle={{ fontSize: 13, color: summary.ecart === 0 ? '#52c41a' : '#cf1322', fontWeight: 'bold' }}
                formatter={(v) => Number(v).toLocaleString('fr-FR')} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Lignes banque" value={summary.lignesBancaires.total}
                valueStyle={{ fontSize: 14 }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Rapprochees" value={summary.lignesBancaires.rapprochees}
                valueStyle={{ fontSize: 14, color: '#52c41a' }} />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic title="Non rapprochees" value={summary.lignesBancaires.nonRapprochees}
                valueStyle={{ fontSize: 14, color: '#F5A623' }} />
            </Card>
          </Col>
        </Row>
      )}

      {summary && summary.ecart === 0 && summary.lignesBancaires.nonRapprochees === 0 && (
        <Alert type="success" showIcon message="Rapprochement complet" style={{ marginBottom: 16 }}
          description="Toutes les lignes sont rapprochees et le solde est equilibre." />
      )}
      {summary && summary.ecart !== 0 && (
        <Alert type="warning" showIcon message={`Ecart de ${fmt(Math.abs(summary.ecart))} FCFA`}
          style={{ marginBottom: 16 }}
          description="Le solde interne et le solde bancaire ne correspondent pas. Verifiez les ecritures non rapprochees." />
      )}

      {/* Table releve bancaire */}
      <Card title="Releve bancaire" size="small" style={{ marginBottom: 16 }}>
        <Table dataSource={bankLines} columns={bankColumns} loading={loading} rowKey="id" size="small"
          pagination={{ pageSize: 15, showTotal: (t) => `${t} lignes` }} />
      </Card>

      {/* Table ecritures internes */}
      <Card title="Ecritures internes — Compte 111 (Banque)" size="small">
        <Table
          dataSource={internalEntries}
          loading={loading}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 15 }}
          columns={[
            { title: 'Date', dataIndex: 'date', width: 100, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
            { title: 'N° Ecriture', dataIndex: 'entryNumber', width: 160 },
            { title: 'Libelle', dataIndex: 'label' },
            { title: 'Debit', dataIndex: 'debit', align: 'right' as const, width: 120,
              render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#cf1322' }}>{fmt(n)}</span> : ''; },
            },
            { title: 'Credit', dataIndex: 'credit', align: 'right' as const, width: 120,
              render: (v: any) => { const n = Number(v); return n > 0 ? <span style={{ color: '#389e0d' }}>{fmt(n)}</span> : ''; },
            },
            { title: 'Reference', dataIndex: 'reference', width: 130 },
          ]}
        />
      </Card>

      {/* Modal saisie releve bancaire */}
      <Modal
        title="Saisir les lignes du releve bancaire"
        open={importModal}
        onCancel={() => setImportModal(false)}
        onOk={handleImport}
        confirmLoading={submitting}
        okText="Importer"
        width={800}
      >
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="Saisissez les lignes de votre releve bancaire. Chaque ligne doit avoir une date, un libelle, et un montant (debit ou credit)." />
        {importLines.map((line, idx) => (
          <Row gutter={8} key={idx} style={{ marginBottom: 8 }}>
            <Col span={4}>
              <Input type="date" value={line.date} onChange={(e) => updateImportLine(idx, 'date', e.target.value)} placeholder="Date" />
            </Col>
            <Col span={4}>
              <Input value={line.reference} onChange={(e) => updateImportLine(idx, 'reference', e.target.value)} placeholder="Ref." />
            </Col>
            <Col span={7}>
              <Input value={line.label} onChange={(e) => updateImportLine(idx, 'label', e.target.value)} placeholder="Libelle" />
            </Col>
            <Col span={3}>
              <Input type="number" value={line.debit || ''} onChange={(e) => updateImportLine(idx, 'debit', Number(e.target.value))} placeholder="Debit" />
            </Col>
            <Col span={3}>
              <Input type="number" value={line.credit || ''} onChange={(e) => updateImportLine(idx, 'credit', Number(e.target.value))} placeholder="Credit" />
            </Col>
            <Col span={3}>
              <Space>
                {idx === importLines.length - 1 && (
                  <Button size="small" type="primary" onClick={addImportLine}>+</Button>
                )}
                {importLines.length > 1 && (
                  <Button size="small" danger onClick={() => removeImportLine(idx)}>-</Button>
                )}
              </Space>
            </Col>
          </Row>
        ))}
      </Modal>
    </div>
  );
}

function CloturesTab() {
  const { canCreate: canCreateAcct, canUpdate: canUpdateAcct } = usePermissions();
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [createType, setCreateType] = useState<'DAILY' | 'MONTHLY' | 'ANNUAL'>('DAILY');
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [statsModal, setStatsModal] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/accounting/periods');
      setPeriods(data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPeriods(); }, []);

  const fmt = (v: number) => v.toLocaleString('fr-FR');

  // Detecter le type de periode (journaliere, mensuelle, annuelle)
  const getPeriodType = (p: any): string => {
    const days = dayjs(p.endDate).diff(dayjs(p.startDate), 'day');
    if (days <= 1) return 'DAILY';
    if (days <= 31) return 'MONTHLY';
    return 'ANNUAL';
  };

  const openCreateModal = (type: 'DAILY' | 'MONTHLY' | 'ANNUAL') => {
    setCreateType(type);
    form.resetFields();
    if (type === 'DAILY') {
      const today = dayjs();
      form.setFieldsValue({
        name: `Journee du ${today.format('DD/MM/YYYY')}`,
        singleDate: today,
      });
    } else if (type === 'MONTHLY') {
      const month = dayjs();
      form.setFieldsValue({
        name: `${month.format('MMMM YYYY')}`,
        monthPicker: month,
      });
    } else {
      const year = dayjs();
      form.setFieldsValue({
        name: `Exercice ${year.format('YYYY')}`,
        yearPicker: year,
      });
    }
    setCreateModal(true);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      let startDate: string, endDate: string;

      if (createType === 'DAILY') {
        startDate = values.singleDate.format('YYYY-MM-DD');
        endDate = startDate;
      } else if (createType === 'MONTHLY') {
        startDate = values.monthPicker.startOf('month').format('YYYY-MM-DD');
        endDate = values.monthPicker.endOf('month').format('YYYY-MM-DD');
      } else {
        startDate = values.yearPicker.startOf('year').format('YYYY-MM-DD');
        endDate = values.yearPicker.endOf('year').format('YYYY-MM-DD');
      }

      await api.post('/accounting/periods', { name: values.name, startDate, endDate });
      message.success('Periode creee');
      setCreateModal(false);
      fetchPeriods();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    } finally { setSubmitting(false); }
  };

  const handleViewStats = async (id: string) => {
    setStatsLoading(true);
    setStatsModal(true);
    try {
      const { data } = await api.get(`/accounting/periods/${id}/stats`);
      setStats(data);
    } catch { message.error('Erreur chargement statistiques'); }
    finally { setStatsLoading(false); }
  };

  const handleClose = async (id: string) => {
    try {
      await api.patch(`/accounting/periods/${id}/close`);
      message.success('Periode cloturee. Aucune modification possible.');
      fetchPeriods();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleCloseAnnual = async (id: string) => {
    try {
      // Utiliser la premiere agence disponible pour l'ecriture de resultat
      const { data: agencies } = await api.get('/agencies');
      const agencyId = agencies?.[0]?.id;
      if (!agencyId) { message.error('Aucune agence trouvee'); return; }

      const { data } = await api.patch(`/accounting/periods/${id}/close-annual`, { agencyId });
      message.success(
        `Cloture annuelle effectuee. ${data.type === 'BENEFICE' ? 'Benefice' : 'Perte'} : ${fmt(Math.abs(data.resultat))} FCFA. Ecriture de resultat generee.`
      );
      fetchPeriods();
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const statusColors: Record<string, string> = { OPEN: 'green', CLOSED: 'orange', LOCKED: 'red' };
  const statusLabels: Record<string, string> = { OPEN: 'Ouverte', CLOSED: 'Cloturee', LOCKED: 'Verrouillee' };
  const typeLabels: Record<string, { label: string; color: string }> = {
    DAILY: { label: 'Journaliere', color: 'blue' },
    MONTHLY: { label: 'Mensuelle', color: 'purple' },
    ANNUAL: { label: 'Annuelle', color: 'gold' },
  };

  const openPeriods = periods.filter(p => p.status === 'OPEN').length;
  const closedPeriods = periods.filter(p => p.status !== 'OPEN').length;
  const dailyCount = periods.filter(p => getPeriodType(p) === 'DAILY').length;
  const monthlyCount = periods.filter(p => getPeriodType(p) === 'MONTHLY').length;
  const annualCount = periods.filter(p => getPeriodType(p) === 'ANNUAL').length;

  const filteredPeriods = filterType === 'ALL'
    ? periods
    : periods.filter(p => getPeriodType(p) === filterType);

  const columns = [
    { title: 'Periode', dataIndex: 'name', render: (v: string) => <strong>{v}</strong> },
    { title: 'Type', key: 'type', width: 110,
      render: (_: any, r: any) => {
        const t = getPeriodType(r);
        return <Tag color={typeLabels[t]?.color}>{typeLabels[t]?.label}</Tag>;
      },
    },
    { title: 'Debut', dataIndex: 'startDate', width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    { title: 'Fin', dataIndex: 'endDate', width: 110,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    { title: 'Statut', dataIndex: 'status', width: 100,
      render: (s: string) => <Tag color={statusColors[s] || 'default'}>{statusLabels[s] || s}</Tag>,
    },
    { title: 'Cloturee le', key: 'closedAt', width: 140,
      render: (_: any, r: any) => r.closedAt ? dayjs(r.closedAt).format('DD/MM/YYYY HH:mm') : '-',
    },
    { title: 'Actions', key: 'actions', width: 250,
      render: (_: any, r: any) => {
        const pType = getPeriodType(r);
        return (
          <Space size="small">
            <Button size="small" onClick={() => handleViewStats(r.id)}>Stats</Button>
            {r.status === 'OPEN' && canUpdateAcct('ACCOUNTING') && (
              pType === 'ANNUAL' ? (
                <Popconfirm
                  title="Cloture annuelle"
                  description="Ceci va generer l'ecriture de determination du resultat (Produits - Charges) et cloturer la periode. Action irreversible."
                  onConfirm={() => handleCloseAnnual(r.id)}
                  okText="Cloturer l'exercice"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<LockOutlined />}>Cloturer exercice</Button>
                </Popconfirm>
              ) : (
                <Popconfirm
                  title="Cloturer cette periode ?"
                  description="Apres cloture, aucune ecriture ne pourra etre ajoutee. Irreversible."
                  onConfirm={() => handleClose(r.id)}
                  okText="Cloturer"
                  okButtonProps={{ danger: true }}
                >
                  <Button size="small" danger icon={<LockOutlined />}>Cloturer</Button>
                </Popconfirm>
              )
            )}
            {r.status === 'CLOSED' && <Tag icon={<CheckCircleOutlined />} color="default">Cloturee</Tag>}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      {/* KPIs */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderLeft: '4px solid #52c41a' }}>
            <Statistic title="Ouvertes" value={openPeriods} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderLeft: '4px solid #F5A623' }}>
            <Statistic title="Cloturees" value={closedPeriods} valueStyle={{ color: '#F5A623' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Journalieres" value={dailyCount} valueStyle={{ color: '#1890ff', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Mensuelles" value={monthlyCount} valueStyle={{ color: '#722ed1', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title="Annuelles" value={annualCount} valueStyle={{ color: '#d4b106', fontSize: 16 }} />
          </Card>
        </Col>
        <Col span={4} style={{ display: 'flex', alignItems: 'center' }}>
          <Select value={filterType} onChange={setFilterType} style={{ width: '100%' }}>
            <Select.Option value="ALL">Toutes</Select.Option>
            <Select.Option value="DAILY">Journalieres</Select.Option>
            <Select.Option value="MONTHLY">Mensuelles</Select.Option>
            <Select.Option value="ANNUAL">Annuelles</Select.Option>
          </Select>
        </Col>
      </Row>

      {/* Boutons creation rapide */}
      {canCreateAcct('ACCOUNTING') && (
        <Row gutter={12} style={{ marginBottom: 16 }}>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal('DAILY')}>
              Cloture journaliere (EOD)
            </Button>
          </Col>
          <Col>
            <Button icon={<PlusOutlined />} onClick={() => openCreateModal('MONTHLY')}
              style={{ borderColor: '#722ed1', color: '#722ed1' }}>
              Cloture mensuelle
            </Button>
          </Col>
          <Col>
            <Button icon={<PlusOutlined />} onClick={() => openCreateModal('ANNUAL')}
              style={{ borderColor: '#d4b106', color: '#d4b106' }}>
              Cloture annuelle
            </Button>
          </Col>
        </Row>
      )}

      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message="Processus de cloture"
        description={
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li><strong>Journaliere (EOD)</strong> : Verifiez que toutes les caisses sont fermees, puis cloturez. Ecritures inchangeables.</li>
            <li><strong>Mensuelle</strong> : Consolidation du mois. Verifiez la balance avant de cloturer.</li>
            <li><strong>Annuelle</strong> : Genere automatiquement l'ecriture de determination du resultat (Produits - Charges → Compte 43). Irreversible.</li>
          </ul>
        }
      />

      <Table dataSource={filteredPeriods} columns={columns} loading={loading} rowKey="id" size="small"
        pagination={{ pageSize: 15, showTotal: (t) => `${t} periodes` }} />

      {/* Modal creation */}
      <Modal
        title={`Creer une cloture ${createType === 'DAILY' ? 'journaliere' : createType === 'MONTHLY' ? 'mensuelle' : 'annuelle'}`}
        open={createModal}
        onCancel={() => setCreateModal(false)}
        onOk={handleCreate}
        confirmLoading={submitting}
        okText="Creer la periode"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Nom de la periode" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {createType === 'DAILY' && (
            <Form.Item name="singleDate" label="Date" rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          )}
          {createType === 'MONTHLY' && (
            <Form.Item name="monthPicker" label="Mois" rules={[{ required: true }]}>
              <DatePicker picker="month" format="MMMM YYYY" style={{ width: '100%' }} />
            </Form.Item>
          )}
          {createType === 'ANNUAL' && (
            <Form.Item name="yearPicker" label="Annee" rules={[{ required: true }]}>
              <DatePicker picker="year" format="YYYY" style={{ width: '100%' }} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal statistiques */}
      <Modal
        title="Statistiques de la periode"
        open={statsModal}
        onCancel={() => { setStatsModal(false); setStats(null); }}
        footer={null}
        width={600}
      >
        {statsLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : stats && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Periode" span={2}>
                <strong>{stats.period.name}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Debut">
                {dayjs(stats.period.startDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Fin">
                {dayjs(stats.period.endDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={statusColors[stats.period.status]}>{statusLabels[stats.period.status]}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ecritures">
                <strong>{stats.entriesCount}</strong>
              </Descriptions.Item>
            </Descriptions>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Total Debits" value={stats.totalDebit} suffix="FCFA"
                    valueStyle={{ fontSize: 14, color: '#cf1322' }}
                    formatter={(v) => Number(v).toLocaleString('fr-FR')} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Total Credits" value={stats.totalCredit} suffix="FCFA"
                    valueStyle={{ fontSize: 14, color: '#389e0d' }}
                    formatter={(v) => Number(v).toLocaleString('fr-FR')} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Equilibre" value={stats.balanced ? 'OUI' : 'NON'}
                    valueStyle={{ fontSize: 14, color: stats.balanced ? '#52c41a' : '#cf1322', fontWeight: 'bold' }} />
                </Card>
              </Col>
            </Row>

            {stats.openCashRegisters > 0 && stats.period.status === 'OPEN' && (
              <Alert type="warning" showIcon
                message={`${stats.openCashRegisters} caisse(s) encore ouverte(s)`}
                description="Fermez toutes les caisses avant de cloturer cette periode."
              />
            )}
            {stats.openCashRegisters === 0 && stats.period.status === 'OPEN' && (
              <Alert type="success" showIcon
                message="Toutes les caisses sont fermees"
                description="La periode peut etre cloturee en toute securite."
              />
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

export default function Accounting() {
  const tabItems = [
    {
      key: 'plan',
      label: <span><BookOutlined /> Plan comptable</span>,
      children: <PlanComptableTab />,
    },
    {
      key: 'journal',
      label: <span><AuditOutlined /> Journal</span>,
      children: <JournalTab />,
    },
    {
      key: 'journaux-aux',
      label: <span><ContainerOutlined /> Journaux auxiliaires</span>,
      children: <JournauxAuxiliairesTab />,
    },
    {
      key: 'balance',
      label: <span><BarChartOutlined /> Balance</span>,
      children: <BalanceTab />,
    },
    {
      key: 'grandlivre',
      label: <span><FileTextOutlined /> Grand Livre</span>,
      children: <GrandLivreTab />,
    },
    {
      key: 'bilan',
      label: <span><BankOutlined /> Bilan</span>,
      children: <BilanTab />,
    },
    {
      key: 'compte-resultat',
      label: <span><FundOutlined /> Compte de resultat</span>,
      children: <CompteResultatTab />,
    },
    {
      key: 'flux-tresorerie',
      label: <span><SwapOutlined /> Flux de tresorerie</span>,
      children: <FluxTresorerieTab />,
    },
    {
      key: 'rapprochement',
      label: <span><ReconciliationOutlined /> Rapprochement</span>,
      children: <RapprochementBancaireTab />,
    },
    {
      key: 'clotures',
      label: <span><LockOutlined /> Clotures</span>,
      children: <CloturesTab />,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0, color: '#1B2A4A' }}>
          <AuditOutlined /> Comptabilite SYSCOHADA
        </Title>
        <Text type="secondary">Plan comptable EMF, journal, balance, grand livre, bilan, compte de resultat</Text>
      </div>

      <Card style={{ borderRadius: 8 }}>
        <Tabs items={tabItems} />
      </Card>
    </div>
  );
}
