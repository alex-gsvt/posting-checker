# Hono Framework - Complete Reference

This document contains the complete Hono framework documentation for reference.

## Table of Contents

1. [Getting Started](#getting-started)
2. [API Reference](#api-reference)
3. [Routing](#routing)
4. [Context](#context)
5. [Middleware](#middleware)
6. [Helpers](#helpers)
7. [Platforms](#platforms)
8. [Best Practices](#best-practices)

---

## Getting Started

### Installation

```bash
npm create hono@latest my-app
```

### Basic Example

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hello Hono!'))

export default app
```

---

## API Reference

### Hono Class

```ts
const app = new Hono<{
  Bindings: Bindings
  Variables: Variables
}>()
```

#### Methods

- `app.get(path, ...handlers)`
- `app.post(path, ...handlers)`
- `app.put(path, ...handlers)`
- `app.delete(path, ...handlers)`
- `app.patch(path, ...handlers)`
- `app.all(path, ...handlers)`
- `app.on(method, path, ...handlers)`
- `app.use(path, middleware)`
- `app.route(path, app)`
- `app.basePath(path)`
- `app.notFound(handler)`
- `app.onError(handler)`
- `app.fetch(request, env, executionCtx)`
- `app.request(path, options)`

---

## Routing

### Basic Routes

```ts
app.get('/', (c) => c.text('GET /'))
app.post('/', (c) => c.text('POST /'))
app.put('/', (c) => c.text('PUT /'))
app.delete('/', (c) => c.text('DELETE /'))
```

### Path Parameters

```ts
app.get('/posts/:id', (c) => {
  const id = c.req.param('id')
  // or
  const { id } = c.req.param()
})

app.get('/posts/:id/comments/:commentId', (c) => {
  const { id, commentId } = c.req.param()
})
```

### Optional Parameters

```ts
app.get('/api/animal/:type?', (c) => c.text('Animal!'))
```

### Regexp Patterns

```ts
app.get('/post/:date{[0-9]+}/:title{[a-z]+}', (c) => {
  const { date, title } = c.req.param()
})
```

### Wildcards

```ts
app.get('/wild/*/card', (c) => c.text('Wildcard'))
app.get('/static/*', serveStatic())
```

### Query Parameters

```ts
app.get('/search', (c) => {
  const q = c.req.query('q')
  const { q, limit, offset } = c.req.query()
})

app.get('/tags', (c) => {
  const tags = c.req.queries('tags') // string[]
})
```

### Grouping Routes

```ts
const api = new Hono()
api.get('/users', handler)
api.post('/users', handler)

app.route('/api', api)
```

### Base Path

```ts
const api = new Hono().basePath('/api')
api.get('/book', handler) // GET /api/book
```

### Chained Routes

```ts
app
  .get('/endpoint', handler)
  .post(handler)
  .delete(handler)
```

---

## Context

### Request (`c.req`)

```ts
// Path parameters
const id = c.req.param('id')
const { id, slug } = c.req.param()

// Query parameters
const q = c.req.query('q')
const { q, limit } = c.req.query()
const tags = c.req.queries('tags') // string[]

// Headers
const userAgent = c.req.header('User-Agent')
const headers = c.req.header() // Record<string, string>

// Body parsing
const json = await c.req.json()
const text = await c.req.text()
const formData = await c.req.formData()
const body = await c.req.parseBody() // FormData
const blob = await c.req.blob()
const arrayBuffer = await c.req.arrayBuffer()

// Validated data
const data = c.req.valid('json')
const data = c.req.valid('form')
const data = c.req.valid('query')
const data = c.req.valid('header')
const data = c.req.valid('cookie')
const data = c.req.valid('param')

// Request info
c.req.path        // '/posts/123'
c.req.url         // 'http://localhost:8787/posts/123'
c.req.method      // 'GET'
c.req.raw         // Request object
```

### Response (`c`)

```ts
// Status code
c.status(201)

// Headers
c.header('X-Custom', 'value')
c.header('Content-Type', 'application/json')

// Response helpers
c.text('Hello')                    // text/plain
c.json({ message: 'Hello' })       // application/json
c.html('<h1>Hello</h1>')          // text/html
c.redirect('/new-path')           // 302 redirect
c.redirect('/new-path', 301)      // 301 redirect
c.notFound()                      // 404
c.body(body, status, headers)    // Raw response

// Response object
c.res                             // Response object
```

### Variables (`c.set` / `c.get`)

```ts
type Variables = {
  user: User
  message: string
}

const app = new Hono<{ Variables: Variables }>()

app.use(async (c, next) => {
  c.set('user', await getUser())
  c.set('message', 'Hello')
  await next()
})

app.get('/', (c) => {
  const user = c.get('user')
  const message = c.get('message')
  // or
  const user = c.var.user
  return c.json({ user, message })
})
```

### Environment (`c.env`)

```ts
type Bindings = {
  KV: KVNamespace
  DB: D1Database
  API_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  await c.env.KV.put('key', 'value')
  const result = await c.env.DB.prepare('SELECT * FROM users').all()
  const apiKey = c.env.API_KEY
})
```

---

## Middleware

### Custom Middleware

```ts
app.use(async (c, next) => {
  console.log('Before')
  await next()
  console.log('After')
})

app.use('/api/*', async (c, next) => {
  // Only for /api/* routes
  await next()
})
```

### Built-in Middleware

```ts
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'
import { bearerAuth } from 'hono/bearer-auth'
import { jwt } from 'hono/jwt'
import { etag } from 'hono/etag'
import { compress } from 'hono/compress'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'

app.use(logger())
app.use('/api/*', cors())
app.use('/admin/*', basicAuth({ username: 'admin', password: 'secret' }))
app.use('/api/*', bearerAuth({ token: 'secret-token' }))
app.use('/auth/*', jwt({ secret: 'secret', alg: 'HS256' }))
app.use(etag())
app.use(compress())
app.use(secureHeaders())
app.use('/slow', timeout(5000))
```

### Creating Middleware

```ts
import { createMiddleware } from 'hono/factory'

const logger = createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${c.req.method} ${c.req.path} ${ms}ms`)
})

app.use(logger)
```

---

## Helpers

### Cookie Helper

```ts
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

app.get('/cookie', (c) => {
  const value = getCookie(c, 'name')
  setCookie(c, 'name', 'value', {
    path: '/',
    secure: true,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  deleteCookie(c, 'name')
})
```

### HTML Helper

```ts
import { html, raw } from 'hono/html'

app.get('/', (c) => {
  return c.html(html`
    <!doctype html>
    <html>
      <body>
        <h1>Hello ${raw('&')} World</h1>
      </body>
    </html>
  `)
})
```

### JSX

```tsx
import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const Layout: FC = (props) => (
  <html>
    <body>{props.children}</body>
  </html>
)

app.get('/', (c) => {
  return c.html(
    <Layout>
      <h1>Hello Hono!</h1>
    </Layout>
  )
})
```

### Streaming

```ts
import { stream, streamText, streamSSE } from 'hono/streaming'

app.get('/stream', (c) => {
  return stream(c, async (stream) => {
    await stream.write(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]))
  })
})

app.get('/sse', (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: 'Hello',
      event: 'message',
      id: '1',
    })
  })
})
```

### Testing Helper

```ts
import { testClient } from 'hono/testing'

const client = testClient(app)

const res = await client.posts.$get({ query: { page: '1' } })
expect(res.status).toBe(200)
const data = await res.json()
```

---

## Platforms

### Cloudflare Workers

```ts
import { Hono } from 'hono'

type Bindings = {
  KV: KVNamespace
  DB: D1Database
  R2: R2Bucket
}

const app = new Hono<{ Bindings: Bindings }>()

export default app
```

### Deno

```ts
import { Hono } from 'hono'

const app = new Hono()
Deno.serve(app.fetch)
```

### Bun

```ts
import { Hono } from 'hono'

const app = new Hono()

export default {
  port: 3000,
  fetch: app.fetch,
}
```

### Node.js

```ts
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const app = new Hono()
serve(app)
```

---

## Validation

### Manual Validator

```ts
import { validator } from 'hono/validator'

app.post('/posts',
  validator('json', (value, c) => {
    if (!value.title || typeof value.title !== 'string') {
      return c.text('Invalid!', 400)
    }
    return { title: value.title }
  }),
  (c) => {
    const { title } = c.req.valid('json')
    return c.json({ title })
  }
)
```

### Zod Validator

```ts
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

app.post('/posts',
  zValidator('json', z.object({
    title: z.string(),
    body: z.string(),
  })),
  (c) => {
    const { title, body } = c.req.valid('json')
    return c.json({ success: true })
  }
)
```

---

## Error Handling

### HTTPException

```ts
import { HTTPException } from 'hono/http-exception'

app.get('/posts/:id', async (c) => {
  const post = await getPost(c.req.param('id'))
  if (!post) {
    throw new HTTPException(404, { message: 'Post not found' })
  }
  return c.json(post)
})
```

### Error Handler

```ts
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.text('Internal Server Error', 500)
})
```

### Not Found Handler

```ts
app.notFound((c) => {
  return c.text('Custom 404 Message', 404)
})
```

---

## Best Practices

### Don't Create Controllers

```ts
// ❌ Bad
const booksList = (c: Context) => {
  return c.json('list books')
}
app.get('/books', booksList)

// ✅ Good
app.get('/books', (c) => {
  return c.json('list books')
})
```

### Use app.route() for Larger Apps

```ts
// authors.ts
const app = new Hono()
app.get('/', (c) => c.json('list authors'))
app.post('/', (c) => c.json('create author'))
export default app

// index.ts
import authors from './authors'
app.route('/authors', authors)
```

### Type Safety

```ts
type Bindings = {
  KV: KVNamespace
}

type Variables = {
  user: User
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()
```

### RPC Mode

```ts
// server.ts
const route = app.post('/posts',
  zValidator('json', z.object({ title: z.string() })),
  (c) => c.json({ id: 1 })
)

export type AppType = typeof route

// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

const client = hc<AppType>('http://localhost:8787')
const res = await client.posts.$post({ json: { title: 'Hello' } })
```

---

## Routers

Hono has multiple routers:

- **RegExpRouter**: Fastest, uses single regex
- **TrieRouter**: Tree-based, supports all patterns
- **SmartRouter**: Automatically selects best router
- **LinearRouter**: Fast registration, for request-scoped apps
- **PatternRouter**: Smallest size

### Presets

```ts
import { Hono } from 'hono'        // SmartRouter + RegExpRouter + TrieRouter
import { Hono } from 'hono/quick'  // SmartRouter + LinearRouter + TrieRouter
import { Hono } from 'hono/tiny'   // PatternRouter
```

---

## Additional Resources

- Official docs: https://hono.dev
- GitHub: https://github.com/honojs/hono
- Examples: https://github.com/honojs/examples
