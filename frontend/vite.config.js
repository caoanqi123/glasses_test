import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '')
    const backendTarget = env.VITE_BACKEND_TARGET || 'http://localhost:18083'

    return {
        base: '/glasses/',
        plugins: [react()],
        server: {
            proxy: {
                '/glassesBackend': {
                    target: backendTarget,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/glassesBackend/, ''),
                },
            },
        },
    }
})

