import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const host = process.env.HOST ?? '0.0.0.0'
const port = Number(process.env.PORT ?? '4173')
const distRoot = join(process.cwd(), 'dist')

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function contentType(pathname) {
  return MIME_TYPES[extname(pathname)] ?? 'application/octet-stream'
}

function resolveRequestPath(urlPathname) {
  const pathname = urlPathname === '/' ? '/index.html' : urlPathname
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  return join(distRoot, safePath)
}

async function serveFile(response, pathname) {
  try {
    const file = await readFile(pathname)
    response.writeHead(200, {
      'Content-Type': contentType(pathname),
    })
    response.end(file)
    return true
  } catch {
    return false
  }
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  )
  const resolvedPath = resolveRequestPath(requestUrl.pathname)

  if (await serveFile(response, resolvedPath)) {
    return
  }

  if (requestUrl.pathname.includes('.')) {
    response.writeHead(404, {
      'Content-Type': 'text/plain; charset=utf-8',
    })
    response.end('Not found')
    return
  }

  if (await serveFile(response, join(distRoot, 'index.html'))) {
    return
  }

  response.writeHead(500, {
    'Content-Type': 'text/plain; charset=utf-8',
  })
  response.end('dist/index.html is missing. Run `npm run build` first.')
})

server.listen(port, host, () => {
  process.stdout.write(
    `Serving dist/ at http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${String(port)}\n`,
  )
})
