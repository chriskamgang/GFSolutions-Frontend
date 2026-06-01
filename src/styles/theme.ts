import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#1B2A4A',
    colorSuccess: '#52c41a',
    colorWarning: '#F5A623',
    colorError: '#ff4d4f',
    colorInfo: '#1B2A4A',
    borderRadius: 8,
    fontFamily: "'Open Sans', sans-serif",
  },
  components: {
    Layout: {
      siderBg: '#1B2A4A',
      headerBg: '#ffffff',
      bodyBg: '#f0f2f5',
    },
    Menu: {
      darkItemBg: '#1B2A4A',
      darkItemSelectedBg: '#F5A623',
      darkItemHoverBg: '#2a3f6a',
      darkItemColor: '#ffffffcc',
      darkItemSelectedColor: '#ffffff',
    },
    Button: {
      colorPrimary: '#F5A623',
      colorPrimaryHover: '#d4900e',
    },
  },
};

export const colors = {
  primary: '#1B2A4A',
  secondary: '#F5A623',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  bgLight: '#f0f2f5',
  white: '#ffffff',
  textPrimary: '#1B2A4A',
  textSecondary: '#8c8c8c',
};
