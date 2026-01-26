import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    base: '/glasses_test',
    plugins: [react()],
    server: {
        proxy: {
            '/users': {
                target: 'http://localhost:8083',
                changeOrigin: true,
            },
            '/organizations': {
                target: 'http://localhost:8083',
                changeOrigin: true,
            },
            '/time-data': {
                target: 'http://localhost:8083',
                changeOrigin: true,
            }
        }
    }
})
