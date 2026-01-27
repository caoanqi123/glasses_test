import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            // 让前端仍然请求 /users /organizations /time-data
            '/users': {
                target: 'http://10.160.8.131:18083',
                changeOrigin: true,
            },
            '/organizations': {
                target: 'http://10.160.8.131:18083',
                changeOrigin: true,
            },
            '/time-data': {
                target: 'http://10.160.8.131:18083',
                changeOrigin: true,
            }
        }
    }
})
