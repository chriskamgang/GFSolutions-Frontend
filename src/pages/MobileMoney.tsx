import { useState, useEffect, useCallback } from 'react';
import {
  Card, Typography, Row, Col, Statistic, Table, Tag, Button, message,
  DatePicker, Select, Space, Spin, Modal, Form, InputNumber, Input, Alert, Descriptions,
} from 'antd';
import {
  ArrowDownOutlined, ArrowUpOutlined, ReloadOutlined, PlusOutlined,
  DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  MobileOutlined, SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function MobileMoney() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDeposits: 0, totalWithdrawals: 0, pendingCount: 0, completedCount: 0, failedCount: 0, totalDepositAmount: 0, totalWithdrawalAmount: 0 });
  const [balance, setBalance] = useState<any>(null);
  const [filters, setFilters] = useState<{ type?: string; status?: string; dates?: [dayjs.Dayjs, dayjs.Dayjs] }>({});
  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpResult, setTopUpResult] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [topUpForm] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, balRes] = await Promise.all([
        api.get('/transactions', { params: { limit: 500 } }),
        api.get('/pawapay/balance'),
      ]);

      // Filtrer les transactions Mobile Money (celles qui ont un mobileMoneyProvider)
      const allTx = (txRes.data?.data || txRes.data || []).filter(
        (t: any) => t.mobileMoneyProvider || t.mobileMoneyRef
      );

      setTransactions(allTx);
      setBalance(balRes.data);

      // Calculer les stats
      const deposits = allTx.filter((t: any) => t.type === 'DEPOSIT');
      const withdrawals = allTx.filter((t: any) => t.type === 'WITHDRAWAL');
      setStats({
        totalDeposits: deposits.length,
        totalWithdrawals: withdrawals.length,
        pendingCount: allTx.filter((t: any) => t.status === 'PENDING').length,
        completedCount: allTx.filter((t: any) => t.status === 'COMPLETED').length,
        failedCount: allTx.filter((t: any) => t.status === 'FAILED').length,
        totalDepositAmount: deposits.filter((t: any) => t.status === 'COMPLETED').reduce((s: number, t: any) => s + Number(t.amount), 0),
        totalWithdrawalAmount: withdrawals.filter((t: any) => t.status === 'COMPLETED').reduce((s: number, t: any) => s + Number(t.amount), 0),
      });
    } catch {
      message.error('Erreur de chargement des donnees Mobile Money');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTopUp = async (values: any) => {
    setTopUpLoading(true);
    setTopUpResult(null);
    try {
      const { data } = await api.post('/pawapay/topup', {
        amount: values.amount,
        phone: values.phone,
        provider: values.provider,
      });
      setTopUpResult(data);
      message.success(data.message);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur');
    } finally {
      setTopUpLoading(false);
    }
  };

  const checkTopUpStatus = async () => {
    if (!topUpResult?.paymentId) return;
    setCheckingStatus(true);
    try {
      const { data } = await api.get(`/pawapay/topup/status/${topUpResult.paymentId}`);
      setTopUpResult((prev: any) => ({ ...prev, currentStatus: data.status, details: data }));
      if (data.status === 'COMPLETED') {
        message.success('Recharge confirmee !');
        setTopUpModal(false);
        setTopUpResult(null);
        topUpForm.resetFields();
        fetchData();
      } else if (data.status === 'FAILED') {
        message.error(`Echec: ${data.failureReason || 'Erreur'}`);
      }
    } catch {
      message.error('Impossible de verifier le statut');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Filtrer les transactions
  const filtered = transactions.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.dates) {
      const d = dayjs(t.createdAt);
      if (d.isBefore(filters.dates[0], 'day') || d.isAfter(filters.dates[1], 'day')) return false;
    }
    return true;
  });

  const providerLabel = (p: string) => {
    const map: Record<string, string> = {
      MTN_MOMO: 'MTN MoMo', ORANGE_MONEY: 'Orange Money', MTN_MOMO_CMR: 'MTN MoMo', ORANGE_CMR: 'Orange Money',
    };
    return map[p] || p;
  };

  const providerColor = (p: string) => {
    if (p?.includes('MTN')) return '#FFCC00';
    if (p?.includes('ORANGE')) return '#FF6600';
    return '#1B2A4A';
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'date',
      width: 160,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
      sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'ref',
      width: 200,
      render: (r: string) => <Text copyable style={{ fontSize: 12 }}>{r}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => (
        <Tag color={t === 'DEPOSIT' ? 'green' : 'blue'} icon={t === 'DEPOSIT' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}>
          {t === 'DEPOSIT' ? 'Depot' : 'Retrait'}
        </Tag>
      ),
    },
    {
      title: 'Operateur',
      dataIndex: 'mobileMoneyProvider',
      key: 'provider',
      width: 140,
      render: (p: string) => (
        <Tag style={{ borderColor: providerColor(p), color: providerColor(p), fontWeight: 600 }}>
          {providerLabel(p)}
        </Tag>
      ),
    },
    {
      title: 'Telephone',
      dataIndex: 'mobileMoneyPhone',
      key: 'phone',
      width: 140,
      render: (p: string) => p ? <Text style={{ fontSize: 13 }}>{p}</Text> : '-',
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      align: 'right' as const,
      render: (a: number, r: any) => (
        <Text strong style={{ color: r.type === 'DEPOSIT' ? '#52c41a' : '#1890ff', fontSize: 14 }}>
          {Number(a).toLocaleString('fr-FR')} F
        </Text>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const conf: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
          COMPLETED: { color: 'success', icon: <CheckCircleOutlined />, label: 'Confirme' },
          PENDING: { color: 'warning', icon: <ClockCircleOutlined />, label: 'En attente' },
          FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Echoue' },
        };
        const c = conf[s] || { color: 'default', icon: null, label: s };
        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'desc',
      ellipsis: true,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{d || '-'}</Text>,
    },
  ];

  const balanceAmount = balance?.balance ?? balance?.available ?? balance?.amount;

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: '0 0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={3} style={{ margin: 0 }}>
          <MobileOutlined style={{ marginRight: 10 }} />
          Mobile Money — KPay
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Actualiser</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ background: '#F5A623', borderColor: '#F5A623' }}
            onClick={() => { setTopUpModal(true); setTopUpResult(null); }}
          >
            Recharger le solde
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8} md={6}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #1B2A4A' }}>
            <Statistic
              title="Solde KPay"
              value={balanceAmount ?? '-'}
              suffix={balanceAmount != null ? 'FCFA' : ''}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1B2A4A', fontWeight: 700 }}
            />
            {balanceAmount == null && (
              <a href="https://kpay.site" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                Voir sur kpay.site
              </a>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #52c41a' }}>
            <Statistic
              title="Depots"
              value={stats.totalDepositAmount}
              suffix="FCFA"
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{stats.totalDeposits} transaction{stats.totalDeposits > 1 ? 's' : ''}</Text>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #1890ff' }}>
            <Statistic
              title="Retraits"
              value={stats.totalWithdrawalAmount}
              suffix="FCFA"
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{stats.totalWithdrawals} transaction{stats.totalWithdrawals > 1 ? 's' : ''}</Text>
          </Card>
        </Col>
        <Col xs={8} sm={8} md={3}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #faad14' }}>
            <Statistic title="En attente" value={stats.pendingCount} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={8} sm={8} md={3}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #52c41a' }}>
            <Statistic title="Confirmes" value={stats.completedCount} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={8} sm={8} md={2}>
          <Card style={{ borderRadius: 10, borderLeft: '4px solid #ff4d4f' }}>
            <Statistic title="Echecs" value={stats.failedCount} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }}>
        <Space wrap>
          <Select
            placeholder="Type"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            options={[
              { value: 'DEPOSIT', label: 'Depots' },
              { value: 'WITHDRAWAL', label: 'Retraits' },
            ]}
          />
          <Select
            placeholder="Statut"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            options={[
              { value: 'COMPLETED', label: 'Confirmes' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'FAILED', label: 'Echecs' },
            ]}
          />
          <RangePicker
            format="DD/MM/YYYY"
            placeholder={['Date debut', 'Date fin']}
            onChange={(dates) => setFilters((f) => ({ ...f, dates: dates as any }))}
          />
          <Text type="secondary" style={{ fontSize: 13 }}>
            <SearchOutlined /> {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
          </Text>
        </Space>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `${t} transactions` }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Top-up Modal */}
      <Modal
        title={<span><DollarOutlined style={{ color: '#F5A623', marginRight: 8 }} /> Recharger le solde KPay</span>}
        open={topUpModal}
        onCancel={() => { setTopUpModal(false); setTopUpResult(null); }}
        footer={null}
        width={480}
      >
        {!topUpResult ? (
          <Form form={topUpForm} layout="vertical" onFinish={handleTopUp}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Un paiement Mobile Money sera initie depuis votre telephone pour alimenter le solde marchand KPay."
            />
            <Form.Item label="Montant (FCFA)" name="amount" rules={[{ required: true, message: 'Requis' }]}>
              <InputNumber
                min={100}
                step={1000}
                style={{ width: '100%' }}
                placeholder="Ex: 100000"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>
            <Form.Item label="Numero Mobile Money" name="phone" rules={[{ required: true, message: 'Requis' }]}>
              <Input placeholder="237 6XX XXX XXX" />
            </Form.Item>
            <Form.Item label="Operateur" name="provider" rules={[{ required: true, message: 'Requis' }]}>
              <Select placeholder="Choisir l'operateur">
                <Select.Option value="MTN_MOMO_CMR">MTN MoMo</Select.Option>
                <Select.Option value="ORANGE_CMR">Orange Money</Select.Option>
              </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={topUpLoading} block size="large">
              Envoyer la demande de paiement
            </Button>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {topUpResult.currentStatus === 'COMPLETED' ? (
              <Alert type="success" showIcon message="Recharge confirmee !" style={{ marginBottom: 16 }} />
            ) : topUpResult.currentStatus === 'FAILED' ? (
              <Alert type="error" showIcon message={`Echec: ${topUpResult.details?.failureReason || 'Erreur'}`} style={{ marginBottom: 16 }} />
            ) : (
              <>
                <Alert
                  type="warning"
                  showIcon
                  message="En attente de confirmation"
                  description="Confirmez le paiement sur votre telephone puis cliquez sur Verifier."
                  style={{ marginBottom: 16 }}
                />
                <Descriptions column={1} size="small" style={{ marginBottom: 16, textAlign: 'left' }}>
                  <Descriptions.Item label="Montant">{topUpResult.amount?.toLocaleString()} FCFA</Descriptions.Item>
                  <Descriptions.Item label="Statut">
                    <Tag color="orange">{topUpResult.currentStatus || topUpResult.status || 'PENDING'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="ID">{topUpResult.paymentId}</Descriptions.Item>
                </Descriptions>
                <Button type="primary" onClick={checkTopUpStatus} loading={checkingStatus} block size="large">
                  Verifier le statut
                </Button>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
