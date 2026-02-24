import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import type { HonoEnv } from '../types';

export const auth = createMiddleware<HonoEnv>(async (c, next) => {
	const key = c.req.header('x-api-key');
	if (!key || key !== c.env.API_KEY) {
		throw new HTTPException(401, { message: 'Unauthorized' });
	}
	await next();
});
