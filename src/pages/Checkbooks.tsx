import { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Modal, Form, Input, Select, InputNumber, message, Descriptions,
  Tabs, DatePicker, Statistic,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, StopOutlined,
  SendOutlined, BankOutlined, BookOutlined, DollarOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'blue',
  EMIS: 'orange',
  ENCAISSE: 'green',
  OPPOSITION: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: 'Disponible',
  EMIS: 'Emis',
  ENCAISSE: 'Encaisse',
  OPPOSITION: 'Opposition',
};

export default function Checkbooks() {
  const { canCreate, canUpdate } = usePermissions();

  // --- Comptes (recherche dynamique) ---
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const searchTimeout = useState<any>(null);

  const fetchAccounts = async (search: string) => {
    if (!search || search.length < 2) { setAccounts([]); return; }
    setAccountsLoading(true);
    try {
      const { data } = await api.get('/accounts', { params: { search, limit: 20 } });
      const items = data.data || data.items || data;
      setAccounts(Array.isArray(items) ? items : []);
    } catch {
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleAccountSearch = (value: string) => {
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[0] = setTimeout(() => fetchAccounts(value), 400);
  };

  // --- Onglet 1 : Chequiers ---
  const [checkbooks, setCheckbooks] = useState<any[]>([]);
  const [checkbooksLoading, setCheckbooksLoading] = useState(false);
  const [searchAccountId, setSearchAccountId] = useState('');
  const [newCheckbookModal, setNewCheckbookModal] = useState(false);
  const [newCheckbookForm] = Form.useForm();
  const [creatingCheckbook, setCreatingCheckbook] = useState(false);

  // Cheques du chequier selectionne
  const [selectedCheckbook, setSelectedCheckbook] = useState<any>(null);
  const [cheques, setCheques] = useState<any[]>([]);
  const [chequesLoading, setChequesLoading] = useState(false);
  const [chequesPagination, setChequesPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // Opposition chequier
  const [oppositionCheckbookModal, setOppositionCheckbookModal] = useState(false);
  const [oppositionCheckbookForm] = Form.useForm();
  const [oppositionCheckbookId, setOppositionCheckbookId] = useState<string | null>(null);

  // --- Onglet 2 : Registre ---
  const [registre, setRegistre] = useState<any[]>([]);
  const [registreLoading, setRegistreLoading] = useState(false);
  const [registrePagination, setRegistrePagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [registreFilters, setRegistreFilters] = useState<any>({
    accountId: '',
    status: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  // Preview cheque
  const [previewCheque, setPreviewCheque] = useState<any>(null);
  const [previewAccount, setPreviewAccount] = useState<any>(null);

  // Retrait par cheque
  const [retraitModal, setRetraitModal] = useState(false);
  const [retraitCheque, setRetraitCheque] = useState<any>(null);
  const [retraitLoading, setRetraitLoading] = useState(false);

  // Modales actions cheques
  const [emitModal, setEmitModal] = useState(false);
  const [emitForm] = Form.useForm();
  const [emitChequeId, setEmitChequeId] = useState<string | null>(null);

  const [encaisserModal, setEncaisserModal] = useState(false);
  const [encaisserForm] = Form.useForm();
  const [encaisserChequeId, setEncaisserChequeId] = useState<string | null>(null);

  const [oppositionChequeModal, setOppositionChequeModal] = useState(false);
  const [oppositionChequeForm] = Form.useForm();
  const [oppositionChequeId, setOppositionChequeId] = useState<string | null>(null);

  // =====================
  // ONGLET 1 : Chequiers
  // =====================

  const fetchCheckbooks = async (accountId: string) => {
    if (!accountId.trim()) {
      message.warning('Veuillez saisir un numero de compte');
      return;
    }
    setCheckbooksLoading(true);
    try {
      const { data } = await api.get('/checkbooks', { params: { accountId } });
      setCheckbooks(data.data || data);
      setSelectedCheckbook(null);
      setCheques([]);
    } catch {
      message.error('Erreur lors du chargement des chequiers');
    } finally {
      setCheckbooksLoading(false);
    }
  };

  const handleCreateCheckbook = async () => {
    try {
      const values = await newCheckbookForm.validateFields();
      setCreatingCheckbook(true);
      await api.post('/checkbooks', {
        accountId: values.accountId,
        totalLeaves: values.totalLeaves,
      });
      message.success('Chequier demande avec succes');
      setNewCheckbookModal(false);
      // Auto-sélectionner le compte et rafraîchir la liste
      setSearchAccountId(values.accountId);
      fetchCheckbooks(values.accountId);
      newCheckbookForm.resetFields();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        message.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    } finally {
      setCreatingCheckbook(false);
    }
  };

  const fetchCheques = async (checkbookId: string, accountId: string, page = 1, pageSize = 10) => {
    setChequesLoading(true);
    try {
      const { data } = await api.get('/checkbooks/cheques', {
        params: { checkbookId, accountId, page, limit: pageSize },
      });
      const items = data.data || data.items || data;
      setCheques(Array.isArray(items) ? items : []);
      setChequesPagination({
        current: data.page || page,
        pageSize: data.limit || pageSize,
        total: data.total || (Array.isArray(items) ? items.length : 0),
      });
    } catch {
      message.error('Erreur lors du chargement des cheques');
    } finally {
      setChequesLoading(false);
    }
  };

  const handleViewCheques = (record: any) => {
    setSelectedCheckbook(record);
    fetchCheques(record.id, record.accountId || searchAccountId);
  };

  const handleOppositionCheckbook = async () => {
    try {
      const values = await oppositionCheckbookForm.validateFields();
      await api.patch(`/checkbooks/${oppositionCheckbookId}/opposition`, {
        motif: values.motif,
      });
      message.success('Opposition sur le chequier enregistree');
      setOppositionCheckbookModal(false);
      oppositionCheckbookForm.resetFields();
      setOppositionCheckbookId(null);
      if (searchAccountId.trim()) {
        fetchCheckbooks(searchAccountId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        message.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    }
  };

  const checkbookColumns = [
    {
      title: 'Serie', key: 'serie', width: 180,
      render: (_: any, r: any) => (
        <Text strong style={{ color: '#1B2A4A' }}>
          CHQ-{String(r.seriesStart || r.serieDebut || '').padStart(6, '0')} → CHQ-{String(r.seriesEnd || r.serieFin || '').padStart(6, '0')}
        </Text>
      ),
    },
    { title: 'Feuillets', dataIndex: 'totalLeaves', key: 'totalLeaves', width: 90, align: 'center' as const },
    {
      title: 'Disponible', key: 'disponible', width: 90, align: 'center' as const,
      render: (_: any, r: any) => <Tag color="blue">{r.chequeCounts?.DISPONIBLE ?? r.countDisponible ?? 0}</Tag>,
    },
    {
      title: 'Emis', key: 'emis', width: 80, align: 'center' as const,
      render: (_: any, r: any) => <Tag color="orange">{r.chequeCounts?.EMIS ?? r.countEmis ?? 0}</Tag>,
    },
    {
      title: 'Encaisse', key: 'encaisse', width: 90, align: 'center' as const,
      render: (_: any, r: any) => <Tag color="green">{r.chequeCounts?.ENCAISSE ?? r.countEncaisse ?? 0}</Tag>,
    },
    {
      title: 'Opposition', key: 'opposition', width: 90, align: 'center' as const,
      render: (_: any, r: any) => <Tag color="red">{r.chequeCounts?.OPPOSITION ?? r.countOpposition ?? 0}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewCheques(r)}>
            Voir cheques
          </Button>
          {canUpdate('TRANSACTIONS') && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => {
                setOppositionCheckbookId(r.id);
                oppositionCheckbookForm.resetFields();
                setOppositionCheckbookModal(true);
              }}
            >
              Opposition
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const handlePreviewCheque = async (cheque: any) => {
    setPreviewCheque(cheque);
    // Charger les infos du compte pour le design
    try {
      const accountId = cheque.checkbook?.accountId || selectedCheckbook?.accountId || searchAccountId;
      if (accountId) {
        const { data } = await api.get(`/accounts/${accountId}`);
        setPreviewAccount(data);
      }
    } catch { /* ignore */ }
  };

  const chequesOfCheckbookColumns = [
    { title: 'N° cheque', dataIndex: 'chequeNumber', key: 'chequeNumber', width: 120 },
    {
      title: 'Statut', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' as const,
      render: (v: any) => v ? Number(v).toLocaleString('fr-FR') : '-',
    },
    { title: 'Beneficiaire', dataIndex: 'beneficiary', key: 'beneficiary', width: 180 },
    {
      title: 'Date emission', dataIndex: 'emittedAt', key: 'emittedAt', width: 140,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Action', key: 'preview', width: 120,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => handlePreviewCheque(r)}>
          Apercu
        </Button>
      ),
    },
  ];

  // =====================
  // ONGLET 2 : Registre
  // =====================

  const fetchRegistre = async (page = 1, pageSize = 10) => {
    setRegistreLoading(true);
    try {
      const params: any = { page, limit: pageSize };
      if (registreFilters.accountId) params.accountId = registreFilters.accountId;
      if (registreFilters.status) params.status = registreFilters.status;
      if (registreFilters.startDate) params.startDate = registreFilters.startDate;
      if (registreFilters.endDate) params.endDate = registreFilters.endDate;

      const { data } = await api.get('/checkbooks/registre', { params });
      const items = data.data || data.items || data;
      setRegistre(Array.isArray(items) ? items : []);
      setRegistrePagination({
        current: data.page || page,
        pageSize: data.limit || pageSize,
        total: data.total || (Array.isArray(items) ? items.length : 0),
      });
    } catch {
      message.error('Erreur lors du chargement du registre');
    } finally {
      setRegistreLoading(false);
    }
  };

  const handleEmitCheque = async () => {
    try {
      const values = await emitForm.validateFields();
      await api.patch(`/checkbooks/cheques/${emitChequeId}/emit`, {
        chequeNumber: values.chequeNumber,
        amount: values.amount,
        beneficiary: values.beneficiary,
      });
      message.success('Cheque emis avec succes');
      setEmitModal(false);
      emitForm.resetFields();
      setEmitChequeId(null);
      fetchRegistre(registrePagination.current, registrePagination.pageSize);
      if (selectedCheckbook) {
        fetchCheques(selectedCheckbook.id, selectedCheckbook.accountId || searchAccountId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        message.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    }
  };

  const handleEncaisserCheque = async () => {
    try {
      const values = await encaisserForm.validateFields();
      await api.patch(`/checkbooks/cheques/${encaisserChequeId}/encaisser`, {
        chequeNumber: values.chequeNumber,
        accountId: values.accountId,
      });
      message.success('Cheque encaisse avec succes');
      setEncaisserModal(false);
      encaisserForm.resetFields();
      setEncaisserChequeId(null);
      fetchRegistre(registrePagination.current, registrePagination.pageSize);
      if (selectedCheckbook) {
        fetchCheques(selectedCheckbook.id, selectedCheckbook.accountId || searchAccountId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        message.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    }
  };

  const handleOppositionCheque = async () => {
    try {
      const values = await oppositionChequeForm.validateFields();
      await api.patch(`/checkbooks/cheques/${oppositionChequeId}/opposition`, {
        motif: values.motif,
      });
      message.success('Opposition enregistree sur le cheque');
      setOppositionChequeModal(false);
      oppositionChequeForm.resetFields();
      setOppositionChequeId(null);
      fetchRegistre(registrePagination.current, registrePagination.pageSize);
      if (selectedCheckbook) {
        fetchCheques(selectedCheckbook.id, selectedCheckbook.accountId || searchAccountId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      if (msg) {
        message.error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
    }
  };

  const handleRetraitCheque = async () => {
    if (!retraitCheque) return;
    setRetraitLoading(true);
    try {
      await api.patch(`/checkbooks/cheques/${retraitCheque.id}/retrait`, {
        chequeNumber: retraitCheque.chequeNumber,
      });
      message.success(`Retrait de ${Number(retraitCheque.amount).toLocaleString('fr-FR')} FCFA effectue par cheque ${retraitCheque.chequeNumber}`);
      setRetraitModal(false);
      setRetraitCheque(null);
      fetchRegistre(registrePagination.current, registrePagination.pageSize);
      if (selectedCheckbook) {
        fetchCheques(selectedCheckbook.id, selectedCheckbook.accountId || searchAccountId);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      message.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors du retrait');
    } finally {
      setRetraitLoading(false);
    }
  };

  const registreColumns = [
    { title: 'N° cheque', dataIndex: 'chequeNumber', key: 'chequeNumber', width: 120 },
    {
      title: 'Statut', dataIndex: 'status', key: 'status', width: 110,
      render: (s: string) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_LABELS[s] || s}</Tag>,
    },
    {
      title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' as const,
      render: (v: any) => v ? Number(v).toLocaleString('fr-FR') : '-',
    },
    { title: 'Beneficiaire', dataIndex: 'beneficiary', key: 'beneficiary', width: 180 },
    {
      title: 'Date emission', dataIndex: 'emittedAt', key: 'emittedAt', width: 140,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Date encaissement', dataIndex: 'encaisseAt', key: 'encaisseAt', width: 150,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Date opposition', dataIndex: 'oppositionAt', key: 'oppositionAt', width: 150,
      render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
    },
    { title: 'Motif opposition', dataIndex: 'motifOpposition', key: 'motifOpposition', width: 160 },
    {
      title: 'Actions', key: 'actions', width: 340,
      render: (_: any, r: any) => {
        if (r.status === 'ENCAISSE' || r.status === 'OPPOSITION') return null;
        return (
          <Space wrap>
            {r.status === 'DISPONIBLE' && canUpdate('TRANSACTIONS') && (
              <Button
                size="small"
                type="primary"
                icon={<SendOutlined />}
                onClick={() => {
                  setEmitChequeId(r.id);
                  emitForm.resetFields();
                  emitForm.setFieldsValue({ chequeNumber: r.chequeNumber });
                  setEmitModal(true);
                }}
              >
                Emettre
              </Button>
            )}
            {r.status === 'EMIS' && canUpdate('TRANSACTIONS') && (
              <Button
                size="small"
                style={{ background: '#F5A623', borderColor: '#F5A623', color: '#fff' }}
                icon={<BankOutlined />}
                onClick={() => {
                  setRetraitCheque(r);
                  setRetraitModal(true);
                }}
              >
                Retrait
              </Button>
            )}
            {r.status === 'EMIS' && canUpdate('TRANSACTIONS') && (
              <Button
                size="small"
                style={{ borderColor: '#52c41a', color: '#52c41a' }}
                icon={<BankOutlined />}
                onClick={() => {
                  setEncaisserChequeId(r.id);
                  encaisserForm.resetFields();
                  encaisserForm.setFieldsValue({ chequeNumber: r.chequeNumber });
                  setEncaisserModal(true);
                }}
              >
                Encaisser
              </Button>
            )}
            {(r.status === 'DISPONIBLE' || r.status === 'EMIS') && canUpdate('TRANSACTIONS') && (
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => {
                  setOppositionChequeId(r.id);
                  oppositionChequeForm.resetFields();
                  setOppositionChequeModal(true);
                }}
              >
                Opposition
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  // =====================
  // RENDER
  // =====================

  const tabItems = [
    {
      key: 'checkbooks',
      label: (
        <span><BookOutlined /> Chequiers</span>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
            <Col flex="auto">
              <Select
                showSearch
                filterOption={false}
                onSearch={handleAccountSearch}
                loading={accountsLoading}
                placeholder="Rechercher un compte par numero ou nom du client..."
                style={{ width: '100%', maxWidth: 500 }}
                allowClear
                value={searchAccountId || undefined}
                onChange={(v) => {
                  setSearchAccountId(v || '');
                  if (v) fetchCheckbooks(v);
                  else { setCheckbooks([]); setSelectedCheckbook(null); setCheques([]); }
                }}
                notFoundContent={accountsLoading ? 'Chargement...' : 'Tapez pour rechercher'}
              >
                {accounts.map((acc: any) => (
                  <Select.Option key={acc.id} value={acc.id}>
                    {acc.accountNumber} — {acc.client?.firstName} {acc.client?.lastName} ({acc.accountType})
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col>
              {canCreate('TRANSACTIONS') && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    newCheckbookForm.resetFields();
                    setNewCheckbookModal(true);
                  }}
                  style={{ background: '#F5A623', borderColor: '#F5A623' }}
                >
                  Nouveau chequier
                </Button>
              )}
            </Col>
          </Row>

          <Table
            dataSource={checkbooks}
            columns={checkbookColumns}
            loading={checkbooksLoading}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showTotal: (t) => `${t} chequier(s)` }}
          />

          {selectedCheckbook && (
            <Card
              title={
                <Space>
                  <BookOutlined style={{ color: '#1B2A4A' }} />
                  <span>
                    Cheques du chequier CHQ-{String(selectedCheckbook.seriesStart || selectedCheckbook.serieDebut || '').padStart(6, '0')} → CHQ-{String(selectedCheckbook.seriesEnd || selectedCheckbook.serieFin || '').padStart(6, '0')}
                  </span>
                </Space>
              }
              style={{ marginTop: 16 }}
              extra={
                <Button size="small" onClick={() => { setSelectedCheckbook(null); setCheques([]); }}>
                  Fermer
                </Button>
              }
            >
              <Table
                dataSource={cheques}
                columns={chequesOfCheckbookColumns}
                loading={chequesLoading}
                rowKey="id"
                size="small"
                pagination={{
                  current: chequesPagination.current,
                  pageSize: chequesPagination.pageSize,
                  total: chequesPagination.total,
                  showTotal: (t) => `${t} cheque(s)`,
                  onChange: (page, pageSize) => {
                    fetchCheques(
                      selectedCheckbook.id,
                      selectedCheckbook.accountId || searchAccountId,
                      page,
                      pageSize,
                    );
                  },
                }}
              />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'registre',
      label: (
        <span><BankOutlined /> Registre des cheques</span>
      ),
      children: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
            <Col>
              <Input
                placeholder="N° de compte"
                value={registreFilters.accountId}
                onChange={(e) => setRegistreFilters({ ...registreFilters, accountId: e.target.value })}
                style={{ width: 200 }}
                allowClear
              />
            </Col>
            <Col>
              <Select
                placeholder="Statut"
                value={registreFilters.status}
                onChange={(v) => setRegistreFilters({ ...registreFilters, status: v })}
                allowClear
                style={{ width: 160 }}
              >
                <Select.Option value="DISPONIBLE">Disponible</Select.Option>
                <Select.Option value="EMIS">Emis</Select.Option>
                <Select.Option value="ENCAISSE">Encaisse</Select.Option>
                <Select.Option value="OPPOSITION">Opposition</Select.Option>
              </Select>
            </Col>
            <Col>
              <RangePicker
                format="DD/MM/YYYY"
                onChange={(dates) => {
                  setRegistreFilters({
                    ...registreFilters,
                    startDate: dates?.[0]?.format('YYYY-MM-DD') || undefined,
                    endDate: dates?.[1]?.format('YYYY-MM-DD') || undefined,
                  });
                }}
              />
            </Col>
            <Col>
              <Button type="primary" onClick={() => fetchRegistre(1, registrePagination.pageSize)}>
                Filtrer
              </Button>
            </Col>
          </Row>

          <Table
            dataSource={registre}
            columns={registreColumns}
            loading={registreLoading}
            rowKey="id"
            size="small"
            scroll={{ x: 1300 }}
            pagination={{
              current: registrePagination.current,
              pageSize: registrePagination.pageSize,
              total: registrePagination.total,
              showTotal: (t) => `${t} cheque(s)`,
              onChange: (page, pageSize) => fetchRegistre(page, pageSize),
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>Chequiers</Title>
            <Text type="secondary">Gestion des chequiers et registre des cheques</Text>
          </Col>
          <Col>
            <Row gutter={24}>
              <Col>
                <Statistic
                  title="Chequiers charges"
                  value={checkbooks.length}
                  valueStyle={{ color: '#1B2A4A', fontSize: 20 }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        <Tabs defaultActiveKey="checkbooks" items={tabItems} />
      </Card>

      {/* Modal : Nouveau chequier */}
      <Modal
        title="Nouveau chequier"
        open={newCheckbookModal}
        onOk={handleCreateCheckbook}
        onCancel={() => setNewCheckbookModal(false)}
        confirmLoading={creatingCheckbook}
        okText="Demander"
        cancelText="Annuler"
      >
        <Form form={newCheckbookForm} layout="vertical">
          <Form.Item
            name="accountId"
            label="Compte"
            rules={[{ required: true, message: 'Veuillez selectionner un compte' }]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={handleAccountSearch}
              loading={accountsLoading}
              placeholder="Rechercher par numero ou nom du client..."
              notFoundContent={accountsLoading ? 'Chargement...' : 'Tapez pour rechercher'}
            >
              {accounts.map((acc: any) => (
                <Select.Option key={acc.id} value={acc.id}>
                  {acc.accountNumber} — {acc.client?.firstName} {acc.client?.lastName} ({acc.accountType})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="totalLeaves"
            label="Nombre de feuillets"
            rules={[{ required: true, message: 'Veuillez selectionner le nombre de feuillets' }]}
          >
            <Select placeholder="Selectionner">
              <Select.Option value={25}>25 feuillets</Select.Option>
              <Select.Option value={50}>50 feuillets</Select.Option>
              <Select.Option value={100}>100 feuillets</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal : Opposition chequier */}
      <Modal
        title="Opposition sur le chequier"
        open={oppositionCheckbookModal}
        onOk={handleOppositionCheckbook}
        onCancel={() => { setOppositionCheckbookModal(false); setOppositionCheckbookId(null); }}
        okText="Confirmer l'opposition"
        okButtonProps={{ danger: true }}
        cancelText="Annuler"
      >
        <Form form={oppositionCheckbookForm} layout="vertical">
          <Form.Item
            name="motif"
            label="Motif de l'opposition"
            rules={[{ required: true, message: 'Veuillez indiquer le motif' }]}
          >
            <Select placeholder="Selectionner le motif">
              <Select.Option value="vol">Vol</Select.Option>
              <Select.Option value="perte">Perte</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal : Emettre un cheque */}
      <Modal
        title="Emettre un cheque"
        open={emitModal}
        onOk={handleEmitCheque}
        onCancel={() => { setEmitModal(false); setEmitChequeId(null); }}
        okText="Emettre"
        cancelText="Annuler"
      >
        <Form form={emitForm} layout="vertical">
          <Form.Item name="chequeNumber" label="Numero du cheque">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Montant (FCFA)"
            rules={[{ required: true, message: 'Veuillez saisir le montant' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
            />
          </Form.Item>
          <Form.Item
            name="beneficiary"
            label="Beneficiaire"
            rules={[{ required: true, message: 'Veuillez saisir le beneficiaire' }]}
          >
            <Input placeholder="Nom du beneficiaire" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal : Encaisser un cheque */}
      <Modal
        title="Encaisser un cheque"
        open={encaisserModal}
        onOk={handleEncaisserCheque}
        onCancel={() => { setEncaisserModal(false); setEncaisserChequeId(null); }}
        okText="Encaisser"
        cancelText="Annuler"
      >
        <Form form={encaisserForm} layout="vertical">
          <Form.Item name="chequeNumber" label="Numero du cheque">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="accountId"
            label="Compte destination"
            rules={[{ required: true, message: 'Veuillez selectionner le compte destination' }]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={handleAccountSearch}
              loading={accountsLoading}
              placeholder="Rechercher par numero ou nom du client..."
              notFoundContent={accountsLoading ? 'Chargement...' : 'Tapez pour rechercher'}
            >
              {accounts.map((acc: any) => (
                <Select.Option key={acc.id} value={acc.id}>
                  {acc.accountNumber} — {acc.client?.firstName} {acc.client?.lastName} ({acc.accountType})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal : Opposition cheque */}
      <Modal
        title="Opposition sur un cheque"
        open={oppositionChequeModal}
        onOk={handleOppositionCheque}
        onCancel={() => { setOppositionChequeModal(false); setOppositionChequeId(null); }}
        okText="Confirmer l'opposition"
        okButtonProps={{ danger: true }}
        cancelText="Annuler"
      >
        <Form form={oppositionChequeForm} layout="vertical">
          <Form.Item
            name="motif"
            label="Motif de l'opposition"
            rules={[{ required: true, message: 'Veuillez indiquer le motif' }]}
          >
            <Input.TextArea rows={3} placeholder="Raison de l'opposition (vol, perte, litige...)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal : Apercu du cheque */}
      <Modal
        title={null}
        open={!!previewCheque}
        onCancel={() => { setPreviewCheque(null); setPreviewAccount(null); }}
        footer={null}
        width={780}
        centered
      >
        {previewCheque && (
          <div style={{
            border: '2px solid #1B2A4A',
            borderRadius: 8,
            padding: 0,
            background: 'linear-gradient(135deg, #f8f9fc 0%, #eef1f7 100%)',
            fontFamily: "'Open Sans', sans-serif",
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Filigrane */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: 80, fontWeight: 900, color: 'rgba(27,42,74,0.04)',
              whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none',
            }}>
              GLOBAL FINANCIAL SOLUTION
            </div>

            {/* En-tete */}
            <div style={{
              background: 'linear-gradient(90deg, #1B2A4A 0%, #2d4a7a 100%)',
              padding: '16px 24px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ color: '#F5A623', fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>
                  GLOBAL FINANCIAL SOLUTION
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                  Microfinance — Douala, Cameroun
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>CHEQUE BANCAIRE</div>
                <div style={{
                  color: '#F5A623', fontSize: 16, fontWeight: 800,
                  background: 'rgba(245,166,35,0.15)', padding: '2px 12px',
                  borderRadius: 4, marginTop: 4,
                }}>
                  {previewCheque.chequeNumber}
                </div>
              </div>
            </div>

            {/* Corps du cheque */}
            <div style={{ padding: '20px 24px' }}>
              {/* Ligne 1 : Payez contre ce cheque */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Text style={{ fontSize: 11, color: '#888' }}>Payez contre ce cheque non endossable a :</Text>
                  <div style={{
                    borderBottom: '1.5px dashed #1B2A4A', padding: '6px 0',
                    fontSize: 16, fontWeight: 600, color: '#1B2A4A', minHeight: 30,
                  }}>
                    {previewCheque.beneficiary || '____________________________________________'}
                  </div>
                </Col>
              </Row>

              {/* Ligne 2 : Somme */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={16}>
                  <Text style={{ fontSize: 11, color: '#888' }}>La somme de :</Text>
                  <div style={{
                    borderBottom: '1.5px dashed #1B2A4A', padding: '6px 0',
                    fontSize: 14, color: '#1B2A4A', minHeight: 30, fontStyle: 'italic',
                  }}>
                    {previewCheque.amount
                      ? `${Number(previewCheque.amount).toLocaleString('fr-FR')} Francs CFA`
                      : '________________________________________________'}
                  </div>
                </Col>
                <Col span={8}>
                  <div style={{
                    border: '2px solid #1B2A4A', borderRadius: 6,
                    padding: '8px 12px', textAlign: 'center',
                    background: '#fff',
                  }}>
                    <Text style={{ fontSize: 10, color: '#888', display: 'block' }}>Montant FCFA</Text>
                    <Text style={{ fontSize: 20, fontWeight: 800, color: '#1B2A4A' }}>
                      {previewCheque.amount
                        ? `${Number(previewCheque.amount).toLocaleString('fr-FR')}`
                        : '***'}
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* Ligne 3 : Lieu, date */}
              <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={12}>
                  <Text style={{ fontSize: 11, color: '#888' }}>A : </Text>
                  <Text style={{ fontSize: 13, color: '#1B2A4A' }}>Douala</Text>
                  <Text style={{ fontSize: 11, color: '#888', marginLeft: 16 }}>Le : </Text>
                  <Text style={{ fontSize: 13, color: '#1B2A4A' }}>
                    {previewCheque.emittedAt
                      ? dayjs(previewCheque.emittedAt).format('DD/MM/YYYY')
                      : '__ / __ / ____'}
                  </Text>
                </Col>
                <Col span={12} style={{ textAlign: 'right' }}>
                  <div style={{
                    display: 'inline-block', border: '1px dashed #aaa',
                    borderRadius: 6, padding: '8px 20px', minWidth: 140, minHeight: 50,
                    textAlign: 'center',
                  }}>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>Signature</Text>
                  </div>
                </Col>
              </Row>

              {/* Pied */}
              <div style={{
                borderTop: '1px solid #ddd', paddingTop: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <Text style={{ fontSize: 10, color: '#999' }}>Titulaire : </Text>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#1B2A4A' }}>
                    {previewAccount?.client?.firstName} {previewAccount?.client?.lastName}
                    {previewAccount?.client?.companyName && previewAccount.client.companyName}
                  </Text>
                </div>
                <div>
                  <Text style={{ fontSize: 10, color: '#999' }}>Compte : </Text>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#1B2A4A', fontFamily: 'monospace' }}>
                    {previewAccount?.accountNumber || '---'}
                  </Text>
                </div>
                <div>
                  <Tag color={STATUS_COLORS[previewCheque.status]} style={{ margin: 0 }}>
                    {STATUS_LABELS[previewCheque.status] || previewCheque.status}
                  </Tag>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal : Retrait par cheque */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#F5A623' }} />
            <span>Retrait especes par cheque</span>
          </Space>
        }
        open={retraitModal}
        onOk={handleRetraitCheque}
        onCancel={() => { setRetraitModal(false); setRetraitCheque(null); }}
        confirmLoading={retraitLoading}
        okText="Confirmer le retrait"
        okButtonProps={{ style: { background: '#F5A623', borderColor: '#F5A623' } }}
        cancelText="Annuler"
        width={500}
      >
        {retraitCheque && (
          <div>
            <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="N° cheque">
                <Text strong>{retraitCheque.chequeNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Montant">
                <Text strong style={{ color: '#F5A623', fontSize: 18 }}>
                  {Number(retraitCheque.amount).toLocaleString('fr-FR')} FCFA
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Beneficiaire">
                {retraitCheque.beneficiary || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Date emission">
                {retraitCheque.emittedAt ? dayjs(retraitCheque.emittedAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Compte emetteur">
                {retraitCheque.checkbook?.account?.accountNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Titulaire">
                {retraitCheque.checkbook?.account?.client?.firstName} {retraitCheque.checkbook?.account?.client?.lastName}
                {retraitCheque.checkbook?.account?.client?.raisonSociale}
              </Descriptions.Item>
            </Descriptions>
            <div style={{
              background: '#fff7e6', border: '1px solid #ffd591',
              borderRadius: 6, padding: '10px 14px', fontSize: 13,
            }}>
              <strong>Retrait especes :</strong> Le montant de{' '}
              <strong>{Number(retraitCheque.amount).toLocaleString('fr-FR')} FCFA</strong>{' '}
              sera debite du compte emetteur. Verifiez l'identite du porteur et la signature avant de confirmer.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
