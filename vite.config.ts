import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons'],
          'vendor-charts': ['@ant-design/charts'],
          'vendor-utils': ['axios', 'dayjs', 'xlsx'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
