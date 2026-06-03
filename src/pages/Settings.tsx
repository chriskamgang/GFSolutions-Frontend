import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Typography, Descriptions, Tabs, Button, message, Input, Space, Alert, Tag, Row, Col, Statistic,
  Table, Modal, Form, InputNumber, Switch, Spin, Divider, Select,
} from 'antd';
import {
  SettingOutlined, SafetyOutlined, ClockCircleOutlined,
  CheckCircleOutlined, LockOutlined, LogoutOutlined,
  DollarOutlined, ShoppingOutlined, PlusOutlined, EditOutlined,
  MessageOutlined, SendOutlined, EyeInvisibleOutlined, EyeOutlined,
  WhatsAppOutlined, ReloadOutlined, DisconnectOutlined, MobileOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

const { Title, Text } = Typography;

// ===================== TYPES =====================
interface GeneralSettings {
  companyName?: string;
  currency?: string;
  taxRate?: number;
  country?: string;
  language?: string;
  regulator?: string;
  smsProvider?: string;
  mobileMoneyProviders?: string[];
  minBalance?: number;
  [key: string]: any;
}

interface FeeConfig {
  id: number;
  name: string;
  transactionType: string;
  rate: number;
  fixedAmount: number;
  minAmount: number;
  maxAmount: number;
  isActive: boolean;
}

interface CreditProduct {
  id: number;
  name: string;
  interestRate: number;
  minAmount: number;
  maxAmount: number;
  maxDuration: number;
  isActive: boolean;
}

interface SavingsProduct {
  id: number;
  name: string;
  interestRate: number;
  contributionAmount: number;
  frequency: string;
  isActive?: boolean;
}

// ===================== CONFIG GENERALE =====================
function ConfigTab({ general, loading }: { general: GeneralSettings | null; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;
  }

  if (!general) {
    return <Alert type="warning" showIcon message="Impossible de charger la configuration generale." />;
  }

  const items: { label: string; value: string }[] = [
    { label: 'Nom de la microfinance', value: general.companyName || '-' },
    { label: 'Devise', value: general.currency || '-' },
    { label: 'Taux TVA', value: general.taxRate != null ? `${general.taxRate}%` : '-' },
    { label: 'Solde minimum compte', value: general.minBalance != null ? `${general.minBalance?.toLocaleString('fr-FR')} FCFA` : '-' },
    { label: 'Fournisseur SMS', value: general.smsProvider || 'Non configure' },
    { label: 'Operateurs Mobile Money', value: Array.isArray(general.mobileMoneyProviders) ? general.mobileMoneyProviders.join(', ') : (general.mobileMoneyProviders || '-') },
    { label: 'Langue par defaut', value: general.language || '-' },
    { label: 'Pays', value: general.country || '-' },
    { label: 'Regulateur', value: general.regulator || '-' },
  ];

  return (
    <Descriptions column={1} bordered size="middle">
      {items.map((item, idx) => (
        <Descriptions.Item key={idx} label={item.label}>
          {item.value}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}

// ===================== FRAIS & COMMISSIONS =====================
function FeesTab({
  feeConfigs,
  loading,
  onRefresh,
  canEdit,
}: {
  feeConfigs: FeeConfig[];
  loading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openEdit = (fee: FeeConfig) => {
    setEditingFee(fee);
    form.setFieldsValue({
      rate: fee.rate,
      fixedAmount: fee.fixedAmount,
      minAmount: fee.minAmount,
      maxAmount: fee.maxAmount,
      isActive: fee.isActive,
    });
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingFee(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, rate: 0, fixedAmount: 0, minAmount: 0, maxAmount: 0 });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (editingFee) {
        await api.patch(`/settings/fee-configs/${editingFee.id}`, values);
        message.success('Frais modifie avec succes');
      } else {
        await api.post('/settings/fee-configs', values);
        message.success('Frais cree avec succes');
      }
      setModalOpen(false);
      form.resetFields();
      onRefresh();
    } catch (err: any) {
      if (err.response) {
        message.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Type de transaction', dataIndex: 'transactionType', key: 'transactionType' },
    {
      title: 'Taux %',
      dataIndex: 'rate',
      key: 'rate',
      render: (v: number) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Montant fixe',
      dataIndex: 'fixedAmount',
      key: 'fixedAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')} FCFA` : '-',
    },
    {
      title: 'Min',
      dataIndex: 'minAmount',
      key: 'minAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')}` : '-',
    },
    {
      title: 'Max',
      dataIndex: 'maxAmount',
      key: 'maxAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')}` : '-',
    },
    {
      title: 'Actif',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => v ? <Tag color="green">Actif</Tag> : <Tag color="default">Inactif</Tag>,
    },
    ...(canEdit
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: any, record: FeeConfig) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
                Modifier
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {canEdit && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Nouveau frais
          </Button>
        </div>
      )}

      <Table
        dataSource={feeConfigs}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Aucun frais configure' }}
      />

      <Modal
        title={editingFee ? 'Modifier le frais' : 'Nouveau frais'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Enregistrer"
        cancelText="Annuler"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editingFee && (
            <>
              <Form.Item name="name" label="Nom" rules={[{ required: true, message: 'Requis' }]}>
                <Input placeholder="Ex: Commission de depot" />
              </Form.Item>
              <Form.Item name="transactionType" label="Type de transaction" rules={[{ required: true, message: 'Requis' }]}>
                <Select placeholder="Selectionnez">
                  <Select.Option value="DEPOSIT">Depot</Select.Option>
                  <Select.Option value="WITHDRAWAL">Retrait</Select.Option>
                  <Select.Option value="TRANSFER">Transfert</Select.Option>
                  <Select.Option value="MOBILE_MONEY">Mobile Money</Select.Option>
                  <Select.Option value="OTHER">Autre</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
          <Form.Item name="rate" label="Taux (%)" rules={[{ required: true, message: 'Requis' }]}>
            <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} addonAfter="%" />
          </Form.Item>
          <Form.Item name="fixedAmount" label="Montant fixe (FCFA)">
            <InputNumber min={0} step={100} style={{ width: '100%' }} addonAfter="FCFA" />
          </Form.Item>
          <Form.Item name="minAmount" label="Montant minimum">
            <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="FCFA" />
          </Form.Item>
          <Form.Item name="maxAmount" label="Montant maximum">
            <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="FCFA" />
          </Form.Item>
          <Form.Item name="isActive" label="Actif" valuePropName="checked">
            <Switch checkedChildren="Oui" unCheckedChildren="Non" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ===================== PRODUITS CREDIT & EPARGNE =====================
function ProductsTab({
  creditProducts,
  savingsProducts,
  loading,
  onRefresh,
  canEdit,
}: {
  creditProducts: CreditProduct[];
  savingsProducts: SavingsProduct[];
  loading: boolean;
  onRefresh: () => void;
  canEdit: boolean;
}) {
  const [modalType, setModalType] = useState<'credit' | 'savings' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const openEditCredit = (item: CreditProduct) => {
    setModalType('credit');
    setEditingItem(item);
    form.setFieldsValue({
      interestRate: item.interestRate,
      minAmount: item.minAmount,
      maxAmount: item.maxAmount,
      maxDuration: item.maxDuration,
      isActive: item.isActive,
    });
  };

  const openCreateCredit = () => {
    setModalType('credit');
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true });
  };

  const openEditSavings = (item: SavingsProduct) => {
    setModalType('savings');
    setEditingItem(item);
    form.setFieldsValue({
      interestRate: item.interestRate,
      contributionAmount: item.contributionAmount,
      frequency: item.frequency,
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      if (modalType === 'credit') {
        if (editingItem) {
          await api.patch(`/settings/credit-products/${editingItem.id}`, values);
          message.success('Produit de credit modifie');
        } else {
          await api.post('/settings/credit-products', values);
          message.success('Produit de credit cree');
        }
      } else if (modalType === 'savings' && editingItem) {
        await api.patch(`/settings/savings-products/${editingItem.id}`, values);
        message.success('Produit d\'epargne modifie');
      }
      setModalType(null);
      setEditingItem(null);
      form.resetFields();
      onRefresh();
    } catch (err: any) {
      if (err.response) {
        message.error(err.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    } finally {
      setSaving(false);
    }
  };

  const creditColumns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Taux d\'interet',
      dataIndex: 'interestRate',
      key: 'interestRate',
      render: (v: number) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Montant min',
      dataIndex: 'minAmount',
      key: 'minAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')} FCFA` : '-',
    },
    {
      title: 'Montant max',
      dataIndex: 'maxAmount',
      key: 'maxAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')} FCFA` : '-',
    },
    {
      title: 'Duree max',
      dataIndex: 'maxDuration',
      key: 'maxDuration',
      render: (v: number) => v != null ? `${v} mois` : '-',
    },
    {
      title: 'Actif',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (v: boolean) => v ? <Tag color="green">Actif</Tag> : <Tag color="default">Inactif</Tag>,
    },
    ...(canEdit
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: any, record: CreditProduct) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditCredit(record)}>
                Modifier
              </Button>
            ),
          },
        ]
      : []),
  ];

  const savingsColumns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    {
      title: 'Taux d\'interet',
      dataIndex: 'interestRate',
      key: 'interestRate',
      render: (v: number) => v != null ? `${v}%` : '-',
    },
    {
      title: 'Montant cotisation',
      dataIndex: 'contributionAmount',
      key: 'contributionAmount',
      render: (v: number) => v != null ? `${v?.toLocaleString('fr-FR')} FCFA` : '-',
    },
    { title: 'Frequence', dataIndex: 'frequency', key: 'frequency' },
    ...(canEdit
      ? [
          {
            title: 'Action',
            key: 'action',
            render: (_: any, record: SavingsProduct) => (
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditSavings(record)}>
                Modifier
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Produits de credit */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Title level={5} style={{ margin: 0 }}>Produits de credit</Title>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateCredit}>
            Nouveau produit
          </Button>
        )}
      </div>
      <Table
        dataSource={creditProducts}
        columns={creditColumns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Aucun produit de credit' }}
      />

      <Divider />

      {/* Produits d'epargne */}
      <Title level={5} style={{ marginBottom: 12 }}>Produits d'epargne</Title>
      <Table
        dataSource={savingsProducts}
        columns={savingsColumns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        locale={{ emptyText: 'Aucun produit d\'epargne' }}
      />

      {/* Modal credit */}
      <Modal
        title={
          modalType === 'credit'
            ? (editingItem ? 'Modifier le produit de credit' : 'Nouveau produit de credit')
            : 'Modifier le produit d\'epargne'
        }
        open={modalType !== null}
        onCancel={() => { setModalType(null); setEditingItem(null); form.resetFields(); }}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Enregistrer"
        cancelText="Annuler"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {modalType === 'credit' && (
            <>
              {!editingItem && (
                <Form.Item name="name" label="Nom du produit" rules={[{ required: true, message: 'Requis' }]}>
                  <Input placeholder="Ex: Credit express" />
                </Form.Item>
              )}
              <Form.Item name="interestRate" label="Taux d'interet (%)" rules={[{ required: true, message: 'Requis' }]}>
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item name="minAmount" label="Montant minimum">
                <InputNumber min={0} step={10000} style={{ width: '100%' }} addonAfter="FCFA" />
              </Form.Item>
              <Form.Item name="maxAmount" label="Montant maximum">
                <InputNumber min={0} step={10000} style={{ width: '100%' }} addonAfter="FCFA" />
              </Form.Item>
              <Form.Item name="maxDuration" label="Duree maximum (mois)">
                <InputNumber min={1} max={360} step={1} style={{ width: '100%' }} addonAfter="mois" />
              </Form.Item>
              <Form.Item name="isActive" label="Actif" valuePropName="checked">
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>
            </>
          )}
          {modalType === 'savings' && (
            <>
              <Form.Item name="interestRate" label="Taux d'interet (%)" rules={[{ required: true, message: 'Requis' }]}>
                <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} addonAfter="%" />
              </Form.Item>
              <Form.Item name="contributionAmount" label="Montant cotisation">
                <InputNumber min={0} step={1000} style={{ width: '100%' }} addonAfter="FCFA" />
              </Form.Item>
              <Form.Item name="frequency" label="Frequence">
                <Select placeholder="Selectionnez">
                  <Select.Option value="DAILY">Quotidienne</Select.Option>
                  <Select.Option value="WEEKLY">Hebdomadaire</Select.Option>
                  <Select.Option value="MONTHLY">Mensuelle</Select.Option>
                  <Select.Option value="QUARTERLY">Trimestrielle</Select.Option>
                  <Select.Option value="ANNUALLY">Annuelle</Select.Option>
                </Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}

// ===================== SECURITE & 2FA =====================
function SecurityTab() {
  const { user, logout } = useAuth();
  const [twoFAEnabled, setTwoFAEnabled] = useState(user?.twoFactorEnabled || false);
  const [setupData, setSetupData] = useState<any>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Changement de mot de passe
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleSetup2FA = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSetupData(data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      message.warning('Entrez un code a 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { totpCode: verifyCode });
      message.success('2FA active avec succes !');
      setTwoFAEnabled(true);
      setSetupData(null);
      setVerifyCode('');
      // Mettre a jour le user en localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.twoFactorEnabled = true;
      localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      message.warning('Entrez un code a 6 chiffres');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { totpCode: disableCode });
      message.success('2FA desactive');
      setTwoFAEnabled(false);
      setDisableCode('');
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.twoFactorEnabled = false;
      localStorage.setItem('user', JSON.stringify(storedUser));
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      message.warning('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 8) {
      message.warning('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }
    setChangingPwd(true);
    try {
      await api.patch('/auth/change-password', { oldPassword, newPassword });
      message.success('Mot de passe modifie. Reconnexion requise.');
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur changement mot de passe');
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div>
      <Row gutter={24}>
        {/* 2FA */}
        <Col xs={24} lg={12}>
          <Card
            title={<span><SafetyOutlined /> Authentification a deux facteurs (2FA)</span>}
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text>Statut : </Text>
              {twoFAEnabled ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>Active</Tag>
              ) : (
                <Tag color="default">Desactive</Tag>
              )}
            </div>

            {!twoFAEnabled && !setupData && (
              <div>
                <Alert
                  type="info"
                  showIcon
                  message="Le 2FA ajoute une couche de securite supplementaire a votre compte en exigeant un code de verification a chaque connexion."
                  style={{ marginBottom: 12 }}
                />
                <Button type="primary" onClick={handleSetup2FA} loading={loading} icon={<SafetyOutlined />}>
                  Activer le 2FA
                </Button>
              </div>
            )}

            {setupData && !twoFAEnabled && (
              <div>
                <Alert type="warning" showIcon message="Scannez ce QR code avec Google Authenticator ou Authy" style={{ marginBottom: 12 }} />
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={setupData.qrCode} alt="QR Code 2FA" style={{ width: 200, height: 200 }} />
                </div>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>Cle secrete (si scan impossible) :</Text>
                  <br />
                  <Text code copyable style={{ fontSize: 12 }}>{setupData.secret}</Text>
                </div>
                <Space>
                  <Input
                    placeholder="Code a 6 chiffres"
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    maxLength={6}
                    style={{ width: 150 }}
                  />
                  <Button type="primary" onClick={handleVerify2FA} loading={loading}>
                    Verifier et activer
                  </Button>
                  <Button onClick={() => setSetupData(null)}>Annuler</Button>
                </Space>
              </div>
            )}

            {twoFAEnabled && (
              <div>
                <Alert type="success" showIcon message="Le 2FA est actif sur votre compte." style={{ marginBottom: 12 }} />
                <Space>
                  <Input
                    placeholder="Code a 6 chiffres"
                    value={disableCode}
                    onChange={e => setDisableCode(e.target.value)}
                    maxLength={6}
                    style={{ width: 150 }}
                  />
                  <Button danger onClick={handleDisable2FA} loading={loading}>
                    Desactiver le 2FA
                  </Button>
                </Space>
              </div>
            )}
          </Card>
        </Col>

        {/* Changement mot de passe */}
        <Col xs={24} lg={12}>
          <Card
            title={<span><LockOutlined /> Changer le mot de passe</span>}
            style={{ marginBottom: 16, borderRadius: 8 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input.Password
                placeholder="Ancien mot de passe"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
              />
              <Input.Password
                placeholder="Nouveau mot de passe (min. 8 caracteres)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
              <Input.Password
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <Button type="primary" onClick={handleChangePassword} loading={changingPwd} icon={<LockOutlined />}>
                Modifier le mot de passe
              </Button>
            </Space>
            <Alert
              type="warning"
              showIcon
              message="Le changement de mot de passe invalidera votre session actuelle."
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Info session */}
      <Card
        title={<span><ClockCircleOutlined /> Informations de session</span>}
        style={{ borderRadius: 8 }}
      >
        <Row gutter={24}>
          <Col xs={12} lg={6}>
            <Statistic title="Role" value={user?.role || '-'} />
          </Col>
          <Col xs={12} lg={6}>
            <Statistic title="Timeout session" value={user?.sessionTimeout || 30} suffix="min" />
          </Col>
          <Col xs={12} lg={6}>
            <Statistic title="2FA" value={twoFAEnabled ? 'Active' : 'Desactive'}
              valueStyle={{ color: twoFAEnabled ? '#52c41a' : '#8c8c8c' }} />
          </Col>
          <Col xs={12} lg={6}>
            <Button danger icon={<LogoutOutlined />} onClick={logout} style={{ marginTop: 8 }}>
              Se deconnecter
            </Button>
          </Col>
        </Row>
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          message="Connexion unique"
          description="Une seule session active par compte est autorisee. Si vous vous connectez depuis un autre appareil, votre session actuelle sera automatiquement invalidee."
        />
      </Card>
    </div>
  );
}

// ===================== SMS CONFIG =====================
function SmsTab({ canEdit }: { canEdit: boolean }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [configured, setConfigured] = useState(false);

  const fetchSmsConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/sms');
      form.setFieldsValue({ user: data.user, senderId: data.senderId, enabled: data.enabled });
      setConfigured(data.passwordConfigured);
    } catch {
      message.error('Impossible de charger la config SMS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSmsConfig(); }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.post('/settings/sms', values);
      message.success('Configuration SMS sauvegardee');
      setConfigured(true);
      if (values.password) form.setFieldValue('password', '');
    } catch (err: any) {
      if (err.response) message.error(err.response?.data?.message || 'Erreur sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const values = form.getFieldsValue();
    if (!values.testPhone) { message.warning('Entrez un numero de telephone pour le test'); return; }
    setTesting(true);
    try {
      const { data } = await api.post('/settings/sms/test', { phone: values.testPhone });
      if (data.success) message.success('SMS de test envoye !');
      else message.error('Echec envoi SMS de test');
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur lors du test SMS');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 560 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        message="Fournisseur SMS : NEXAH (smsvas.com)"
        description={
          <span>
            Creez un compte sur <strong>smsvas.com</strong> pour obtenir vos identifiants.
            Ces credentials permettent d'envoyer les SMS d'activation aux clients.
          </span>
        }
      />

      <div style={{ marginBottom: 16 }}>
        <Tag icon={<CheckCircleOutlined />} color={configured ? 'green' : 'default'}>
          {configured ? 'Credentials configures' : 'Non configure'}
        </Tag>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item name="enabled" label="Activer les SMS" valuePropName="checked" initialValue={true}>
          <Switch checkedChildren="Actif" unCheckedChildren="Inactif" disabled={!canEdit} />
        </Form.Item>

        <Form.Item name="user" label="Identifiant NEXAH (user)"
          rules={[{ required: true, message: 'Identifiant requis' }]}>
          <Input prefix={<MessageOutlined />} placeholder="Votre identifiant smsvas.com" disabled={!canEdit} />
        </Form.Item>

        <Form.Item
          name="password"
          label={configured ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe NEXAH'}
          rules={!configured ? [{ required: true, message: 'Mot de passe requis' }] : []}
        >
          <Input
            type={showPwd ? 'text' : 'password'}
            placeholder={configured ? '••••••••' : 'Mot de passe smsvas.com'}
            disabled={!canEdit}
            suffix={
              <span style={{ cursor: 'pointer' }} onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              </span>
            }
          />
        </Form.Item>

        <Form.Item name="senderId" label="Expediteur (Sender ID)" initialValue="GFS"
          rules={[{ required: true, message: 'Expediteur requis' }, { max: 11, message: 'Max 11 caracteres' }]}>
          <Input placeholder="Ex: GFS (max 11 car.)" disabled={!canEdit} />
        </Form.Item>

        {canEdit && (
          <Form.Item>
            <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave} style={{ marginRight: 12 }}>
              Sauvegarder
            </Button>
          </Form.Item>
        )}

        <Divider>Test de la configuration</Divider>

        <Form.Item name="testPhone" label="Numero de telephone pour test (+237XXXXXXXXX)">
          <Input placeholder="+237 6XX XXX XXX" style={{ width: '100%' }} />
        </Form.Item>

        <Button icon={<SendOutlined />} loading={testing} onClick={handleTest} disabled={!configured}>
          Envoyer un SMS de test
        </Button>
      </Form>
    </div>
  );
}

// ===================== WHATSAPP =====================
function WhatsappTab({ canEdit }: { canEdit: boolean }) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'qr_pending' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get('/whatsapp/status');
      setStatus(data.status);
      setQrCode(data.qrCode);
      setStatusMsg(data.message);
    } catch { /* silencieux */ }
  };

  // Poll toutes les 3s tant que non connecte
  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(() => {
      if (status !== 'connected') fetchStatus();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status]);

  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await api.post('/whatsapp/reconnect');
      message.info('Reconnexion lancee — le QR Code va apparaitre dans quelques secondes');
      setTimeout(fetchStatus, 2000);
    } catch { message.error('Erreur reconnexion'); }
    finally { setReconnecting(false); }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await api.post('/whatsapp/disconnect');
      message.success('WhatsApp deconnecte');
      setStatus('disconnected');
      setQrCode(null);
    } catch { message.error('Erreur deconnexion'); }
    finally { setLoading(false); }
  };

  const handleTest = async () => {
    if (!testPhone) { message.warning('Entrez un numero pour le test'); return; }
    setTesting(true);
    try {
      const { data } = await api.post('/whatsapp/test', { phone: testPhone });
      if (data.success) message.success('Message WhatsApp envoye !');
      else message.error('Echec — ' + data.message);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur test WhatsApp');
    } finally { setTesting(false); }
  };

  const statusColor: Record<string, string> = {
    connected: 'green',
    qr_pending: 'orange',
    connecting: 'blue',
    disconnected: 'red',
  };

  const statusIcon: Record<string, React.ReactNode> = {
    connected: <CheckCircleOutlined />,
    qr_pending: <MobileOutlined />,
    connecting: <ReloadOutlined spin />,
    disconnected: <DisconnectOutlined />,
  };

  return (
    <div>
      <Alert
        type="info"
        showIcon
        icon={<WhatsAppOutlined />}
        style={{ marginBottom: 24 }}
        message="WhatsApp Business via Baileys"
        description="Connectez un numero WhatsApp pour envoyer les identifiants clients, alertes de transactions et notifications directement sur WhatsApp. Scannez le QR Code avec le telephone qui sera le numero expediteur GFS."
      />

      {/* Statut */}
      <Card size="small" style={{ marginBottom: 20, borderRadius: 10 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Tag color={statusColor[status]} icon={statusIcon[status]} style={{ fontSize: 14, padding: '4px 12px' }}>
              {statusMsg || status}
            </Tag>
          </Col>
          <Col flex="auto" />
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} size="small" onClick={fetchStatus}>Actualiser</Button>
              {canEdit && status !== 'connected' && (
                <Button type="primary" icon={<ReloadOutlined />} size="small" loading={reconnecting} onClick={handleReconnect}
                  style={{ background: '#25D366', borderColor: '#25D366' }}>
                  Connecter / Nouveau QR
                </Button>
              )}
              {canEdit && status === 'connected' && (
                <Button danger size="small" icon={<DisconnectOutlined />} loading={loading} onClick={handleDisconnect}>
                  Deconnecter
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* QR Code */}
      {status === 'qr_pending' && qrCode && (
        <Card size="small" style={{ marginBottom: 20, borderRadius: 10, textAlign: 'center', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
          <Text strong style={{ display: 'block', marginBottom: 16, fontSize: 15 }}>
            <MobileOutlined /> Ouvrez WhatsApp sur votre telephone → Menu → Appareils lies → Lier un appareil → Scannez ce QR Code
          </Text>
          <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 260, height: 260, borderRadius: 8 }} />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
            Ce QR Code se regenere automatiquement. Actualisez si expire.
          </Text>
        </Card>
      )}

      {/* Test */}
      {status === 'connected' && (
        <Card size="small" title={<span><SendOutlined /> Test d'envoi</span>} style={{ marginBottom: 20, borderRadius: 10 }}>
          <Space>
            <Input
              placeholder="+237 6XX XXX XXX"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              style={{ width: 220 }}
            />
            <Button
              icon={<WhatsAppOutlined />}
              loading={testing}
              onClick={handleTest}
              style={{ background: '#25D366', borderColor: '#25D366', color: 'white' }}
            >
              Envoyer un message test
            </Button>
          </Space>
        </Card>
      )}

      <Alert
        type="warning"
        showIcon
        message="Remarques importantes"
        description={
          <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>Le numero WhatsApp connecte doit rester actif sur le telephone.</li>
            <li>Si le telephone est deconnecte de WhatsApp Web, re-scannez le QR Code.</li>
            <li>Utilisez un numero dedié GFS (pas le numero personnel d'un employe).</li>
            <li>La session est sauvegardee sur le serveur — pas besoin de re-scanner apres un redemarrage.</li>
          </ul>
        }
      />
    </div>
  );
}

// ===================== PAGE PRINCIPALE =====================
export default function Settings() {
  const { canUpdate, isReadOnly } = usePermissions();
  const canEdit = canUpdate('SETTINGS') && !isReadOnly;

  const [loading, setLoading] = useState(true);
  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [creditProducts, setCreditProducts] = useState<CreditProduct[]>([]);
  const [savingsProducts, setSavingsProducts] = useState<SavingsProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/settings');
      setGeneral(data.general || null);
      setFeeConfigs(data.feeConfigs || []);
      setCreditProducts(data.creditProducts || []);
      setSavingsProducts(data.savingsProducts || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erreur lors du chargement des parametres';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const tabItems = [
    {
      key: 'config',
      label: <span><SettingOutlined /> Configuration</span>,
      children: error && !general
        ? <Alert type="error" showIcon message={error} action={<Button size="small" onClick={fetchSettings}>Reessayer</Button>} />
        : <ConfigTab general={general} loading={loading} />,
    },
    {
      key: 'fees',
      label: <span><DollarOutlined /> Frais & Commissions</span>,
      children: error && feeConfigs.length === 0
        ? <Alert type="error" showIcon message={error} action={<Button size="small" onClick={fetchSettings}>Reessayer</Button>} />
        : <FeesTab feeConfigs={feeConfigs} loading={loading} onRefresh={fetchSettings} canEdit={canEdit} />,
    },
    {
      key: 'products',
      label: <span><ShoppingOutlined /> Produits Credit & Epargne</span>,
      children: error && creditProducts.length === 0 && savingsProducts.length === 0
        ? <Alert type="error" showIcon message={error} action={<Button size="small" onClick={fetchSettings}>Reessayer</Button>} />
        : <ProductsTab
            creditProducts={creditProducts}
            savingsProducts={savingsProducts}
            loading={loading}
            onRefresh={fetchSettings}
            canEdit={canEdit}
          />,
    },
    {
      key: 'sms',
      label: <span><MessageOutlined /> SMS Nexah</span>,
      children: <SmsTab canEdit={canEdit} />,
    },
    {
      key: 'whatsapp',
      label: <span><WhatsAppOutlined style={{ color: '#25D366' }} /> WhatsApp</span>,
      children: <WhatsappTab canEdit={canEdit} />,
    },
    {
      key: 'security',
      label: <span><SafetyOutlined /> Securite & 2FA</span>,
      children: <SecurityTab />,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <Title level={4} style={{ margin: 0 }}>Parametres</Title>
        <Text type="secondary">Configuration generale, frais, produits et securite du compte</Text>
      </div>

      <Card className="content-card" style={{ borderRadius: 8 }}>
        <Tabs items={tabItems} defaultActiveKey="config" />
      </Card>
    </div>
  );
}
