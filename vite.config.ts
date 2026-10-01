import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { apiDevPlugin } from './dev/viteApiPlugin.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 서버 전용 변수(OPENAI_* 등)를 로컬 /api 핸들러가 읽을 수 있게 process.env에 올린다.
  // 클라이언트 번들에는 VITE_ 접두사 변수만 들어가므로 노출되지 않는다.
  for (const [k, v] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    if (!k.startsWith('VITE_') && process.env[k] === undefined) process.env[k] = v
  }

  return {
    plugins: [react(), tailwindcss(), apiDevPlugin()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'api/**/*.test.ts'],
    },
  }
})
