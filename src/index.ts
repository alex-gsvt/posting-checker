import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { swaggerUI } from '@hono/swagger-ui';
import { handleCron } from './cron';
import { auth, decompress } from './middleware';
import { openApiDoc } from './openapi';
import { apiRouter } from './routes';
import type { HonoEnv, QueueMessage } from './types';
import { handleQueue } from './queue';

const app = new Hono<HonoEnv>();

app.use('*', decompress);
app.use('/api/*', auth);

app.get('/health', (c) => c.text('OK'));

app.get('/doc', (c) => c.json(openApiDoc));
app.get('/ui', swaggerUI({ url: '/doc' }));

app.route('/api', apiRouter);

app.onError((err, c) => {
	if (err instanceof HTTPException) return err.getResponse();
	return c.text('Internal Server Error', 500);
});

export default {
	fetch: app.fetch,
	scheduled: handleCron,
	queue: handleQueue,
} satisfies ExportedHandler<Env, QueueMessage>;
