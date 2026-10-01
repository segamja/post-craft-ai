import { defineConfig, devices } from '@playwright/test'

// E2E (명세 §24.3): OpenAI는 Mock(AI_MOCK=1)으로 대체한다. 실제 키가 .env.local에 있어도 호출하지 않는다.
const PORT = 5174

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ko-KR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { AI_MOCK: '1', APP_ACCESS_TOKEN: '' },
  },
})
