import { Hono } from 'hono';
import { createD1ResultStorage } from '../storage/d1';
import type { HonoEnv } from '../types';

export const resultsRouter = new Hono<HonoEnv>().get('/results', async (c) => {
	const owner = c.req.query('owner') ?? '';
	const since = Number(c.req.query('since') ?? 0);
	const limit = Math.min(Number(c.req.query('limit') ?? 50) || 50, 1000);

	const storage = createD1ResultStorage(c.env.DB);
	const results = await storage.query(owner, since, limit);
	return c.json({ results, count: results.length });
});
