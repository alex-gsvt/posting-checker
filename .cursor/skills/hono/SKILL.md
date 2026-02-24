---
name: hono
description: Provides comprehensive knowledge of Hono web framework for building fast, lightweight web applications on Cloudflare Workers, Deno, Bun, Node.js and other runtimes. Use when working with Hono, creating API routes, middleware, handling requests/responses, or when user mentions Hono framework, web APIs, or edge computing.
---

# Hono Framework

Hono - _**means flame🔥 in Japanese**_ - is a small, simple, and ultrafast web framework built on Web Standards. It works on any JavaScript runtime: Cloudflare Workers, Fastly Compute, Deno, Bun, Vercel, Netlify, AWS Lambda, Lambda@Edge, and Node.js.

## Quick Start

```ts
import { Hono } from 'hono'
const app = new Hono()

app.get('/', (c) => c.text('Hono!'))

export default app
```

## Core Concepts

### Context (`c`)

The `Context` object provides access to request/response:

```ts
app.get('/posts/:id', (c) => {
  const id = c.req.param('id')           // Path parameter
  const page = c.req.query('page')       // Query parameter
  const userAgent = c.req.header('User-Agent') // Header
  
  c.header('X-Custom', 'value')         // Set response header
  return c.json({ id, page })            // Return JSON
})
```

### Routing

```ts
// HTTP methods
app.get('/posts', handler)
app.post('/posts', handler)
app.put('/posts/:id', handler)
app.delete('/posts/:id', handler)

// Path parameters
app.get('/posts/:id', (c) => {
  const { id } = c.req.param()
})

// Query parameters
app.get('/search', (c) => {
  const { q, limit } = c.req.query()
})

// Wildcards
app.get('/static/*', handler)

// Grouping routes
const api = new Hono()
api.get('/users', handler)
app.route('/api', api)
```

### Middleware

Middleware executes before/after handlers:

```ts
// Custom middleware
app.use(async (c, next) => {
  console.log(`${c.req.method} ${c.req.path}`)
  await next()
  console.log(`Status: ${c.res.status}`)
})

// Built-in middleware
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { basicAuth } from 'hono/basic-auth'

app.use(logger())
app.use('/api/*', cors())
app.use('/admin/*', basicAuth({ username: 'admin', password: 'secret' }))
```

### Request Body Parsing

```ts
// JSON
app.post('/posts', async (c) => {
  const body = await c.req.json()
})

// Form data
app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] // File | string
})

// Text
const text = await c.req.text()
```

### Response Helpers

```ts
c.text('Hello')                    // text/plain
c.json({ message: 'Hello' })       // application/json
c.html('<h1>Hello</h1>')          // text/html
c.redirect('/new-path')           // 302 redirect
c.status(201)                     // Set status code
```

### Validation

Use validators with Zod or other libraries:

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

### Type Safety

Define types for bindings and variables:

```ts
type Bindings = {
  KV: KVNamespace
  API_KEY: string
}

type Variables = {
  user: User
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use(async (c, next) => {
  c.set('user', await getUser())
  await next()
})

app.get('/data', async (c) => {
  const user = c.get('user')  // Typed as User
  await c.env.KV.put('key', 'value')
  return c.json({ user })
})
```

### Error Handling

```ts
import { HTTPException } from 'hono/http-exception'

// Throw HTTPException
app.get('/posts/:id', async (c) => {
  const post = await getPost(c.req.param('id'))
  if (!post) {
    throw new HTTPException(404, { message: 'Post not found' })
  }
  return c.json(post)
})

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  return c.text('Internal Server Error', 500)
})
```

## Common Patterns

### Cloudflare Workers

```ts
import { Hono } from 'hono'

type Bindings = {
  KV: KVNamespace
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/data', async (c) => {
  const value = await c.env.KV.get('key')
  const result = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(result)
})

export default app
```

### RPC Mode

Share API types between server and client:

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
const data = await res.json() // Typed!
```

### Testing

```ts
import { testClient } from 'hono/testing'

const client = testClient(app)

const res = await client.posts.$get({ query: { page: '1' } })
expect(res.status).toBe(200)
```

## Key Features

- **Ultrafast**: RegExpRouter is the fastest router in JavaScript
- **Lightweight**: Under 14KB with `hono/tiny` preset
- **Multi-runtime**: Same code runs everywhere
- **Type-safe**: Full TypeScript support with RPC
- **Web Standards**: Uses Fetch API, Request, Response

## When to Use

- Building Web APIs
- Edge applications (Cloudflare Workers, Deno Deploy)
- Proxy servers
- Full-stack applications
- Microservices

## Additional Resources

- For complete API reference, see [reference.md](reference.md)
- For middleware examples, see [reference.md](reference.md#middleware)
- For platform-specific guides, see [reference.md](reference.md#platforms)
