import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Card, Table, Button, Input, Space, Tag, Modal, Form,
  Select, DatePicker, Row, Col, Typography, message, Tooltip,
  Dropdown, Descriptions, Tabs, Badge, Radio, InputNumber,
  Popconfirm, Divider, Alert, Avatar, List, Upload,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, EyeOutlined,
  EditOutlined, UserOutlined, DownloadOutlined,
  QrcodeOutlined, StopOutlined, CheckCircleOutlined,
  LockOutlined, FileExcelOutlined, BankOutlined,
  TeamOutlined, DeleteOutlined,
  CameraOutlined, WarningOutlined, UploadOutlined,
  MergeCellsOutlined, SwapOutlined, MobileOutlined,
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import SignatureCanvas from 'react-signature-canvas';
import api from '../services/api';
import { usePermissions } from '../hooks/usePermissions';
import { exportToPdf } from '../utils/exportUtils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ROLES_MANDATAIRE = [
  { value: 'GERANT', label: 'Gerant' },
  { value: 'PRESIDENT', label: 'President' },
  { value: 'SECRETAIRE_GENERAL', label: 'Secretaire General' },
  { value: 'TRESORIER', label: 'Tresorier' },
  { value: 'DIRECTEUR', label: 'Directeur' },
];

const FORMES_JURIDIQUES = [
  { value: 'SA', label: 'SA' },
  { value: 'SARL', label: 'SARL' },
  { value: 'SAS', label: 'SAS' },
  { value: 'ASSOCIATION', label: 'Association' },
  { value: 'GIE', label: 'GIE' },
  { value: 'COOPERATIVE', label: 'Cooperative' },
];

const REGIONS_CAMEROUN = [
  'Littoral', 'Centre', 'Ouest', 'Nord-Ouest', 'Sud-Ouest',
  'Nord', 'Extreme-Nord', 'Adamaoua', 'Est', 'Sud',
];

