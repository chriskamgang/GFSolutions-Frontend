import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Tag, Space, Typography, Row, Col,
  Modal, Form, Input, Select, InputNumber, message,
  Alert, Descriptions, Avatar, Checkbox, Divider, Badge,
  Dropdown, Steps, Image,
} from 'antd';
import {
  PlusOutlined, SwapOutlined, UserOutlined,
  SafetyOutlined, ExclamationCircleOutlined, BankOutlined,
  CheckCircleOutlined, DownloadOutlined, FilePdfOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { exportToExcel, exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ROLES_LABELS: Record<string, string> = {
  GERANT: 'Gerant',
  PRESIDENT: 'President',
  SECRETAIRE_GENERAL: 'Secretaire General',
  TRESORIER: 'Tresorier',
  DIRECTEUR: 'Directeur',
};

export default function Transactions() {
  const { canDeposit, isReadOnly } = usePermissions();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [txType, setTxType] = useState<'deposit' | 'withdrawal' | 'transfer'>('deposit');
  const [form] = Form.useForm();
  const [accounts, setAccounts] = useState<any[]>([]);

  // Verification identite retrait especes
  const [withdrawalClientInfo, setWithdrawalClientInfo] = useState<any>(null);
  const [withdrawalClientLoading, setWithdrawalClientLoading] = useState(false);

  // Retrait par cheque state
  const [retraitChequeModal, setRetraitChequeModal] = useState(false);
  const [retraitChequeStep, setRetraitChequeStep] = useState(0);
  const [retraitAccountInfo, setRetraitAccountInfo] = useState<any>(null);
  const [retraitAccountLoading, setRetraitAccountLoading] = useState(false);
  const [selectedRetraitCheque, setSelectedRetraitCheque] = useState<any>(null);
  const [retraitVerified, setRetraitVerified] = useState(false);
  const [retraitLoading, setRetraitLoading] = useState(false);

  // Signataire modal state
  const [signataireModalOpen, setSignataireModalOpen] = useState(false);
  const [signataireData, setSignataireData] = useState<any>(null);
  const [selectedSignataire, setSelectedSignataire] = useState<string | null>(null);
  const [identiteVerifiee, setIdentiteVerifiee] = useState(false);
  const [pendingTxValues, setPendingTxValues] = useState<any>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/transactions');
      setTransactions(data.data || data);
    } catch {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/accounts', { params: { limit: 200 } });
      setAccounts(data.data || data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
  }, []);

  const getAccountLabel = (acc: any) => {
    const clientName = acc.client
      ? (acc.client.clientType === 'MORALE'
        ? acc.client.raisonSociale
        : `${acc.client.firstName} ${acc.client.lastName}`)
      : '';
    const icon = acc.client?.clientType === 'MORALE' ? '🏢' : '';
    return `${acc.accountNumber} — ${clientName} ${icon} (${Number(acc.balance).toLocaleString('fr-FR')} FCFA)`;
  };

  const handleWithdrawalAccountSelect = async (accountId: string) => {
    if (!accountId) { setWithdrawalClientInfo(null); return; }
    setWithdrawalClientLoading(true);
    try {
      const { data } = await api.get(`/checkbooks/account-info/${accountId}`);
      setWithdrawalClientInfo(data);
    } catch {
      setWithdrawalClientInfo(null);
    } finally {
      setWithdrawalClientLoading(false);
    }
  };

  const handleOpenTxWithReset = (type: 'deposit' | 'withdrawal' | 'transfer') => {
    setWithdrawalClientInfo(null);
    handleOpenTx(type);
  };

  const handleOpenRetraitCheque = () => {
    setRetraitChequeModal(true);
    setRetraitChequeStep(0);
    setRetraitAccountInfo(null);
    setSelectedRetraitCheque(null);
    setRetraitVerified(false);
  };

  const handleRetraitChequeSelectAccount = async (accountId: string) => {
    setRetraitAccountLoading(true);
    try {
      const { data } = await api.get(`/checkbooks/account-info/${accountId}`);
      setRetraitAccountInfo(data);
    } catch {
      message.error('Erreur lors du chargement des informations du compte');
    } finally {
      setRetraitAccountLoading(false);
    }
  };

  const handleConfirmRetraitCheque = async () => {
    if (!selectedRetraitCheque || !retraitVerified) return;
    setRetraitLoading(true);
    try {
      if (selectedRetraitCheque.isManual) {
        // Saisie manuelle : chercher le cheque par numero, emettre puis encaisser
        const chequeNum = selectedRetraitCheque.manualChequeNumber?.trim();
        // 1. Trouver le cheque
        const { data: found } = await api.get(`/checkbooks/find-cheque/${chequeNum}`);
        const cheque = found.cheque;
        // 2. Si DISPONIBLE, emettre d'abord
        if (cheque.status === 'DISPONIBLE') {
          await api.patch(`/checkbooks/cheques/${cheque.id}/emit`, {
            chequeNumber: cheque.chequeNumber,
            amount: selectedRetraitCheque.manualAmount,
            beneficiary: selectedRetraitCheque.manualPorteur,
          });
        }
        // 3. Retrait (encaisser sans compte destination)
        await api.patch(`/checkbooks/cheques/${cheque.id}/retrait`, {
          chequeNumber: cheque.chequeNumber,
        });
        message.success(`Retrait de ${Number(selectedRetraitCheque.manualAmount).toLocaleString('fr-FR')} FCFA effectue — Cheque ${chequeNum} — Porteur: ${selectedRetraitCheque.manualPorteur} (CNI: ${selectedRetraitCheque.manualIdCard})`);
      } else {
        // Cheque deja emis selectionne dans la table
        await api.patch(`/checkbooks/cheques/${selectedRetraitCheque.id}/retrait`, {
          chequeNumber: selectedRetraitCheque.chequeNumber,
        });
        message.success('Retrait par cheque effectue avec succes');
      }
      setRetraitChequeModal(false);
      setRetraitAccountInfo(null);
      setSelectedRetraitCheque(null);
      setRetraitVerified(false);
      fetchTransactions();
      fetchAccounts();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      message.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors du retrait par cheque');
    } finally {
      setRetraitLoading(false);
    }
  };

  const handleOpenTx = (type: 'deposit' | 'withdrawal' | 'transfer') => {
    setTxType(type);
    form.resetFields();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Determiner le compte concerne pour verifier si PM
      const accountId = txType === 'deposit' ? values.toAccountId : values.fromAccountId;

      // Verifier si c'est un compte de Personne Morale
      try {
        const { data: sigData } = await api.get(`/transactions/signataires/${accountId}`);

        if (sigData.isMorale) {
          // C'est une Personne Morale -> afficher la modale signataire
          if (sigData.signataires.length === 0) {
            message.error('Ce compte de Personne Morale n\'a aucun signataire autorise. Operation impossible.');
            return;
          }
          setSignataireData(sigData);
          setSelectedSignataire(null);
          setIdentiteVerifiee(false);
          setPendingTxValues(values);
          setModalOpen(false);
          setSignataireModalOpen(true);
          return;
        }
      } catch {
        // Si l'endpoint echoue, on continue normalement
      }

      // Pas une PM ou pas de verification necessaire -> executer directement
      await executeTx(values);
    } catch (err: any) {
      if (err.response?.data?.message) {
        message.error(Array.isArray(err.response.data.message) ? err.response.data.message.join(', ') : err.response.data.message);
      }
    }
  };

  const handleConfirmSignataire = async () => {
    if (!selectedSignataire) {
      message.warning('Selectionnez le signataire present au guichet');
      return;
    }
    if (!identiteVerifiee) {
      message.warning('Vous devez confirmer la verification d\'identite et de signature');
      return;
    }

    await executeTx({
      ...pendingTxValues,
      signataireId: selectedSignataire,
      signataireVerifie: true,
    });
    setSignataireModalOpen(false);
  };

  const executeTx = async (values: any) => {
    try {
      let endpoint = '/transactions/deposit';
      const body: any = {
        amount: values.amount,
        agencyId: JSON.parse(localStorage.getItem('user') || '{}').agencyId,
        description: values.description,
        signataireId: values.signataireId,
        signataireVerifie: values.signataireVerifie,
      };

      if (txType === 'deposit') {
        endpoint = '/transactions/deposit';
        body.toAccountId = values.toAccountId;
      } else if (txType === 'withdrawal') {
        endpoint = '/transactions/withdrawal';
        body.fromAccountId = values.fromAccountId;
      } else {
        endpoint = '/transactions/transfer';
        body.fromAccountId = values.fromAccountId;
        body.toAccountId = values.toAccountId;
      }

      // Ajouter mobile money si applicable
      if (values.channel && values.channel !== 'CASH') {
        body.mobileMoneyProvider = values.channel;
        body.mobileMoneyPhone = values.mobileMoneyPhone;
      }

      await api.post(endpoint, body);
      message.success('Transaction effectuee avec succes');
      setModalOpen(false);
      form.resetFields();
      fetchTransactions();
      fetchAccounts();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      message.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Erreur lors de la transaction');
    }
  };

  const typeLabels: Record<string, string> = {
    DEPOSIT: 'Depot', WITHDRAWAL: 'Retrait', TRANSFER: 'Transfert',
    FEE: 'Frais', INTEREST: 'Interet', LOAN_DISBURSEMENT: 'Decaissement',
    LOAN_REPAYMENT: 'Remboursement', SALARY_PAYMENT: 'Salaire',
  };

  const columns = [
    {
      title: 'Date', dataIndex: 'createdAt', key: 'date', width: 140,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Reference', dataIndex: 'reference', key: 'reference', width: 180 },
    {
      title: 'Type', dataIndex: 'type', key: 'type', width: 120,
      render: (t: string) => {
        const colors: Record<string, string> = { DEPOSIT: 'green', WITHDRAWAL: 'red', TRANSFER: 'blue', FEE: 'orange' };
        return <Tag color={colors[t] || 'default'}>{typeLabels[t] || t}</Tag>;
      },
    },
    {
      title: 'Compte', key: 'account',
      render: (_: any, r: any) => {
        const account = r.fromAccount || r.toAccount;
        if (!account) return '-';
        const client = account.client;
        const name = client?.clientType === 'MORALE'
          ? client.raisonSociale
          : `${client?.firstName || ''} ${client?.lastName || ''}`;
        return (
          <Space size={4}>
            {client?.clientType === 'MORALE' && <BankOutlined style={{ color: '#1B2A4A' }} />}
            <span>{name}</span>
          </Space>
        );
      },
    },
    {
      title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      render: (v: any, r: any) => (
        <Text style={{ color: r.type === 'DEPOSIT' ? '#52c41a' : r.type === 'WITHDRAWAL' ? '#ff4d4f' : '#1B2A4A', fontWeight: 600 }}>
          {r.type === 'WITHDRAWAL' ? '-' : '+'}{Number(v).toLocaleString('fr-FR')}
        </Text>
      ),
    },
    {
      title: 'Frais', dataIndex: 'fees', key: 'fees', align: 'right' as const,
      render: (v: any) => Number(v || 0).toLocaleString('fr-FR'),
    },
    {
      title: 'Signataire', key: 'signataire', width: 80,
      render: (_: any, r: any) => r.signataireVerifie ? (
        <Badge status="success" text="Verifie" />
      ) : null,
    },
    {
      title: 'Statut', dataIndex: 'status', key: 'status',
      render: (s: string) => (
        <Tag color={s === 'COMPLETED' ? 'green' : s === 'PENDING' ? 'orange' : 'red'}>
          {s === 'COMPLETED' ? 'Effectue' : s === 'PENDING' ? 'En attente' : 'Echoue'}
        </Tag>
      ),
    },
  ];

  const channelValue = Form.useWatch('channel', form);

  const exportCols = [
    { title: 'Date', key: 'createdAt', format: (v: any) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: 'Reference', key: 'reference' },
    { title: 'Type', key: 'type', format: (v: any) => typeLabels[v] || v },
    { title: 'Client', key: 'fromAccount', format: (_: any, r: any) => {
      const acc = r.fromAccount || r.toAccount;
      const c = acc?.client;
      return c ? (c.clientType === 'MORALE' ? c.raisonSociale : `${c.firstName} ${c.lastName}`) : '';
    }},
    { title: 'Montant (FCFA)', key: 'amount', format: (v: any) => Number(v).toLocaleString('fr-FR') },
    { title: 'Frais', key: 'fees', format: (v: any) => Number(v || 0).toLocaleString('fr-FR') },
    { title: 'Statut', key: 'status', format: (v: any) => v === 'COMPLETED' ? 'Effectue' : v },
  ];

  const handleExportExcel = () => exportToExcel(transactions, exportCols, 'transactions');
  const handleExportPdf = () => exportToPdf({
    title: 'Liste des transactions',
    subtitle: `${transactions.length} transactions`,
    columns: exportCols, data: transactions, filename: 'transactions', orientation: 'landscape',
  });

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>Transactions</Title>
            <Text type="secondary">Historique des operations</Text>
          </Col>
          <Col>
            <Space>
              <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>Excel</Button>
              <Button icon={<FilePdfOutlined />} onClick={handleExportPdf}>PDF</Button>
              {canDeposit && !isReadOnly && (
                <>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenTx('deposit')}>Depot</Button>
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'cash',
                          label: 'Retrait especes',
                          icon: <SwapOutlined />,
                          onClick: () => handleOpenTxWithReset('withdrawal'),
                        },
                        {
                          key: 'cheque',
                          label: 'Retrait par cheque',
                          icon: <FileProtectOutlined />,
                          onClick: handleOpenRetraitCheque,
                        },
                      ],
                    }}
                  >
                    <Button icon={<SwapOutlined />}>Retrait</Button>
                  </Dropdown>
                  <Button onClick={() => handleOpenTx('transfer')}>Transfert</Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        <Table dataSource={transactions} columns={columns} loading={loading} rowKey="id" size="small"
          pagination={{ pageSize: 15, showTotal: (t) => `${t} transactions` }} />
      </Card>

      {/* Modal transaction */}
      <Modal
        title={txType === 'deposit' ? 'Nouveau depot' : txType === 'withdrawal' ? 'Nouveau retrait' : 'Nouveau transfert'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setWithdrawalClientInfo(null); }}
        okText="Valider"
        cancelText="Annuler"
        width={txType === 'withdrawal' ? 700 : 600}
      >
        <Form form={form} layout="vertical">
          {(txType === 'deposit') && (
            <Form.Item name="toAccountId" label="Compte a crediter" rules={[{ required: true }]}>
              <Select showSearch placeholder="Chercher un compte..." optionFilterProp="label"
                options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))} />
            </Form.Item>
          )}
          {(txType === 'withdrawal') && (
            <>
              <Form.Item name="fromAccountId" label="Compte a debiter" rules={[{ required: true }]}>
                <Select showSearch placeholder="Chercher un compte..." optionFilterProp="label"
                  options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))}
                  onChange={handleWithdrawalAccountSelect} />
              </Form.Item>

              {withdrawalClientLoading && (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <Text type="secondary">Chargement des informations...</Text>
                </div>
              )}

              {withdrawalClientInfo && !withdrawalClientLoading && (
                <div style={{ background: '#f6f8fc', border: '1px solid #d9e4f5', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
                    <Col>
                      {withdrawalClientInfo.client?.profilePhoto ? (
                        <Avatar size={64} src={withdrawalClientInfo.client.profilePhoto} />
                      ) : (
                        <Avatar size={64} icon={<UserOutlined />} style={{ background: '#1B2A4A' }} />
                      )}
                    </Col>
                    <Col flex="auto">
                      <Text strong style={{ fontSize: 16, color: '#1B2A4A', display: 'block' }}>
                        {withdrawalClientInfo.client?.clientType === 'MORALE'
                          ? withdrawalClientInfo.client.raisonSociale
                          : `${withdrawalClientInfo.client?.firstName || ''} ${withdrawalClientInfo.client?.lastName || ''}`}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {withdrawalClientInfo.client?.phone} | {withdrawalClientInfo.client?.email || '-'}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {withdrawalClientInfo.client?.idDocumentType} : {withdrawalClientInfo.client?.idDocumentNumber}
                      </Text>
                    </Col>
                    <Col>
                      <div style={{ textAlign: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#888', display: 'block' }}>Solde</Text>
                        <Text style={{ fontSize: 22, fontWeight: 800, color: '#F5A623' }}>
                          {Number(withdrawalClientInfo.account?.balance || 0).toLocaleString('fr-FR')} FCFA
                        </Text>
                      </div>
                    </Col>
                  </Row>

                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong style={{ fontSize: 12, color: '#1B2A4A', display: 'block', marginBottom: 8 }}>
                    Specimens de signature
                  </Text>
                  <Row gutter={8}>
                    {['signatureData', 'signatureData2', 'signatureData3'].map((key, i) => (
                      <Col span={8} key={key}>
                        <div style={{
                          border: withdrawalClientInfo.client?.[key] ? '2px solid #1B2A4A' : '1px dashed #d9d9d9',
                          borderRadius: 6, padding: 4, textAlign: 'center',
                          background: '#fff', minHeight: 60,
                        }}>
                          {withdrawalClientInfo.client?.[key] ? (
                            <img src={withdrawalClientInfo.client[key]} alt={`Signature ${i + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 56, objectFit: 'contain' }} />
                          ) : (
                            <Text type="secondary" style={{ fontSize: 10, lineHeight: '56px' }}>Non enregistree</Text>
                          )}
                        </div>
                        <Text style={{ fontSize: 10, color: '#888', display: 'block', textAlign: 'center' }}>
                          Signature {i + 1}
                        </Text>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </>
          )}
          {(txType === 'transfer') && (
            <>
              <Form.Item name="fromAccountId" label="Compte source (debit)" rules={[{ required: true }]}>
                <Select showSearch placeholder="Chercher un compte..." optionFilterProp="label"
                  options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))} />
              </Form.Item>
              <Form.Item name="toAccountId" label="Compte destination (credit)" rules={[{ required: true }]}>
                <Select showSearch placeholder="Chercher un compte..." optionFilterProp="label"
                  options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))} />
              </Form.Item>
            </>
          )}

          <Form.Item name="amount" label="Montant (FCFA)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={100}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
          </Form.Item>

          {(txType === 'deposit' || txType === 'withdrawal') && (
            <>
              <Form.Item name="channel" label="Mode de paiement" rules={[{ required: true }]}>
                <Select placeholder="Selectionner">
                  <Select.Option value="CASH">Especes (Guichet)</Select.Option>
                  <Select.Option value="ORANGE_MONEY">Orange Money</Select.Option>
                  <Select.Option value="MTN_MOMO">MTN MoMo</Select.Option>
                  <Select.Option value="EXPRESS_UNION">Express Union</Select.Option>
                </Select>
              </Form.Item>
              {channelValue && channelValue !== 'CASH' && (
                <Form.Item name="mobileMoneyPhone" label="N° telephone Mobile Money" rules={[{ required: true }]}>
                  <Input placeholder="+237 6XX XXX XXX" />
                </Form.Item>
              )}
            </>
          )}

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

        </Form>
      </Modal>

      {/* Modal Retrait par cheque — 3 etapes */}
      <Modal
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#1B2A4A', fontSize: 20 }} />
            <span>Retrait par cheque</span>
          </Space>
        }
        open={retraitChequeModal}
        onCancel={() => setRetraitChequeModal(false)}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Steps
          current={retraitChequeStep}
          style={{ marginBottom: 24 }}
          items={[
            { title: 'Selection du compte' },
            { title: 'Infos du cheque' },
            { title: 'Verification et confirmation' },
          ]}
        />

        {/* Etape 1 : Selection du compte */}
        {retraitChequeStep === 0 && (
          <div>
            <Select
              showSearch
              placeholder="Chercher un compte..."
              optionFilterProp="label"
              style={{ width: '100%', marginBottom: 16 }}
              options={accounts.map(a => ({ value: a.id, label: getAccountLabel(a) }))}
              onChange={handleRetraitChequeSelectAccount}
              loading={retraitAccountLoading}
            />

            {retraitAccountLoading && <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>}

            {retraitAccountInfo && !retraitAccountLoading && (
              <div>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={16}>
                    <Descriptions bordered column={2} size="small">
                      <Descriptions.Item label="Titulaire" span={2}>
                        <Space>
                          {retraitAccountInfo.client?.profilePhoto ? (
                            <Avatar size={48} src={retraitAccountInfo.client.profilePhoto} />
                          ) : (
                            <Avatar size={48} icon={<UserOutlined />} style={{ background: '#1B2A4A' }} />
                          )}
                          <div>
                            <Text strong style={{ fontSize: 15, color: '#1B2A4A' }}>
                              {retraitAccountInfo.client?.clientType === 'MORALE'
                                ? retraitAccountInfo.client?.raisonSociale
                                : `${retraitAccountInfo.client?.firstName || ''} ${retraitAccountInfo.client?.lastName || ''}`}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>{retraitAccountInfo.client?.clientNumber}</Text>
                          </div>
                        </Space>
                      </Descriptions.Item>
                      <Descriptions.Item label="Telephone">{retraitAccountInfo.client?.phone}</Descriptions.Item>
                      <Descriptions.Item label="Email">{retraitAccountInfo.client?.email || '-'}</Descriptions.Item>
                      <Descriptions.Item label="Piece d'identite">
                        {retraitAccountInfo.client?.idDocumentType} : {retraitAccountInfo.client?.idDocumentNumber}
                      </Descriptions.Item>
                      <Descriptions.Item label="Adresse">
                        {retraitAccountInfo.client?.address}, {retraitAccountInfo.client?.city}
                      </Descriptions.Item>
                      <Descriptions.Item label="N° compte">{retraitAccountInfo.account?.accountNumber}</Descriptions.Item>
                      <Descriptions.Item label="Solde">
                        <Text style={{ fontSize: 20, fontWeight: 800, color: '#F5A623' }}>
                          {Number(retraitAccountInfo.account?.balance || 0).toLocaleString('fr-FR')} FCFA
                        </Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Col>
                  <Col span={8}>
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 12, height: '100%' }}>
                      <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A', fontSize: 13 }}>
                        Specimens de signature
                      </Text>
                      {['signatureData', 'signatureData2', 'signatureData3'].map((key, i) => (
                        <div key={key} style={{
                          border: retraitAccountInfo.client?.[key] ? '1.5px solid #1B2A4A' : '1px dashed #d9d9d9',
                          borderRadius: 4, padding: 4, textAlign: 'center', marginBottom: 6,
                          background: '#fff', minHeight: 45,
                        }}>
                          {retraitAccountInfo.client?.[key] ? (
                            <img src={retraitAccountInfo.client[key]} alt={`Sig ${i + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 40, objectFit: 'contain' }} />
                          ) : (
                            <Text type="secondary" style={{ fontSize: 10, lineHeight: '40px' }}>Signature {i + 1} — vide</Text>
                          )}
                        </div>
                      ))}
                    </div>
                  </Col>
                </Row>

                <div style={{ textAlign: 'right' }}>
                  <Button type="primary" onClick={() => setRetraitChequeStep(1)}
                    style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}>
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Etape 2 : Infos du cheque — saisie ou selection */}
        {retraitChequeStep === 1 && (() => {
          const allEmittedCheques = (retraitAccountInfo?.checkbooks || []).flatMap(
            (cb: any) => (cb.cheques || []).filter((c: any) => c.status === 'EMIS')
          );
          return (
            <div>
              {allEmittedCheques.length > 0 && (
                <>
                  <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A' }}>
                    Cheques emis disponibles — cliquez pour selectionner :
                  </Text>
                  <Table
                    dataSource={allEmittedCheques}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    style={{ marginBottom: 16 }}
                    onRow={(record: any) => ({
                      onClick: () => setSelectedRetraitCheque(record),
                      style: {
                        cursor: 'pointer',
                        backgroundColor: selectedRetraitCheque?.id === record.id ? '#e6f4ff' : undefined,
                      },
                    })}
                    columns={[
                      { title: 'N° cheque', dataIndex: 'chequeNumber', key: 'chequeNumber' },
                      {
                        title: 'Montant (FCFA)', dataIndex: 'amount', key: 'amount', align: 'right' as const,
                        render: (v: any) => v ? <Text strong>{Number(v).toLocaleString('fr-FR')}</Text> : '-',
                      },
                      { title: 'Beneficiaire', dataIndex: 'beneficiary', key: 'beneficiary' },
                      {
                        title: 'Date emission', dataIndex: 'emittedAt', key: 'emittedAt',
                        render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-',
                      },
                    ]}
                  />
                  {selectedRetraitCheque && (
                    <Alert type="info" showIcon style={{ marginBottom: 16 }}
                      message={`Cheque selectionne : ${selectedRetraitCheque.chequeNumber} — ${Number(selectedRetraitCheque.amount).toLocaleString('fr-FR')} FCFA`}
                    />
                  )}
                  <Divider>OU saisie manuelle</Divider>
                </>
              )}

              <Card size="small" title="Saisie des informations du cheque" style={{ marginBottom: 16 }}>
                <Form layout="vertical">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="N° du cheque" required>
                        <Input
                          placeholder="Ex: CHQ-000001"
                          value={selectedRetraitCheque?.manualChequeNumber || ''}
                          onChange={e => setSelectedRetraitCheque((prev: any) => ({
                            ...prev, manualChequeNumber: e.target.value, isManual: true,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Montant (FCFA)" required>
                        <InputNumber
                          style={{ width: '100%' }}
                          min={100}
                          placeholder="Montant du cheque"
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                          value={selectedRetraitCheque?.manualAmount || undefined}
                          onChange={v => setSelectedRetraitCheque((prev: any) => ({
                            ...prev, manualAmount: v, isManual: true,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="Nom du porteur (personne presente)" required>
                        <Input
                          placeholder="Nom complet du porteur du cheque"
                          value={selectedRetraitCheque?.manualPorteur || ''}
                          onChange={e => setSelectedRetraitCheque((prev: any) => ({
                            ...prev, manualPorteur: e.target.value, isManual: true,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="N° carte d'identite du porteur" required>
                        <Input
                          placeholder="Ex: 123456789"
                          value={selectedRetraitCheque?.manualIdCard || ''}
                          onChange={e => setSelectedRetraitCheque((prev: any) => ({
                            ...prev, manualIdCard: e.target.value, isManual: true,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setRetraitChequeStep(0)}>Precedent</Button>
                <Button
                  type="primary"
                  style={{ background: '#1B2A4A', borderColor: '#1B2A4A' }}
                  disabled={
                    selectedRetraitCheque?.isManual
                      ? !(selectedRetraitCheque?.manualChequeNumber && selectedRetraitCheque?.manualAmount && selectedRetraitCheque?.manualPorteur && selectedRetraitCheque?.manualIdCard)
                      : !selectedRetraitCheque
                  }
                  onClick={() => setRetraitChequeStep(2)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Etape 3 : Verification et confirmation */}
        {retraitChequeStep === 2 && selectedRetraitCheque && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="N° cheque">
                <Text strong>{selectedRetraitCheque.chequeNumber || selectedRetraitCheque.manualChequeNumber}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Montant">
                <span style={{ fontSize: 20, fontWeight: 800, color: '#F5A623' }}>
                  {Number(selectedRetraitCheque.amount || selectedRetraitCheque.manualAmount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Beneficiaire / Porteur">
                {selectedRetraitCheque.beneficiary || selectedRetraitCheque.manualPorteur}
              </Descriptions.Item>
              <Descriptions.Item label="N° compte emetteur">
                {retraitAccountInfo?.account?.accountNumber}
              </Descriptions.Item>
              {selectedRetraitCheque.isManual && (
                <>
                  <Descriptions.Item label="Porteur du cheque">
                    <Text strong>{selectedRetraitCheque.manualPorteur}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="N° carte d'identite">
                    <Text strong>{selectedRetraitCheque.manualIdCard}</Text>
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>

            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A', fontSize: 14 }}>
              Specimens de signature du titulaire du compte
            </Text>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              {['signatureData', 'signatureData2', 'signatureData3'].map((key, i) => (
                <Col span={8} key={key}>
                  <div style={{
                    border: retraitAccountInfo?.client?.[key] ? '2px solid #1B2A4A' : '1px dashed #d9d9d9',
                    borderRadius: 6, padding: 6, textAlign: 'center', background: '#fff', minHeight: 70,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {retraitAccountInfo?.client?.[key] ? (
                      <img src={retraitAccountInfo.client[key]} alt={`Sig ${i + 1}`}
                        style={{ maxWidth: '100%', maxHeight: 55, objectFit: 'contain' }} />
                    ) : (
                      <Text type="secondary" style={{ fontSize: 10 }}>Signature {i + 1} — vide</Text>
                    )}
                  </div>
                </Col>
              ))}
            </Row>

            <div style={{
              background: '#fff7e6', border: '1px solid #ffd591',
              borderRadius: 8, padding: 14, marginBottom: 16,
            }}>
              <Checkbox checked={retraitVerified} onChange={e => setRetraitVerified(e.target.checked)}>
                <strong>Je confirme avoir verifie :</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 12, color: '#595959' }}>
                  <li>L'identite du porteur (piece d'identite en cours de validite)</li>
                  <li>La signature sur le cheque correspond aux specimens enregistres ci-dessus</li>
                  <li>Le montant et le beneficiaire sont corrects</li>
                  <li>La provision est suffisante sur le compte</li>
                </ul>
              </Checkbox>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={() => { setRetraitChequeStep(1); setRetraitVerified(false); }}>Precedent</Button>
              <Button
                type="primary"
                disabled={!retraitVerified}
                loading={retraitLoading}
                onClick={handleConfirmRetraitCheque}
                style={{ background: '#F5A623', borderColor: '#F5A623' }}
                icon={<CheckCircleOutlined />}
                size="large"
              >
                Confirmer le retrait — {Number(selectedRetraitCheque.amount || selectedRetraitCheque.manualAmount || 0).toLocaleString('fr-FR')} FCFA
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Verification Signataire (Personne Morale) */}
      <Modal
        title={
          <Space>
            <SafetyOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
            <span>Verification du signataire — Personne Morale</span>
          </Space>
        }
        open={signataireModalOpen}
        onCancel={() => setSignataireModalOpen(false)}
        width={700}
        footer={[
          <Button key="cancel" onClick={() => setSignataireModalOpen(false)}>Annuler</Button>,
          <Button
            key="confirm"
            type="primary"
            disabled={!selectedSignataire || !identiteVerifiee}
            icon={<CheckCircleOutlined />}
            onClick={handleConfirmSignataire}
          >
            Confirmer et valider l'operation
          </Button>,
        ]}
      >
        {signataireData && (
          <div>
            <Alert
              type="warning"
              showIcon
              icon={<ExclamationCircleOutlined />}
              message="Compte de Personne Morale — Verification obligatoire"
              description={
                <span>
                  Ce compte appartient a <strong>{signataireData.raisonSociale}</strong> ({signataireData.formeJuridique}).
                  {signataireData.signatureRule === 'JOINT' && (
                    <Tag color="red" style={{ marginLeft: 8 }}>Signature conjointe requise</Tag>
                  )}
                </span>
              }
              style={{ marginBottom: 16 }}
            />

            <Text strong style={{ display: 'block', marginBottom: 12, color: '#1B2A4A' }}>
              <UserOutlined /> Signataires autorises ({signataireData.signataires.length})
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
              Selectionnez la personne presente au guichet et verifiez son identite.
            </Text>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {signataireData.signataires.map((sig: any) => (
                <Card
                  key={sig.id}
                  size="small"
                  hoverable
                  onClick={() => setSelectedSignataire(sig.id)}
                  style={{
                    borderRadius: 8,
                    border: selectedSignataire === sig.id ? '2px solid #1B2A4A' : '1px solid #d9d9d9',
                    background: selectedSignataire === sig.id ? '#f0f5ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <Row align="middle" gutter={16}>
                    <Col flex="50px">
                      <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: selectedSignataire === sig.id ? '#1B2A4A' : '#ccc' }} />
                    </Col>
                    <Col flex="auto">
                      <div>
                        <Text strong style={{ fontSize: 15 }}>{sig.firstName} {sig.lastName}</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>{ROLES_LABELS[sig.role] || sig.role}</Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {sig.clientNumber} | Tel: {sig.phone}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Piece: {sig.idDocumentType} — {sig.idDocumentNumber}
                      </Text>
                    </Col>
                    {selectedSignataire === sig.id && (
                      <Col>
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 24 }} />
                      </Col>
                    )}
                  </Row>
                </Card>
              ))}
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 8,
              padding: 16,
            }}>
              <Checkbox
                checked={identiteVerifiee}
                onChange={e => setIdentiteVerifiee(e.target.checked)}
                style={{ fontSize: 13 }}
              >
                <strong>Je confirme avoir verifie :</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 20, fontSize: 12, color: '#595959' }}>
                  <li>L'identite du signataire (piece d'identite en cours de validite)</li>
                  <li>La correspondance de la signature avec le specimen enregistre</li>
                  <li>Que cette personne est autorisee a effectuer cette operation</li>
                </ul>
              </Checkbox>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
