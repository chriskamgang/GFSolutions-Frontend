import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [needs2FA, setNeeds2FA] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const data = await login(values.email, values.password);
      if (data.requires2FA) {
        setNeeds2FA(true);
        setCredentials(values);
        message.info('Entrez votre code 2FA');
      } else {
        message.success('Connexion reussie');
        navigate('/');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit2FA = async (values: { totpCode: string }) => {
    if (!credentials) return;
    setLoading(true);
    try {
      await login(credentials.email, credentials.password, values.totpCode);
      message.success('Connexion reussie');
      navigate('/');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Code 2FA invalide');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1B2A4A 0%, #2a3f6a 50%, #1B2A4A 100%)',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 400,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#1B2A4A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span style={{ color: '#F5A623', fontSize: 24, fontWeight: 700 }}>GFS</span>
          </div>
          <Title level={3} style={{ margin: 0, color: '#1B2A4A' }}>
            Global Financial Solution
          </Title>
          <Text type="secondary">
            {needs2FA ? 'Verification en deux etapes' : 'Connectez-vous a votre compte'}
          </Text>
        </div>

        {!needs2FA ? (
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Entrez votre email' },
                { type: 'email', message: 'Email invalide' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Email" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Entrez votre mot de passe' }]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontWeight: 600 }}
              >
                Se connecter
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form layout="vertical" onFinish={onSubmit2FA} size="large">
            <div style={{
              textAlign: 'center', marginBottom: 16, padding: 12,
              background: '#f6f8fa', borderRadius: 8,
            }}>
              <SafetyOutlined style={{ fontSize: 32, color: '#F5A623', marginBottom: 8 }} />
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>
                Ouvrez votre application d'authentification et entrez le code a 6 chiffres
              </Text>
            </div>

            <Form.Item
              name="totpCode"
              rules={[
                { required: true, message: 'Entrez le code 2FA' },
                { len: 6, message: 'Le code doit contenir 6 chiffres' },
              ]}
            >
              <Input
                prefix={<SafetyOutlined />}
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44, fontWeight: 600 }}
              >
                Verifier
              </Button>
            </Form.Item>
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={() => { setNeeds2FA(false); setCredentials(null); }}>
                Retour
              </Button>
            </div>
          </Form>
        )}

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Global Financial Solution &copy; 2024
          </Text>
        </div>
      </Card>
    </div>
  );
}
