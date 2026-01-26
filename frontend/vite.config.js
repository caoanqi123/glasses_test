import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/glasses/',          // 关键：部署到子路径
    plugins: [react()],
    server: {
        proxy: {
            // 建议统一成 /api，生产也好配
            '/api/users': 'http://localhost:8083',
            '/api/time-data': 'http://localhost:8083',
            '/api/organizations': 'http://localhost:8083'
        }
    }
})
