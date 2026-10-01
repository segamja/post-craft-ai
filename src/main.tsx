import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Providers } from '@/app/Providers'
import { createAppRouter } from '@/app/router'
import { runStartupMaintenance } from '@/lib/db/maintenance'
import './index.css'

const router = createAppRouter()
void runStartupMaintenance()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
