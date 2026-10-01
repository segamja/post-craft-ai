import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * 로컬 개발용: /api/<name> 요청을 api/<name>.ts 의 POST(Request) 핸들러로 연결한다.
 * 배포 환경에서는 Vercel Functions가 같은 파일을 실행하므로 Vercel CLI 없이 같은 코드를 쓸 수 있다.
 */
export function apiDevPlugin(): Plugin {
  return {
    name: 'postcraft-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const match = /^\/api\/([a-z0-9-]+)$/.exec(url.pathname)
        if (!match) return next()
        const file = path.resolve(server.config.root, 'api', `${match[1]}.ts`)
        if (!existsSync(file)) return next()

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const method = req.method ?? 'GET'
          const request = new Request(url, {
            method,
            headers,
            body: method === 'GET' || method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })

          const mod = (await server.ssrLoadModule(file)) as Record<string, unknown>
          const handler = mod[method]
          const response =
            typeof handler === 'function'
              ? await (handler as (r: Request) => Promise<Response>)(request)
              : new Response('Method Not Allowed', { status: 405 })

          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(`[api] ${String(e)}`)
          res.statusCode = 500
          res.end(JSON.stringify({ ok: false, error: { code: 'AI_UPSTREAM_ERROR', message: '서버 오류' } }))
        }
      })
    },
  }
}
