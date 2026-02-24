import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';

const COMPRESSED = new Set(['gzip', 'deflate']);

export const decompress = createMiddleware<HonoEnv>(async (c, next) => {
	if (c.req.method !== 'POST') return next();

	const encoding = c.req.header('content-encoding');
	if (!encoding || !COMPRESSED.has(encoding)) return next();

	const body = c.req.raw.body;
	if (!body) return next();

	const decompressed = await new Response(
		body.pipeThrough(new DecompressionStream(encoding as 'gzip' | 'deflate'))
	).arrayBuffer();

	const headers = new Headers(c.req.raw.headers);
	headers.delete('content-encoding');
	headers.delete('content-length');

	Object.defineProperty(c.req, 'raw', {
		value: new Request(c.req.raw.url, {
			method: c.req.raw.method,
			headers,
			body: decompressed,
		}),
		writable: true,
	});

	return next();
});
