import { NestFactory } from '@nestjs/core'
import AppModule from './app.module'
import configService from './config.service'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { GlobalExceptionFilter } from './filters/global-exception.filter'
import { Logger } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import type { NextFunction, Request, Response } from 'express'
import { loadBlocklist } from './lernkit/blocklist'

async function bootstrap() {
  // lernkit: Link-Sperrliste beim Start laden (nicht erst beim ersten Link)
  loadBlocklist()
  const logger = new Logger('Main Process')

  // Process-level handlers for uncaught errors - anything that happens outside of NestJS, such as type errors.
  // This is only logged server-side so we log the whole stack for better review.
  process.on('warning', (warning) => {
    logger.warn(`${warning.name}: ${warning.message}`)
  })

  process.on('unhandledRejection', (reason: unknown) => {
    const stack =
      reason instanceof Error ? reason.stack : 'No stack trace available'
    logger.error('Unhandled Rejection. Stack trace: ', stack)
  })

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: configService.getLogLevels(),
  })

  // Runs the onModuleDestroy hooks on SIGTERM, which persist the open maps
  app.enableShutdownHooks()

  app.useGlobalFilters(new GlobalExceptionFilter())

  // WS_TRUST_PROXY also decides whether req.ip comes from X-Forwarded-For, so
  // the upload rate limit and the WebSocket limiter key on the same IP. Left
  // off, Express keeps its default and reads the socket address.
  const trustProxy = configService.getTrustProxy()
  if (trustProxy !== false) app.set('trust proxy', trustProxy)
  // lernkit: Sicherheits-Header für alle Antworten (Seite, Assets, API). Die CSP entspricht
  // der <meta>-CSP der index.html, ergänzt um Direktiven, die nur als Header wirken
  // (frame-ancestors, base-uri, form-action). TLS terminiert der Coolify-Proxy, HSTS gilt
  // für den Client. X-Powered-By verrät sonst das Framework.
  app.disable('x-powered-by')
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
    )
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    next()
  })

  app.use(
    '/arasaac/api',
    createProxyMiddleware({
      target: 'https://api.arasaac.org/api',
      changeOrigin: true,
      pathRewrite: {
        '^/arasaac/api': '/',
      },
    })
  )

  app.use(
    '/arasaac/images',
    createProxyMiddleware({
      target: 'https://static.arasaac.org/',
      changeOrigin: true,
      pathRewrite: {
        '^/arasaac/images': '/',
      },
    })
  )

  app.useStaticAssets(join(__dirname, '..', 'client/browser/assets'), {
    prefix: '/assets/',
    setHeaders: (res, path) => {
      if (path.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400')
      }
    },
  })

  await app.listen(configService.getPort())
}
bootstrap()