export default function Clients() {
  const { canCreate, canUpdate } = usePermissions();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>('PHYSIQUE');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [form] = Form.useForm();
  const [clientType, setClientType] = useState<string>('PHYSIQUE');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [exporting, setExporting] = useState(false);

  // Anti-doublon
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);

  // Ouverture de compte apres creation
  const [openAccountModalOpen, setOpenAccountModalOpen] = useState(false);
  const [newCreatedClient, setNewCreatedClient] = useState<any>(null);
  const [accountForm] = Form.useForm();
  const [accountProducts, setAccountProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [initialDepositEnabled, setInitialDepositEnabled] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Webcam / Photo
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Signature electronique
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Specimens de signature (upload image)
  const [signaturePreview, setSignaturePreview] = useState<Record<string, string>>({});

  // Mandataire
  const [mandataireModalOpen, setMandataireModalOpen] = useState(false);
  const [mandataireForm] = Form.useForm();
  const [searchPhysique, setSearchPhysique] = useState('');
  const [physiquesFound, setPhysiquesFound] = useState<any[]>([]);
  const [mandataires, setMandataires] = useState<any[]>([]);

  // Activation acces mobile
  const [activatingMobile, setActivatingMobile] = useState(false);

  // Import CSV
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);

  // Fusion doublons
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergePrimaryId, setMergePrimaryId] = useState<string>('');
  const [mergeSecondaryId, setMergeSecondaryId] = useState<string>('');
  const [mergeSearchPrimary, setMergeSearchPrimary] = useState('');
  const [mergeSearchSecondary, setMergeSearchSecondary] = useState('');
  const [mergePrimaryResults, setMergePrimaryResults] = useState<any[]>([]);
  const [mergeSecondaryResults, setMergeSecondaryResults] = useState<any[]>([]);

  const fetchClients = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.clientType = typeFilter;
      const { data } = await api.get('/clients', { params });
      setClients(data.data || data);
      setPagination(prev => ({
        ...prev,
        total: data.meta?.total || data.total || data.length,
        current: page,
      }));
    } catch {
      message.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [statusFilter, typeFilter]);

  const handleSearch = () => fetchClients(1);

  // === ANTI-DOUBLON ===
  const checkDuplicates = async (values: any) => {
    try {
      const payload: any = { phone: values.phone };
      if (values.clientType === 'PHYSIQUE') {
        if (values.idDocumentNumber) payload.idDocumentNumber = values.idDocumentNumber;
        if (values.firstName) payload.firstName = values.firstName;
        if (values.lastName) payload.lastName = values.lastName;
        if (values.dateOfBirth) payload.dateOfBirth = values.dateOfBirth;
      } else {
        if (values.numeroEnregistrement) payload.numeroEnregistrement = values.numeroEnregistrement;
      }
      const { data } = await api.post('/clients/check-duplicate', payload);
      return data;
    } catch {
      return { duplicates: [], hasDuplicates: false };
    }
  };

  // === WEBCAM ===
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      setWebcamOpen(true);
    } catch {
      message.error('Impossible d\'acceder a la camera. Verifiez les permissions.');
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedPhoto(dataUrl);
      form.setFieldsValue({ profilePhoto: dataUrl });
      stopWebcam();
      message.success('Photo capturee avec succes');
    }
  }, [form]);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamOpen(false);
  }, []);

  // === VALIDATION FORMAT TELEPHONE ===
  const validatePhone = (_: any, value: string) => {
    if (!value) return Promise.reject('Telephone obligatoire');
    const clean = value.replace(/[\s\-\.]/g, '');
    // Format camerounais: +237 suivi de 9 chiffres (commence par 6 ou 2)
    const regex = /^\+237[62]\d{8}$/;
    if (!regex.test(clean)) {
      return Promise.reject('Format invalide. Attendu : +237 6XX XXX XXX (9 chiffres apres +237)');
    }
    return Promise.resolve();
  };

  // === VALIDATION CNI ===
  const validateCNI = (_: any, value: string) => {
    if (!value) return Promise.resolve();
    const docType = form.getFieldValue('idDocumentType');
    if (docType === 'CNI') {
      if (!/^\d{9}$/.test(value)) {
        return Promise.reject('La CNI camerounaise doit contenir exactement 9 chiffres');
      }
    }
    return Promise.resolve();
  };

  // === VALIDATION DATE EXPIRATION ===
  const validateExpiration = (_: any, value: any) => {
    if (!value) return Promise.resolve();
    const date = dayjs.isDayjs(value) ? value : dayjs(value);
    if (date.isBefore(dayjs(), 'day')) {
      return Promise.reject('Cette piece d\'identite est EXPIREE. Veuillez fournir une piece valide.');
    }
    return Promise.resolve();
  };

  // === Upload signature en base64 ===
  const handleSignatureUpload = (file: File, fieldName: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      form.setFieldsValue({ [fieldName]: result });
      setSignaturePreview(prev => ({ ...prev, [fieldName]: result }));
    };
    reader.readAsDataURL(file);
    return false; // prevent auto upload
  };

  const handleRemoveSignature = (fieldName: string) => {
    form.setFieldsValue({ [fieldName]: undefined });
    setSignaturePreview(prev => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  };

  const handleCreate = () => {
    setEditingClient(null);
    setClientType(typeFilter || 'PHYSIQUE');
    setDuplicates([]);
    setDuplicateChecked(false);
    setCapturedPhoto(null);
    setSignatureData(null);
    setSignaturePreview({});
    form.resetFields();
    form.setFieldsValue({ clientType: typeFilter || 'PHYSIQUE' });
    setModalOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingClient(record);
    setClientType(record.clientType || 'PHYSIQUE');
    form.setFieldsValue({
      ...record,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
      dateExpirationPiece: record.dateExpirationPiece ? dayjs(record.dateExpirationPiece) : null,
      dateConstitution: record.dateConstitution ? dayjs(record.dateConstitution) : null,
      revenuMensuel: record.revenuMensuel ? Number(record.revenuMensuel) : undefined,
    });
    // Initialiser les previews de signature avec les donnees existantes
    const sigPreviews: Record<string, string> = {};
    if (record.signatureData) sigPreviews.signatureData = record.signatureData;
    if (record.signatureData2) sigPreviews.signatureData2 = record.signatureData2;
    if (record.signatureData3) sigPreviews.signatureData3 = record.signatureData3;
    setSignaturePreview(sigPreviews);
    if (record.profilePhoto) setCapturedPhoto(record.profilePhoto);
    if (record.signatureData) setSignatureData(record.signatureData);
    setModalOpen(true);
  };

  const handleViewDetail = async (record: any) => {
    try {
      const { data } = await api.get(`/clients/${record.id}`);
      setSelectedClient(data);
      setMandataires(data.mandataires || []);
      setDetailOpen(true);
    } catch {
      message.error('Erreur chargement details client');
    }
  };

  const handleShowQR = (record: any) => {
    setSelectedClient(record);
    setQrModalOpen(true);
  };

  const handleActivateMobile = async (clientId: string) => {
    setActivatingMobile(true);
    try {
      const { data } = await api.post(`/clients/${clientId}/activate-mobile`);
      Modal.success({
        title: 'Acces mobile active',
        width: 420,
        content: (
          <div>
            <p style={{ marginBottom: 16 }}>{data.message}</p>
            <div style={{ background: '#f6f8ff', border: '1px solid #d6e4ff', borderRadius: 8, padding: '16px 20px' }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: '#888', fontSize: 12 }}>Identifiant</span>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>{data.clientNumber}</div>
              </div>
              <div>
                <span style={{ color: '#888', fontSize: 12 }}>Mot de passe temporaire</span>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 2, color: '#1B2A4A' }}>{data.password}</div>
              </div>
            </div>
            <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>Ces identifiants ont ete envoyes par SMS au {data.phone}. Le client devra changer son mot de passe a la premiere connexion.</p>
          </div>
        ),
      });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur activation acces mobile');
    } finally {
      setActivatingMobile(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (values.dateOfBirth) values.dateOfBirth = values.dateOfBirth.format('YYYY-MM-DD');
      if (values.dateExpirationPiece) values.dateExpirationPiece = values.dateExpirationPiece.format('YYYY-MM-DD');
      if (values.dateConstitution) values.dateConstitution = values.dateConstitution.format('YYYY-MM-DD');

      // Injecter l'agence de l'utilisateur connecte
      if (!values.agencyId) {
        values.agencyId = currentUser.agencyId;
      }

      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, values);
        message.success('Client modifie avec succes');
        setModalOpen(false);
        fetchClients(pagination.current);
      } else {
        // ANTI-DOUBLON : verifier avant creation
        if (!duplicateChecked) {
          const result = await checkDuplicates(values);
          if (result.hasDuplicates) {
            setDuplicates(result.duplicates);
            setDuplicateModalOpen(true);
            return; // Bloquer la creation, afficher la modale
          }
        }
        // Pas de doublon ou utilisateur a confirme
        const { data: createdClient } = await api.post('/clients', values);
        message.success('Client cree avec succes');
        setModalOpen(false);
        setDuplicateChecked(false);
        setNewCreatedClient(createdClient);
        setSelectedProduct(null);
        setInitialDepositEnabled(false);
        accountForm.resetFields();
        loadAccountOpeningData();
        setOpenAccountModalOpen(true);
        fetchClients(pagination.current);
      }
    } catch (err: any) {
      if (err.response?.data?.message) {
        message.error(Array.isArray(err.response.data.message) ? err.response.data.message.join(', ') : err.response.data.message);
      }
    }
  };

  // Confirmer la creation malgre le doublon detecte
  const handleForceCreate = async () => {
    setDuplicateModalOpen(false);
    setDuplicateChecked(true);
    // Re-appeler submit avec le flag active
    setTimeout(() => handleSubmit(), 100);
  };

  // Ouvrir la fiche du doublon detecte
  const handleOpenDuplicate = (clientId: string) => {
    setDuplicateModalOpen(false);
    setModalOpen(false);
    const dup = clients.find((c: any) => c.id === clientId);
    if (dup) {
      handleViewDetail(dup);
    } else {
      // Charger le client directement
      api.get(`/clients/${clientId}`).then(({ data }) => {
        setSelectedClient(data);
        setMandataires(data.mandataires || []);
        setDetailOpen(true);
      });
    }
  };

  // Charger les produits de compte et staff
  const loadAccountOpeningData = async () => {
    try {
      const [prodRes, staffRes] = await Promise.all([
        api.get('/accounts/products'),
        api.get('/users', { params: { limit: 100 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setAccountProducts(prodRes.data || []);
      setStaffList(staffRes.data?.data || staffRes.data || []);
    } catch { /* silent */ }
  };

  // Ouvrir un compte pour le client
  const handleOpenAccount = async () => {
    try {
      const values = await accountForm.validateFields();

      if (initialDepositEnabled && selectedProduct) {
        const minDeposit = Number(selectedProduct.minOpeningDeposit);
        if (values.initialDeposit < minDeposit) {
          message.error(`Le montant minimum pour ce produit est de ${minDeposit.toLocaleString('fr-FR')} FCFA`);
          return;
        }
      }

      const payload: any = {
        clientId: newCreatedClient.id,
        agencyId: newCreatedClient.agencyId,
        productId: values.productId,
        managerId: values.managerId || undefined,
        maturityDate: values.maturityDate ? values.maturityDate.format('YYYY-MM-DD') : undefined,
      };
      if (initialDepositEnabled && values.initialDeposit) {
        payload.initialDeposit = values.initialDeposit;
      }

      const { data } = await api.post('/accounts', payload);
      message.success(data.message || 'Compte ouvert avec succes');
      setOpenAccountModalOpen(false);
      setSelectedProduct(null);
      setInitialDepositEnabled(false);
      accountForm.resetFields();
      fetchClients(pagination.current);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  // Quand le produit change, charger ses conditions
  const handleProductChange = (productId: string) => {
    const product = accountProducts.find((p: any) => p.id === productId);
    setSelectedProduct(product);
  };

  // Ouvrir un compte depuis le profil client (bouton dans vue 360)
  const handleOpenAccountFromProfile = (client: any) => {
    setNewCreatedClient(client);
    setSelectedProduct(null);
    setInitialDepositEnabled(false);
    accountForm.resetFields();
    loadAccountOpeningData();
    setOpenAccountModalOpen(true);
  };

  const handleChangeStatus = async (clientId: string, status: string) => {
    try {
      await api.patch(`/clients/${clientId}/status`, { status });
      message.success(`Statut mis a jour`);
      fetchClients(pagination.current);
    } catch {
      message.error('Erreur lors du changement de statut');
    }
  };

  // === Export ===
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.clientType = typeFilter;
      const { data } = await api.get('/clients/export', { params });
      const rows = data.map((c: any) => ({
        'N° Client': c.clientNumber,
        'Type': c.clientType === 'MORALE' ? 'Personne Morale' : 'Personne Physique',
        'Nom / Raison sociale': c.clientType === 'MORALE' ? c.raisonSociale : `${c.firstName} ${c.lastName}`,
        'Telephone': c.phone,
        'Email': c.email || '',
        'Ville': c.city,
        'Region': c.region,
        'Statut': c.status,
        'KYC': c.kycVerified ? 'Verifie' : 'Non verifie',
        'Agence': c.agency?.name || '',
        'Date creation': dayjs(c.createdAt).format('DD/MM/YYYY'),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clients');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `clients_export_${dayjs().format('YYYYMMDD')}.xlsx`);
      message.success(`${rows.length} clients exportes`);
    } catch { message.error('Erreur export'); }
    finally { setExporting(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data } = await api.get('/clients/export');
      const rows = data.map((c: any) => ({
        'N° Client': c.clientNumber,
        'Type': c.clientType,
        'Nom': c.clientType === 'MORALE' ? c.raisonSociale : `${c.firstName} ${c.lastName}`,
        'Telephone': c.phone,
        'Statut': c.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `clients_${dayjs().format('YYYYMMDD')}.csv`);
      message.success(`${rows.length} clients exportes`);
    } catch { message.error('Erreur export'); }
    finally { setExporting(false); }
  };

  // === Mandataires ===
  const handleSearchPhysique = async () => {
    if (!searchPhysique) return;
    try {
      const { data } = await api.get('/clients', { params: { search: searchPhysique, clientType: 'PHYSIQUE', limit: 10 } });
      setPhysiquesFound(data.data || []);
    } catch { message.error('Erreur recherche'); }
  };

  const handleAddMandataire = async () => {
    try {
      const values = await mandataireForm.validateFields();
      await api.post(`/clients/${selectedClient.id}/mandataires`, values);
      message.success('Mandataire ajoute');
      setMandataireModalOpen(false);
      mandataireForm.resetFields();
      setPhysiquesFound([]);
      setSearchPhysique('');
      // Refresh
      const { data } = await api.get(`/clients/${selectedClient.id}`);
      setSelectedClient(data);
      setMandataires(data.mandataires || []);
    } catch (err: any) {
      if (err.response?.data?.message) message.error(err.response.data.message);
    }
  };

  const handleRemoveMandataire = async (mandataireId: string) => {
    try {
      await api.delete(`/clients/mandataires/${mandataireId}`);
      message.success('Mandataire retire');
      setMandataires(prev => prev.filter((m: any) => m.id !== mandataireId));
    } catch { message.error('Erreur'); }
  };

  // === IMPORT CSV ===
  const handleImportCSV = async (file: any) => {
    setImporting(true);
    setImportResults(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/clients/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResults(data);
      if (data.success > 0) {
        message.success(`${data.success} clients importes avec succes`);
        fetchClients();
      }
      if (data.errors?.length > 0) {
        message.warning(`${data.errors.length} lignes en erreur`);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
    return false; // prevent auto-upload
  };

  // === FUSION DOUBLONS ===
  const handleSearchMerge = async (term: string, target: 'primary' | 'secondary') => {
    if (!term) return;
    try {
      const { data } = await api.get('/clients', { params: { search: term, limit: 5 } });
      if (target === 'primary') setMergePrimaryResults(data.data || []);
      else setMergeSecondaryResults(data.data || []);
    } catch { /* ignore */ }
  };

  const handleMerge = async () => {
    if (!mergePrimaryId || !mergeSecondaryId) {
      message.error('Selectionnez les deux clients a fusionner');
      return;
    }
    if (mergePrimaryId === mergeSecondaryId) {
      message.error('Vous ne pouvez pas fusionner un client avec lui-meme');
      return;
    }
    setMerging(true);
    try {
      await api.post('/clients/merge', { primaryId: mergePrimaryId, secondaryId: mergeSecondaryId });
      message.success('Clients fusionnes avec succes');
      setMergeModalOpen(false);
      setMergePrimaryId('');
      setMergeSecondaryId('');
      setMergePrimaryResults([]);
      setMergeSecondaryResults([]);
      fetchClients();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Erreur lors de la fusion');
    } finally {
      setMerging(false);
    }
  };

  // === Nom affiche ===
  const getDisplayName = (r: any) => {
    if (r.clientType === 'MORALE') return r.raisonSociale || '-';
    return `${r.firstName || ''} ${r.lastName || ''}`.trim() || '-';
  };

  const columns = [
    {
      title: 'N° Client',
      dataIndex: 'clientNumber',
      key: 'clientNumber',
      width: 130,
      render: (v: string) => <Text copyable style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Type',
      dataIndex: 'clientType',
      key: 'clientType',
      width: 60,
      render: (t: string) => (
        <Tooltip title={t === 'MORALE' ? 'Personne Morale' : 'Personne Physique'}>
          {t === 'MORALE' ? <BankOutlined style={{ color: '#1B2A4A', fontSize: 16 }} /> : <UserOutlined style={{ color: '#F5A623', fontSize: 16 }} />}
        </Tooltip>
      ),
    },
    {
      title: 'Nom / Raison sociale',
      key: 'name',
      render: (_: any, r: any) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{getDisplayName(r)}</span>
          {r.clientType === 'MORALE' && r.formeJuridique && (
            <Tag color="blue" style={{ fontSize: 10 }}>{r.formeJuridique}</Tag>
          )}
        </Space>
      ),
    },
    { title: 'Telephone', dataIndex: 'phone', key: 'phone' },
    { title: 'Ville', dataIndex: 'city', key: 'city' },
    {
      title: 'KYC',
      dataIndex: 'kycVerified',
      key: 'kyc',
      width: 70,
      render: (v: boolean) => <Badge status={v ? 'success' : 'warning'} text={v ? 'OK' : 'Non'} />,
    },
    {
      title: 'Score',
      dataIndex: 'kycScore',
      key: 'kycScore',
      width: 80,
      sorter: (a: any, b: any) => (a.kycScore || 0) - (b.kycScore || 0),
      render: (score: number, r: any) => {
        if (score == null) return <Tag>-</Tag>;
        const color = score >= 80 ? 'green' : score >= 60 ? 'blue' : score >= 40 ? 'orange' : 'red';
        return <Tooltip title={r.kycScoreLabel}><Tag color={color}>{score}/100</Tag></Tooltip>;
      },
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'ACTIVE' ? 'green' : s === 'SUSPENDED' ? 'orange' : s === 'BLOCKED' ? 'red' : 'default'}>
          {s === 'ACTIVE' ? 'Actif' : s === 'SUSPENDED' ? 'Suspendu' : s === 'BLOCKED' ? 'Bloque' : 'Ferme'}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="Vue 360">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handleViewDetail(record)} />
          </Tooltip>
          {canUpdate('CLIENTS') && (
            <Tooltip title="Modifier">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleEdit(record)} />
            </Tooltip>
          )}
          <Tooltip title="QR Code">
            <Button type="text" icon={<QrcodeOutlined />} size="small" onClick={() => handleShowQR(record)} />
          </Tooltip>
          {canUpdate('CLIENTS') && (
            <Dropdown menu={{
              items: [
                { key: 'mobile', icon: <MobileOutlined />, label: 'Activer acces mobile', onClick: () => handleActivateMobile(record.id) },
                { type: 'divider' as const },
                record.status !== 'ACTIVE' ? { key: 'activate', icon: <CheckCircleOutlined />, label: 'Reactiver', onClick: () => handleChangeStatus(record.id, 'ACTIVE') } : null,
                record.status !== 'SUSPENDED' ? { key: 'suspend', icon: <StopOutlined />, label: 'Suspendre', danger: true, onClick: () => handleChangeStatus(record.id, 'SUSPENDED') } : null,
                record.status !== 'BLOCKED' ? { key: 'block', icon: <LockOutlined />, label: 'Bloquer', danger: true, onClick: () => handleChangeStatus(record.id, 'BLOCKED') } : null,
              ].filter(Boolean),
            }}>
              <Button type="text" size="small">...</Button>
            </Dropdown>
          )}
        </Space>
      ),
    },
  ];

  // === Formulaire dynamique ===
  const renderPhysiqueFields = () => (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="firstName" label="Prenom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="lastName" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="gender" label="Genre" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="MALE">Homme</Select.Option>
              <Select.Option value="FEMALE">Femme</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="dateOfBirth" label="Date de naissance" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="lieuNaissance" label="Lieu de naissance">
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="idDocumentType" label="Type de piece" rules={[{ required: true }]}>
            <Select onChange={() => form.validateFields(['idDocumentNumber'])}>
              <Select.Option value="CNI">CNI camerounaise</Select.Option>
              <Select.Option value="PASSPORT">Passeport</Select.Option>
              <Select.Option value="RESIDENCE_PERMIT">Carte de sejour</Select.Option>
              <Select.Option value="RECEPISSE">Recepisse</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="idDocumentNumber" label="N° de piece" rules={[{ required: true }, { validator: validateCNI }]} help={form.getFieldValue('idDocumentType') === 'CNI' ? '9 chiffres numeriques' : undefined}>
            <Input
              placeholder={form.getFieldValue('idDocumentType') === 'CNI' ? '123456789' : 'Numero de piece'}
              maxLength={form.getFieldValue('idDocumentType') === 'CNI' ? 9 : undefined}
              onChange={(e) => {
                if (form.getFieldValue('idDocumentType') === 'CNI') {
                  const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                  form.setFieldsValue({ idDocumentNumber: v });
                }
              }}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="dateExpirationPiece" label="Date expiration" rules={[{ validator: validateExpiration }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(current) => current && current < dayjs().startOf('day')} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="profession" label="Profession">
            <Input placeholder="Commercant, fonctionnaire..." />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="secteurActivite" label="Secteur d'activite">
            <Select allowClear placeholder="Selectionner">
              <Select.Option value="Commerce">Commerce</Select.Option>
              <Select.Option value="Agriculture">Agriculture</Select.Option>
              <Select.Option value="Transport">Transport</Select.Option>
              <Select.Option value="Artisanat">Artisanat</Select.Option>
              <Select.Option value="Services">Services</Select.Option>
              <Select.Option value="Fonction publique">Fonction publique</Select.Option>
              <Select.Option value="Secteur informel">Secteur informel</Select.Option>
              <Select.Option value="Autre">Autre</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="revenuMensuel" label="Revenu mensuel (FCFA)">
            <InputNumber style={{ width: '100%' }} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="isPEP" label="PEP (Personne Politiquement Exposee)">
            <Select defaultValue={false}>
              <Select.Option value={false}>Non</Select.Option>
              <Select.Option value={true}>Oui</Select.Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="phoneSecondaire" label="Telephone secondaire">
            <Input placeholder="+237..." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="nomPere" label="Nom du pere">
            <Input placeholder="Nom et prenom du pere" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="nomMere" label="Nom de la mere">
            <Input placeholder="Nom et prenom de la mere" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="niu" label="NIU (N° Identification Unique)">
            <Input placeholder="Numero d'identification unique" />
          </Form.Item>
        </Col>
      </Row>
      <Divider style={{ margin: '12px 0' }}>Personne a contacter en cas d'urgence</Divider>
      <Row gutter={16}>
        <Col span={10}>
          <Form.Item name="contactUrgenceNom" label="Nom complet">
            <Input placeholder="Nom et prenom" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="contactUrgencePhone" label="Telephone">
            <Input placeholder="+237..." />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="contactUrgenceLien" label="Lien">
            <Select allowClear placeholder="Lien">
              <Select.Option value="Epoux/Epouse">Epoux/Epouse</Select.Option>
              <Select.Option value="Pere">Pere</Select.Option>
              <Select.Option value="Mere">Mere</Select.Option>
              <Select.Option value="Frere/Soeur">Frere/Soeur</Select.Option>
              <Select.Option value="Enfant">Enfant</Select.Option>
              <Select.Option value="Ami(e)">Ami(e)</Select.Option>
              <Select.Option value="Autre">Autre</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* Donnees biometriques : Photo + Signature */}
      <Divider style={{ margin: '12px 0' }}>Donnees biometriques</Divider>
      <Row gutter={16}>
        {/* Photo webcam */}
        <Col span={8}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Photo du client</Text>
          <Form.Item name="profilePhoto" hidden><Input /></Form.Item>
          {capturedPhoto ? (
            <div style={{ textAlign: 'center' }}>
              <Avatar src={capturedPhoto} size={100} shape="square" />
              <div style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => { setCapturedPhoto(null); form.setFieldsValue({ profilePhoto: undefined }); }}>Reprendre</Button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', border: '1px dashed #d9d9d9', borderRadius: 8 }}>
              <CameraOutlined style={{ fontSize: 32, color: '#999' }} />
              <div style={{ marginTop: 8 }}>
                <Button icon={<CameraOutlined />} onClick={startWebcam}>Prendre la photo</Button>
              </div>
            </div>
          )}
        </Col>

        {/* Signature electronique */}
        <Col span={10}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Signature du client</Text>
          <Form.Item name="signatureData" hidden><Input /></Form.Item>
          {signatureData ? (
            <div style={{ textAlign: 'center' }}>
              <img src={signatureData} alt="Signature" style={{ border: '1px solid #d9d9d9', borderRadius: 8, maxWidth: '100%', height: 80, objectFit: 'contain', background: '#fff' }} />
              <div style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => {
                  setSignatureData(null);
                  form.setFieldsValue({ signatureData: undefined });
                  sigPadRef.current?.clear();
                }}>Effacer et resigner</Button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ border: '2px solid #1B2A4A', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#1B2A4A"
                  canvasProps={{ width: 340, height: 120, style: { width: '100%', height: 120 } }}
                />
              </div>
              <Space style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => sigPadRef.current?.clear()}>Effacer</Button>
                <Button size="small" type="primary" onClick={() => {
                  if (sigPadRef.current?.isEmpty()) {
                    message.warning('Veuillez signer avant de valider');
                    return;
                  }
                  const dataUrl = sigPadRef.current?.getTrimmedCanvas().toDataURL('image/png');
                  if (dataUrl) {
                    setSignatureData(dataUrl);
                    form.setFieldsValue({ signatureData: dataUrl });
                    message.success('Signature enregistree');
                  }
                }}>Valider la signature</Button>
              </Space>
            </div>
          )}
        </Col>

        {/* Info */}
        <Col span={6}>
          <Alert
            type="info"
            showIcon
            message="Biometrie"
            description="La photo et la signature seront affichees a la caissiere lors de chaque retrait pour verifier l'identite du client."
            style={{ height: '100%' }}
          />
        </Col>
      </Row>

      {/* Specimens de signature (upload image) */}
      <Divider style={{ margin: '12px 0' }}>Specimens de signature (3 max)</Divider>
      <Form.Item name="signatureData2" hidden><Input /></Form.Item>
      <Form.Item name="signatureData3" hidden><Input /></Form.Item>
      <Row gutter={16}>
        {(['signatureData', 'signatureData2', 'signatureData3'] as const).map((fieldName, index) => (
          <Col span={8} key={fieldName}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A' }}>
              Signature {index + 1}
            </Text>
            {signaturePreview[fieldName] ? (
              <div style={{
                textAlign: 'center',
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                padding: 8,
                background: '#fafafa',
              }}>
                <img
                  src={signaturePreview[fieldName]}
                  alt={`Signature ${index + 1}`}
                  style={{
                    width: 150,
                    height: 80,
                    objectFit: 'contain',
                    border: '1px solid #e8e8e8',
                    borderRadius: 4,
                    background: '#fff',
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveSignature(fieldName)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <Upload
                listType="picture-card"
                maxCount={1}
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => handleSignatureUpload(file, fieldName)}
              >
                <div>
                  <UploadOutlined style={{ fontSize: 24, color: '#F5A623' }} />
                  <div style={{ marginTop: 4, fontSize: 12 }}>Charger</div>
                </div>
              </Upload>
            )}
          </Col>
        ))}
      </Row>
      <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        Importez jusqu'a 3 specimens de signature du client (formats : JPG, PNG, etc.). Ces images seront utilisees pour la verification lors des operations.
      </Text>
    </>
  );

  const renderMoraleFields = () => (
    <>
      <Row gutter={16}>
        <Col span={16}>
          <Form.Item name="raisonSociale" label="Raison sociale" rules={[{ required: true }]}>
            <Input placeholder="Nom officiel de l'entreprise / association" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="formeJuridique" label="Forme juridique" rules={[{ required: true }]}>
            <Select options={FORMES_JURIDIQUES} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="numeroEnregistrement" label="N° enregistrement (RCCM / Recepisse)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="identifiantFiscal" label="Identifiant fiscal (NIF)">
            <Input placeholder="Numero de contribuable" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="niu" label="NIU (N° Identification Unique)">
            <Input placeholder="Numero d'identification unique" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="dateConstitution" label="Date de creation / constitution" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="signatureRule" label="Regle de signature" initialValue="SINGLE">
            <Select>
              <Select.Option value="SINGLE">Signature unique (1 signataire suffit)</Select.Option>
              <Select.Option value="JOINT">Signature conjointe (2 signatures obligatoires)</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </>
  );

  // Onglets detail 360
  const renderDetailTabs = () => {
    if (!selectedClient) return null;
    const isMorale = selectedClient.clientType === 'MORALE';

    const infoTab = {
      key: 'info',
      label: 'Informations',
      children: (
        <>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="N° Client">{selectedClient.clientNumber}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={isMorale ? 'blue' : 'orange'}>{isMorale ? 'Personne Morale' : 'Personne Physique'}</Tag>
          </Descriptions.Item>
          {isMorale ? (
            <>
              <Descriptions.Item label="Raison sociale" span={2}>{selectedClient.raisonSociale}</Descriptions.Item>
              <Descriptions.Item label="Forme juridique">{selectedClient.formeJuridique}</Descriptions.Item>
              <Descriptions.Item label="N° Enregistrement">{selectedClient.numeroEnregistrement}</Descriptions.Item>
              <Descriptions.Item label="Identifiant fiscal">{selectedClient.identifiantFiscal || '-'}</Descriptions.Item>
              <Descriptions.Item label="Date constitution">{selectedClient.dateConstitution ? dayjs(selectedClient.dateConstitution).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
            </>
          ) : (
            <>
              <Descriptions.Item label="Prenom">{selectedClient.firstName}</Descriptions.Item>
              <Descriptions.Item label="Nom">{selectedClient.lastName}</Descriptions.Item>
              <Descriptions.Item label="Genre">{selectedClient.gender === 'MALE' ? 'Homme' : 'Femme'}</Descriptions.Item>
              <Descriptions.Item label="Date naissance">{selectedClient.dateOfBirth ? dayjs(selectedClient.dateOfBirth).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="Lieu naissance">{selectedClient.lieuNaissance || '-'}</Descriptions.Item>
              <Descriptions.Item label="Piece d'identite">{selectedClient.idDocumentType} — {selectedClient.idDocumentNumber}</Descriptions.Item>
              <Descriptions.Item label="Expiration piece">{selectedClient.dateExpirationPiece ? dayjs(selectedClient.dateExpirationPiece).format('DD/MM/YYYY') : '-'}</Descriptions.Item>
              <Descriptions.Item label="PEP">{selectedClient.isPEP ? <Tag color="red">Oui</Tag> : 'Non'}</Descriptions.Item>
              <Descriptions.Item label="Profession">{selectedClient.profession || '-'}</Descriptions.Item>
              <Descriptions.Item label="Secteur">{selectedClient.secteurActivite || '-'}</Descriptions.Item>
              <Descriptions.Item label="Revenu mensuel">{selectedClient.revenuMensuel ? `${Number(selectedClient.revenuMensuel).toLocaleString('fr-FR')} FCFA` : '-'}</Descriptions.Item>
              <Descriptions.Item label="Tel. secondaire">{selectedClient.phoneSecondaire || '-'}</Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="Telephone">{selectedClient.phone}</Descriptions.Item>
          <Descriptions.Item label="Email">{selectedClient.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Adresse" span={2}>{selectedClient.address}</Descriptions.Item>
          <Descriptions.Item label="Ville">{selectedClient.city}</Descriptions.Item>
          <Descriptions.Item label="Region">{selectedClient.region}</Descriptions.Item>
          <Descriptions.Item label="KYC">
            <Badge status={selectedClient.kycVerified ? 'success' : 'warning'} text={selectedClient.kycVerified ? 'Verifie' : 'Non verifie'} />
          </Descriptions.Item>
          <Descriptions.Item label="Score KYC">
            {selectedClient.kycScore != null ? (
              <Space>
                <Tag color={selectedClient.kycScore >= 80 ? 'green' : selectedClient.kycScore >= 60 ? 'blue' : selectedClient.kycScore >= 40 ? 'orange' : 'red'}>
                  {selectedClient.kycScore}/100 — {selectedClient.kycScoreLabel || ''}
                </Tag>
                <Button size="small" type="link" onClick={async () => {
                  try {
                    const { data } = await api.post(`/clients/${selectedClient.id}/calculate-kyc-score`);
                    setSelectedClient((prev: any) => ({ ...prev, kycScore: data.score, kycScoreLabel: data.label }));
                    message.success(`Score recalcule : ${data.score}/100 (${data.label})`);
                  } catch { message.error('Erreur recalcul'); }
                }}>Recalculer</Button>
              </Space>
            ) : (
              <Button size="small" type="link" onClick={async () => {
                try {
                  const { data } = await api.post(`/clients/${selectedClient.id}/calculate-kyc-score`);
                  setSelectedClient((prev: any) => ({ ...prev, kycScore: data.score, kycScoreLabel: data.label }));
                  message.success(`Score calcule : ${data.score}/100 (${data.label})`);
                } catch { message.error('Erreur calcul'); }
              }}>Calculer le score</Button>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Agence">{selectedClient.agency?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Statut">
            <Tag color={selectedClient.status === 'ACTIVE' ? 'green' : 'orange'}>{selectedClient.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Membre depuis">{dayjs(selectedClient.createdAt).format('DD/MM/YYYY')}</Descriptions.Item>
        </Descriptions>

        {/* Photo du client */}
        {selectedClient.profilePhoto && (
          <div style={{ marginTop: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8, color: '#1B2A4A' }}>Photo du client</Text>
            <Avatar src={selectedClient.profilePhoto} size={80} shape="square" />
          </div>
        )}

        {/* Specimens de signature */}
        {(selectedClient.signatureData || selectedClient.signatureData2 || selectedClient.signatureData3) && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: '12px 0' }}>Specimens de signature</Divider>
            <Row gutter={16}>
              {[
                { key: 'signatureData', label: 'Signature 1' },
                { key: 'signatureData2', label: 'Signature 2' },
                { key: 'signatureData3', label: 'Signature 3' },
              ].map(({ key, label }) => (
                selectedClient[key] ? (
                  <Col span={8} key={key}>
                    <div style={{
                      textAlign: 'center',
                      border: '1px solid #d9d9d9',
                      borderRadius: 8,
                      padding: 8,
                      background: '#fafafa',
                    }}>
                      <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#1B2A4A' }}>{label}</Text>
                      <img
                        src={selectedClient[key]}
                        alt={label}
                        style={{
                          width: 150,
                          height: 80,
                          objectFit: 'contain',
                          border: '1px solid #e8e8e8',
                          borderRadius: 4,
                          background: '#fff',
                        }}
                      />
                    </div>
                  </Col>
                ) : null
              ))}
            </Row>
          </div>
        )}
        </>
      ),
    };

    const accountsTab = {
      key: 'accounts',
      label: `Comptes (${selectedClient.accounts?.length || 0})`,
      children: (
        <div>
          <div style={{ marginBottom: 12, textAlign: 'right' }}>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleOpenAccountFromProfile(selectedClient)}>
              Ouvrir un compte
            </Button>
          </div>
          <Table dataSource={selectedClient.accounts || []} rowKey="id" size="small" pagination={false} columns={[
            { title: 'N° Compte', dataIndex: 'accountNumber' },
            { title: 'Type', dataIndex: 'type', render: (t: string) => <Tag>{t}</Tag> },
            { title: 'Solde (FCFA)', dataIndex: 'balance', render: (v: any) => Number(v).toLocaleString('fr-FR'), align: 'right' as const },
            { title: 'Statut', dataIndex: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s}</Tag> },
          ]} />
          {selectedClient.accounts?.length === 0 && (
            <Alert type="info" showIcon message="Ce client n'a aucun compte. Cliquez sur 'Ouvrir un compte' pour lui en creer un." style={{ marginTop: 12 }} />
          )}
        </div>
      ),
    };

    const creditsTab = {
      key: 'credits',
      label: `Credits (${selectedClient.credits?.length || 0})`,
      children: (
        <Table dataSource={selectedClient.credits || []} rowKey="id" size="small" pagination={false} columns={[
          { title: 'Montant', dataIndex: 'amount', render: (v: any) => `${Number(v).toLocaleString('fr-FR')} FCFA`, align: 'right' as const },
          { title: 'Duree', dataIndex: 'durationMonths', render: (v: number) => `${v} mois` },
          { title: 'Statut', dataIndex: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : s === 'PENDING' ? 'orange' : 'blue'}>{s}</Tag> },
          { title: 'Date', dataIndex: 'createdAt', render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
        ]} />
      ),
    };

    const mandatairesTab = isMorale ? {
      key: 'mandataires',
      label: (
        <span>
          <TeamOutlined /> Mandataires ({mandataires.length})
          {mandataires.filter((m: any) => m.isSignataire).length === 0 && (
            <Tag color="red" style={{ marginLeft: 8, fontSize: 10 }}>Aucun signataire!</Tag>
          )}
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Les mandataires sont les personnes physiques autorisees a agir au nom de cette entite.
            </Text>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setMandataireModalOpen(true); mandataireForm.resetFields(); setPhysiquesFound([]); setSearchPhysique(''); }}>
              Ajouter un mandataire
            </Button>
          </div>
          {mandataires.filter((m: any) => m.isSignataire).length === 0 && (
            <Card size="small" style={{ borderLeft: '4px solid #ff4d4f', marginBottom: 16, background: '#fff2f0' }}>
              <Text type="danger" strong>
                Attention : Cette personne morale n'a aucun signataire autorise. Le compte ne peut pas etre valide.
              </Text>
            </Card>
          )}
          <Table dataSource={mandataires} rowKey="id" size="small" pagination={false} columns={[
            {
              title: 'Mandataire', key: 'name',
              render: (_: any, m: any) => (
                <Space>
                  <UserOutlined />
                  <span>{m.clientPhysique?.firstName} {m.clientPhysique?.lastName}</span>
                  <Text type="secondary" style={{ fontSize: 11 }}>({m.clientPhysique?.clientNumber})</Text>
                </Space>
              ),
            },
            { title: 'Telephone', key: 'phone', render: (_: any, m: any) => m.clientPhysique?.phone },
            {
              title: 'Role', dataIndex: 'role',
              render: (r: string) => <Tag color="blue">{ROLES_MANDATAIRE.find(rm => rm.value === r)?.label || r}</Tag>,
            },
            {
              title: 'Signataire', dataIndex: 'isSignataire',
              render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag>,
            },
            {
              title: 'Actions', key: 'actions',
              render: (_: any, m: any) => (
                <Popconfirm title="Retirer ce mandataire ?" onConfirm={() => handleRemoveMandataire(m.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                </Popconfirm>
              ),
            },
          ]} />
        </div>
      ),
    } : null;

    const mandataireDeTab = !isMorale && selectedClient.mandatairesDe?.length > 0 ? {
      key: 'mandataireDe',
      label: `Mandataire de (${selectedClient.mandatairesDe.length})`,
      children: (
        <Table dataSource={selectedClient.mandatairesDe} rowKey="id" size="small" pagination={false} columns={[
          { title: 'Personne Morale', key: 'morale', render: (_: any, m: any) => m.clientMorale?.raisonSociale || '-' },
          { title: 'Forme', key: 'forme', render: (_: any, m: any) => m.clientMorale?.formeJuridique || '-' },
          { title: 'Role', dataIndex: 'role', render: (r: string) => <Tag color="blue">{ROLES_MANDATAIRE.find(rm => rm.value === r)?.label || r}</Tag> },
          { title: 'Signataire', dataIndex: 'isSignataire', render: (v: boolean) => v ? <Tag color="green">Oui</Tag> : <Tag>Non</Tag> },
        ]} />
      ),
    } : null;

    const qrTab = {
      key: 'qr',
      label: 'QR Code',
      children: (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <QRCodeSVG
            value={JSON.stringify({ id: selectedClient.id, clientNumber: selectedClient.clientNumber, name: getDisplayName(selectedClient), phone: selectedClient.phone })}
            size={180} level="H" includeMargin
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Code unique : {selectedClient.qrCode || selectedClient.clientNumber}</Text>
          </div>
        </div>
      ),
    };

    return [infoTab, accountsTab, creditsTab, mandatairesTab, mandataireDeTab, qrTab].filter(Boolean);
  };

  return (
    <div>
      <div className="page-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>Clients</Title>
            <Text type="secondary">Gestion de la clientele ({pagination.total} clients)</Text>
          </Col>
          <Col>
            <Space>
              <Dropdown menu={{ items: [
                { key: 'excel', icon: <FileExcelOutlined />, label: 'Export Excel (.xlsx)', onClick: handleExportExcel },
                { key: 'csv', icon: <DownloadOutlined />, label: 'Export CSV', onClick: handleExportCSV },
                { key: 'pdf', icon: <DownloadOutlined />, label: 'Export PDF', onClick: () => exportToPdf({
                  title: 'Liste des clients', subtitle: `${pagination.total} clients`,
                  columns: [
                    { title: 'N° Client', key: 'clientNumber' },
                    { title: 'Nom', key: 'firstName', format: (_: any, r: any) => r.clientType === 'MORALE' ? (r.raisonSociale || '') : `${r.firstName} ${r.lastName}` },
                    { title: 'Type', key: 'clientType', format: (v: any) => v === 'MORALE' ? 'Personne Morale' : 'Personne Physique' },
                    { title: 'Telephone', key: 'phone' },
                    { title: 'Statut', key: 'status' },
                    { title: 'Date inscription', key: 'createdAt', format: (v: any) => dayjs(v).format('DD/MM/YYYY') },
                  ], data: clients, filename: 'clients', orientation: 'landscape',
                }) },
              ] }}>
                <Button icon={<DownloadOutlined />} loading={exporting}>Exporter</Button>
              </Dropdown>
              {canCreate('CLIENTS') && <Button icon={<UploadOutlined />} onClick={() => { setImportModalOpen(true); setImportResults(null); }}>Import CSV</Button>}
              {canUpdate('CLIENTS') && <Button icon={<MergeCellsOutlined />} onClick={() => setMergeModalOpen(true)}>Fusion doublons</Button>}
              {canCreate('CLIENTS') && <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>{typeFilter === 'MORALE' ? 'Nouvelle personne morale' : 'Nouveau client'}</Button>}
            </Space>
          </Col>
        </Row>
      </div>

      <Card className="content-card">
        <Tabs
          activeKey={typeFilter}
          onChange={(key) => { setTypeFilter(key); setSearch(''); setStatusFilter(undefined); }}
          items={[
            { key: 'PHYSIQUE', label: <span><UserOutlined /> Personnes Physiques</span> },
            { key: 'MORALE', label: <span><BankOutlined /> Personnes Morales</span> },
          ]}
        />
        <Space style={{ marginBottom: 16 }} wrap>
          <Input placeholder={typeFilter === 'PHYSIQUE' ? 'Rechercher (nom, telephone, CNI)...' : 'Rechercher (raison sociale, telephone, RCCM)...'} prefix={<SearchOutlined />} value={search} onChange={e => setSearch(e.target.value)} onPressEnter={handleSearch} style={{ width: 400 }} />
          <Button onClick={handleSearch}>Rechercher</Button>
          <Select placeholder="Statut" allowClear style={{ width: 140 }} value={statusFilter} onChange={v => setStatusFilter(v)} options={[
            { value: 'ACTIVE', label: 'Actifs' },
            { value: 'SUSPENDED', label: 'Suspendus' },
            { value: 'BLOCKED', label: 'Bloques' },
            { value: 'CLOSED', label: 'Fermes' },
          ]} />
        </Space>

        <Table dataSource={clients} columns={columns} loading={loading} rowKey="id" size="small" pagination={{
          ...pagination, showSizeChanger: true, showTotal: (total) => `${total} ${typeFilter === 'PHYSIQUE' ? 'personnes physiques' : 'personnes morales'}`,
          onChange: (page, pageSize) => fetchClients(page, pageSize),
        }} />
      </Card>

      {/* Modal creation/edition */}
      <Modal
        title={editingClient ? 'Modifier le client' : 'Nouveau client'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText={editingClient ? 'Modifier' : 'Creer'}
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical" initialValues={{ clientType: 'PHYSIQUE' }}>
          <Form.Item name="clientType" label="Type de client" rules={[{ required: true }]}>
            <Radio.Group
              onChange={e => { setClientType(e.target.value); }}
              buttonStyle="solid"
              disabled={!!editingClient}
            >
              <Radio.Button value="PHYSIQUE">
                <UserOutlined /> Personne Physique
              </Radio.Button>
              <Radio.Button value="MORALE">
                <BankOutlined /> Personne Morale
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          {/* Champs dynamiques */}
          {clientType === 'PHYSIQUE' ? renderPhysiqueFields() : renderMoraleFields()}

          <Divider style={{ margin: '12px 0' }}>Coordonnees</Divider>

          {/* Champs communs */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Telephone principal" rules={[{ required: true, validator: validatePhone }]} tooltip="Format camerounais : +237 suivi de 9 chiffres">
                <Input
                  placeholder="+237 6XX XXX XXX"
                  maxLength={17}
                  onChange={(e) => {
                    let raw = e.target.value.replace(/^\+?237/, '').replace(/[^0-9]/g, '').slice(0, 9);
                    form.setFieldsValue({ phone: '+237' + raw });
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Adresse" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Quartier, rue, porte..." />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="city" label="Ville" rules={[{ required: true }]}>
                <Input placeholder="Douala, Yaounde..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="region" label="Region" rules={[{ required: true }]}>
                <Select placeholder="Selectionner" options={REGIONS_CAMEROUN.map(r => ({ value: r, label: r }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="language" label="Langue">
                <Select defaultValue="FR">
                  <Select.Option value="FR">Francais</Select.Option>
                  <Select.Option value="EN">Anglais</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="arrondissement" label="Arrondissement">
                <Input placeholder="Ex: Douala 1er, Yaounde 2eme..." />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="planLocalisation" label="Plan de localisation (description ou lien)">
            <Input.TextArea rows={2} placeholder="Ex: Rue Centrale, derriere le marche, 2eme maison rouge a gauche..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal QR Code */}
      <Modal title="QR Code Client" open={qrModalOpen} onCancel={() => setQrModalOpen(false)} footer={[<Button key="close" onClick={() => setQrModalOpen(false)}>Fermer</Button>]} width={400}>
        {selectedClient && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <QRCodeSVG value={JSON.stringify({ id: selectedClient.id, clientNumber: selectedClient.clientNumber, name: getDisplayName(selectedClient), phone: selectedClient.phone })} size={200} level="H" includeMargin />
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ display: 'block', fontSize: 16 }}>{getDisplayName(selectedClient)}</Text>
              <Text type="secondary">{selectedClient.clientNumber}</Text>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Vue 360 Client */}
      <Modal
        title={selectedClient ? `${getDisplayName(selectedClient)} — Vue 360` : 'Detail client'}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button
            key="activate"
            type="primary"
            icon={<MobileOutlined />}
            loading={activatingMobile}
            onClick={() => selectedClient && handleActivateMobile(selectedClient.id)}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Activer acces mobile
          </Button>,
          <Button key="close" onClick={() => setDetailOpen(false)}>Fermer</Button>,
        ]}
        width={950}
      >
        {selectedClient && <Tabs items={renderDetailTabs() as any} />}
      </Modal>

      {/* Modal Ajouter mandataire */}
      <Modal
        title="Ajouter un mandataire"
        open={mandataireModalOpen}
        onOk={handleAddMandataire}
        onCancel={() => setMandataireModalOpen(false)}
        okText="Ajouter"
        cancelText="Annuler"
        width={600}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Recherchez un client personne physique existant pour le lier comme mandataire.
        </Text>
        <Space style={{ marginBottom: 16, width: '100%' }}>
          <Input placeholder="Rechercher par nom, telephone, N° client..." value={searchPhysique} onChange={e => setSearchPhysique(e.target.value)} onPressEnter={handleSearchPhysique} style={{ width: 350 }} />
          <Button onClick={handleSearchPhysique} icon={<SearchOutlined />}>Chercher</Button>
        </Space>

        {physiquesFound.length > 0 && (
          <Table dataSource={physiquesFound} rowKey="id" size="small" pagination={false} style={{ marginBottom: 16 }}
            onRow={(record) => ({
              onClick: () => mandataireForm.setFieldsValue({ clientPhysiqueId: record.id }),
              style: { cursor: 'pointer' },
            })}
            rowSelection={{
              type: 'radio',
              selectedRowKeys: mandataireForm.getFieldValue('clientPhysiqueId') ? [mandataireForm.getFieldValue('clientPhysiqueId')] : [],
              onChange: (keys) => mandataireForm.setFieldsValue({ clientPhysiqueId: keys[0] }),
            }}
            columns={[
              { title: 'N°', dataIndex: 'clientNumber', width: 110 },
              { title: 'Nom', key: 'name', render: (_: any, r: any) => `${r.firstName} ${r.lastName}` },
              { title: 'Telephone', dataIndex: 'phone' },
            ]}
          />
        )}

        <Form form={mandataireForm} layout="vertical">
          <Form.Item name="clientPhysiqueId" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="Role dans l'entite" rules={[{ required: true }]}>
                <Select options={ROLES_MANDATAIRE} placeholder="Selectionner le role" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isSignataire" label="Signataire autorise" valuePropName="checked">
                <Select defaultValue={false}>
                  <Select.Option value={false}>Non</Select.Option>
                  <Select.Option value={true}>Oui — Autorise a signer</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="maxOperationAmount" label="Plafond maximum par operation (FCFA)" tooltip="Laisser vide pour aucun plafond">
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={v => v!.replace(/\s/g, '') as any}
              placeholder="Ex: 5 000 000 (vide = illimite)"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal OUVERTURE DE COMPTE */}
      <Modal
        title="Ouverture d'un Nouveau Compte"
        open={openAccountModalOpen}
        onCancel={() => { setOpenAccountModalOpen(false); setSelectedProduct(null); setInitialDepositEnabled(false); accountForm.resetFields(); }}
        footer={[
          <Button key="cancel" onClick={() => { setOpenAccountModalOpen(false); setSelectedProduct(null); accountForm.resetFields(); }}>Annuler</Button>,
          <Button key="submit" type="primary" onClick={handleOpenAccount}>Valider et Ouvrir le Compte</Button>,
        ]}
        width={700}
      >
        {newCreatedClient && (
          <div>
            {/* En-tete : Rappel du Client */}
            <Card size="small" style={{ marginBottom: 20, background: '#f6f9fc', borderLeft: '4px solid #1B2A4A' }}>
              <Row align="middle" gutter={16}>
                <Col>
                  {newCreatedClient.profilePhoto || capturedPhoto ? (
                    <Avatar src={newCreatedClient.profilePhoto || capturedPhoto} size={56} shape="square" />
                  ) : (
                    <Avatar icon={newCreatedClient.clientType === 'MORALE' ? <BankOutlined /> : <UserOutlined />} size={56} shape="square" style={{ backgroundColor: newCreatedClient.clientType === 'MORALE' ? '#1B2A4A' : '#F5A623' }} />
                  )}
                </Col>
                <Col flex="auto">
                  <Text strong style={{ fontSize: 15, display: 'block' }}>
                    {newCreatedClient.clientType === 'MORALE' ? newCreatedClient.raisonSociale : `${newCreatedClient.firstName} ${newCreatedClient.lastName}`}
                  </Text>
                  <Text type="secondary">Code Adherent : <Text copyable>{newCreatedClient.clientNumber}</Text></Text>
                  <br />
                  <Tag color={newCreatedClient.clientType === 'MORALE' ? 'blue' : 'orange'}>
                    {newCreatedClient.clientType === 'MORALE' ? 'Personne Morale' : 'Personne Physique'}
                  </Tag>
                </Col>
              </Row>
            </Card>

            {/* Formulaire */}
            <Form form={accountForm} layout="vertical">
              {/* Champ 1 : Selection du produit */}
              <Form.Item name="productId" label="Produit de compte" rules={[{ required: true, message: 'Selectionnez un produit' }]}>
                <Select
                  placeholder="Selectionner le type de compte..."
                  size="large"
                  onChange={handleProductChange}
                  options={accountProducts.map((p: any) => ({
                    value: p.id,
                    label: (
                      <span>
                        <strong>{p.name}</strong>
                        {Number(p.interestRate) > 0 && <Tag color="green" style={{ marginLeft: 8 }}>{Number(p.interestRate)}%</Tag>}
                      </span>
                    ),
                  }))}
                />
              </Form.Item>

              {/* Section dynamique : Conditions du produit */}
              {selectedProduct && (
                <Card size="small" style={{ marginBottom: 16, background: '#f0f7ff', border: '1px solid #91caff' }}>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Conditions du produit "{selectedProduct.name}"</Text>
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Text type="secondary">Depot minimum a l'ouverture : </Text>
                      <Text strong>{Number(selectedProduct.minOpeningDeposit).toLocaleString('fr-FR')} FCFA</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Frais d'ouverture : </Text>
                      <Text strong>{Number(selectedProduct.openingFees).toLocaleString('fr-FR')} FCFA</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Solde minimum obligatoire : </Text>
                      <Text strong>{Number(selectedProduct.minBalance).toLocaleString('fr-FR')} FCFA</Text>
                    </Col>
                    <Col span={12}>
                      <Text type="secondary">Taux d'interet : </Text>
                      <Text strong>{Number(selectedProduct.interestRate)}% annuel</Text>
                    </Col>
                    {selectedProduct.lockDurationMonths > 0 && (
                      <Col span={12}>
                        <Text type="secondary">Duree blocage minimum : </Text>
                        <Text strong>{selectedProduct.lockDurationMonths} mois</Text>
                      </Col>
                    )}
                    {Number(selectedProduct.earlyWithdrawalPenalty) > 0 && (
                      <Col span={12}>
                        <Text type="secondary">Penalite retrait anticipe : </Text>
                        <Text strong>{Number(selectedProduct.earlyWithdrawalPenalty)}%</Text>
                      </Col>
                    )}
                  </Row>
                  {selectedProduct.description && (
                    <Text type="secondary" style={{ display: 'block', marginTop: 8, fontStyle: 'italic' }}>{selectedProduct.description}</Text>
                  )}
                </Card>
              )}

              {/* Champ 2 : Numero de compte (auto-genere) */}
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="N° de compte">
                    <Input disabled placeholder="Auto-genere a la validation" style={{ background: '#f5f5f5' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Devise">
                    <Select defaultValue="XAF" disabled>
                      <Select.Option value="XAF">XAF (Franc CFA)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Champ 4 : Gestionnaire */}
              <Form.Item name="managerId" label="Gestionnaire de compte (Charge de clientele)">
                <Select allowClear placeholder="Selectionner le responsable..." showSearch optionFilterProp="label"
                  options={staffList.map((s: any) => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName} — ${s.role?.name || ''}`,
                  }))}
                />
              </Form.Item>

              {/* Date echeance pour DAT */}
              {selectedProduct?.type === 'DAT' && (
                <Form.Item name="maturityDate" label="Date d'echeance (fin du blocage)" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" disabledDate={(d) => d && d.isBefore(dayjs().add(selectedProduct.lockDurationMonths || 1, 'month'))} />
                </Form.Item>
              )}

              {/* Section : Premier depot initial */}
              <Divider style={{ margin: '16px 0' }}>Premier depot initial</Divider>
              <Form.Item>
                <label style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={initialDepositEnabled} onChange={e => setInitialDepositEnabled(e.target.checked)} style={{ marginRight: 8 }} />
                  Effectuer le depot initial immediatement
                </label>
              </Form.Item>

              {initialDepositEnabled && (
                <>
                  <Form.Item
                    name="initialDeposit"
                    label="Montant verse par le client (FCFA)"
                    rules={[
                      { required: true, message: 'Montant obligatoire' },
                      {
                        validator: (_, value) => {
                          if (!selectedProduct) return Promise.resolve();
                          const fees = Number(selectedProduct.openingFees) || 0;
                          const minDeposit = Number(selectedProduct.minOpeningDeposit) || 0;
                          const totalRequired = fees + minDeposit;
                          if (value < totalRequired) {
                            return Promise.reject(`Le montant doit couvrir les frais d'ouverture (${fees.toLocaleString('fr-FR')}) + depot minimum (${minDeposit.toLocaleString('fr-FR')}) = ${totalRequired.toLocaleString('fr-FR')} FCFA`);
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      size="large"
                      min={0}
                      formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      parser={v => v!.replace(/\s/g, '') as any}
                      placeholder={selectedProduct ? `Minimum : ${(Number(selectedProduct.openingFees) + Number(selectedProduct.minOpeningDeposit)).toLocaleString('fr-FR')} FCFA` : 'Saisir le montant'}
                    />
                  </Form.Item>

                  {/* Recapitulatif financier */}
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.initialDeposit !== cur.initialDeposit}>
                    {({ getFieldValue }) => {
                      const deposit = getFieldValue('initialDeposit');
                      if (!deposit || !selectedProduct) return null;
                      const fees = Number(selectedProduct.openingFees) || 0;
                      const net = deposit - fees;
                      return (
                        <Card size="small" style={{ marginBottom: 16, background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                          <Text strong style={{ display: 'block', marginBottom: 8 }}>Recapitulatif</Text>
                          <Row justify="space-between">
                            <Text>Montant verse par le client :</Text>
                            <Text strong>{Number(deposit).toLocaleString('fr-FR')} FCFA</Text>
                          </Row>
                          {fees > 0 && (
                            <Row justify="space-between" style={{ color: '#cf1322' }}>
                              <Text type="danger">- Frais d'ouverture de dossier :</Text>
                              <Text type="danger" strong>{fees.toLocaleString('fr-FR')} FCFA</Text>
                            </Row>
                          )}
                          <Divider style={{ margin: '8px 0' }} />
                          <Row justify="space-between">
                            <Text strong style={{ fontSize: 15 }}>= Solde credite sur le compte :</Text>
                            <Text strong style={{ fontSize: 15, color: '#389e0d' }}>{net.toLocaleString('fr-FR')} FCFA</Text>
                          </Row>
                        </Card>
                      );
                    }}
                  </Form.Item>
                </>
              )}
            </Form>
          </div>
        )}
      </Modal>

      {/* Modal ANTI-DOUBLON */}
      <Modal
        title={<span><WarningOutlined style={{ color: '#faad14', marginRight: 8 }} />Client potentiellement existant</span>}
        open={duplicateModalOpen}
        onCancel={() => setDuplicateModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setDuplicateModalOpen(false)}>Annuler la creation</Button>,
          <Button key="force" type="primary" danger onClick={handleForceCreate}>
            C'est different — Confirmer la creation
          </Button>,
        ]}
        width={650}
      >
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Attention : doublon potentiel detecte"
          description="Le systeme a trouve un ou plusieurs clients correspondant aux informations saisies. Verifiez avant de continuer."
          style={{ marginBottom: 16 }}
        />
        <List
          dataSource={duplicates}
          renderItem={(dup: any) => (
            <List.Item
              actions={[
                <Button type="link" key="open" onClick={() => handleOpenDuplicate(dup.id)}>
                  Ouvrir la fiche
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={dup.profilePhoto ? <Avatar src={dup.profilePhoto} size={48} /> : <Avatar icon={<UserOutlined />} size={48} style={{ backgroundColor: dup.clientType === 'MORALE' ? '#1B2A4A' : '#F5A623' }} />}
                title={
                  <span>
                    {dup.clientType === 'MORALE' ? dup.raisonSociale : `${dup.firstName} ${dup.lastName}`}
                    <Tag style={{ marginLeft: 8 }} color={dup.status === 'ACTIVE' ? 'green' : 'orange'}>{dup.status}</Tag>
                  </span>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary">N° {dup.clientNumber} | Tel: {dup.phone}</Text>
                    {dup.idDocumentNumber && <Text type="secondary">Piece: {dup.idDocumentType} — {dup.idDocumentNumber}</Text>}
                    {dup.numeroEnregistrement && <Text type="secondary">RCCM: {dup.numeroEnregistrement}</Text>}
                    <Text type="secondary">Cree le {dayjs(dup.createdAt).format('DD/MM/YYYY')}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* Modal WEBCAM */}
      <Modal
        title={<span><CameraOutlined /> Capture photo biometrique</span>}
        open={webcamOpen}
        onCancel={stopWebcam}
        afterOpenChange={(open) => {
          if (open && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play();
          }
        }}
        footer={[
          <Button key="cancel" onClick={stopWebcam}>Annuler</Button>,
          <Button key="capture" type="primary" icon={<CameraOutlined />} onClick={capturePhoto}>
            Capturer la photo
          </Button>,
        ]}
        width={680}
        destroyOnClose
      >
        <div style={{ textAlign: 'center' }}>
          <video ref={videoRef} style={{ width: '100%', maxWidth: 640, borderRadius: 8, background: '#000' }} autoPlay muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Positionnez le visage du client bien au centre et appuyez sur "Capturer"</Text>
          </div>
        </div>
      </Modal>

      {/* Modal IMPORT CSV */}
      <Modal
        title={<span><UploadOutlined /> Importer des clients depuis un fichier CSV</span>}
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        footer={[<Button key="close" onClick={() => setImportModalOpen(false)}>Fermer</Button>]}
        width={650}
      >
        <Alert
          type="info"
          showIcon
          message="Format attendu du fichier CSV"
          description={
            <div>
              <Text>Le fichier doit contenir une ligne d'en-tete avec les colonnes suivantes :</Text>
              <br />
              <Text code>clientType, phone, firstName, lastName, gender, dateOfBirth, idDocumentType, idDocumentNumber, address, city, region, profession, email</Text>
              <br />
              <Text type="secondary">Pour les personnes morales : <Text code>clientType=MORALE, phone, raisonSociale, formeJuridique, numeroEnregistrement, identifiantFiscal, address, city, region</Text></Text>
              <br />
              <Text type="secondary">Separateur accepte : virgule (,) ou point-virgule (;)</Text>
            </div>
          }
          style={{ marginBottom: 16 }}
        />
        <Upload.Dragger
          accept=".csv"
          showUploadList={false}
          beforeUpload={handleImportCSV}
          disabled={importing}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined style={{ fontSize: 40, color: '#1B2A4A' }} /></p>
          <p className="ant-upload-text">{importing ? 'Import en cours...' : 'Cliquez ou glissez un fichier CSV ici'}</p>
          <p className="ant-upload-hint">Fichier .csv uniquement</p>
        </Upload.Dragger>

        {importResults && (
          <div style={{ marginTop: 16 }}>
            <Alert
              type={importResults.errors?.length > 0 ? 'warning' : 'success'}
              message={`Import termine : ${importResults.success} clients importes, ${importResults.errors?.length || 0} erreurs`}
              style={{ marginBottom: 8 }}
            />
            {importResults.errors?.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto' }}>
                <Table
                  dataSource={importResults.errors}
                  columns={[
                    { title: 'Ligne', dataIndex: 'row', width: 70 },
                    { title: 'Erreur', dataIndex: 'error' },
                  ]}
                  rowKey="row"
                  size="small"
                  pagination={false}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal FUSION DOUBLONS */}
      <Modal
        title={<span><MergeCellsOutlined /> Fusion de doublons</span>}
        open={mergeModalOpen}
        onCancel={() => { setMergeModalOpen(false); setMergePrimaryId(''); setMergeSecondaryId(''); setMergePrimaryResults([]); setMergeSecondaryResults([]); }}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setMergeModalOpen(false)}>Annuler</Button>,
          <Popconfirm
            key="merge"
            title="Confirmer la fusion ?"
            description="Le client secondaire sera supprime et ses comptes/credits seront transferes au client primaire. Cette action est irreversible."
            onConfirm={handleMerge}
            okText="Oui, fusionner"
            cancelText="Non"
          >
            <Button type="primary" danger loading={merging} disabled={!mergePrimaryId || !mergeSecondaryId || mergePrimaryId === mergeSecondaryId} icon={<SwapOutlined />}>
              Fusionner
            </Button>
          </Popconfirm>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="Attention : la fusion est irreversible"
          description="Le client secondaire sera supprime. Ses comptes, credits et mandataires seront transferes au client primaire. Les champs manquants du primaire seront completes avec ceux du secondaire."
          style={{ marginBottom: 16 }}
        />

        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title={<Text strong style={{ color: '#389e0d' }}>Client primaire (conserve)</Text>} style={{ borderColor: '#b7eb8f' }}>
              <Space style={{ width: '100%', marginBottom: 8 }}>
                <Input placeholder="Rechercher..." value={mergeSearchPrimary} onChange={e => setMergeSearchPrimary(e.target.value)} onPressEnter={() => handleSearchMerge(mergeSearchPrimary, 'primary')} />
                <Button icon={<SearchOutlined />} onClick={() => handleSearchMerge(mergeSearchPrimary, 'primary')} />
              </Space>
              <div style={{ maxHeight: 250, overflow: 'auto' }}>
                {mergePrimaryResults.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setMergePrimaryId(c.id)}
                    style={{
                      padding: '8px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                      border: mergePrimaryId === c.id ? '2px solid #389e0d' : '1px solid #d9d9d9',
                      background: mergePrimaryId === c.id ? '#f6ffed' : '#fff',
                    }}
                  >
                    <Text strong>{getDisplayName(c)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{c.clientNumber} | {c.phone}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title={<Text strong style={{ color: '#cf1322' }}>Client secondaire (supprime)</Text>} style={{ borderColor: '#ffa39e' }}>
              <Space style={{ width: '100%', marginBottom: 8 }}>
                <Input placeholder="Rechercher..." value={mergeSearchSecondary} onChange={e => setMergeSearchSecondary(e.target.value)} onPressEnter={() => handleSearchMerge(mergeSearchSecondary, 'secondary')} />
                <Button icon={<SearchOutlined />} onClick={() => handleSearchMerge(mergeSearchSecondary, 'secondary')} />
              </Space>
              <div style={{ maxHeight: 250, overflow: 'auto' }}>
                {mergeSecondaryResults.map((c: any) => (
                  <div
                    key={c.id}
                    onClick={() => setMergeSecondaryId(c.id)}
                    style={{
                      padding: '8px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                      border: mergeSecondaryId === c.id ? '2px solid #cf1322' : '1px solid #d9d9d9',
                      background: mergeSecondaryId === c.id ? '#fff1f0' : '#fff',
                    }}
                  >
                    <Text strong>{getDisplayName(c)}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{c.clientNumber} | {c.phone}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </Modal>
    </div>
  );
}
