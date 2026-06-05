import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEV_PROXY_CONFIG__: JSON.stringify({
      enabled: true,
      prefix: '/api-proxy',
      target: 'https://api.suchuang.vip/v1',
      changeOrigin: true,
      secure: true,
    }),
  },
  server: {
    host: true,
    allowedHosts: ['fn.xmuchuan.cn', '.xmuchuan.cn'],
    proxy: {
      // 外部 API 代理 - 必须在 /api 之前，避免被抢先匹配
      '/api-proxy': {
        target: 'https://api.suchuang.vip/v1',
        changeOrigin: true,
        secure: true,
        rewrite: (path: string) => path.replace(/^\/api-proxy/, ''),
        timeout: 600000,
        proxyTimeout: 600000,
      },
      // 后端 API 代理
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
      // 上传文件代理
      '/uploads': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
})
