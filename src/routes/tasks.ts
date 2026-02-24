import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { HonoEnv, QueueMessage } from '../types';

const taskItemSchema = z.object({
	meta: z.string().optional(),
	login: z.string().min(1),
	password: z.string().min(1),
	site: z.string().min(1),
});

const taskInputSchema = z.object({
	owner: z.string().min(1),
	tasks: z.array(taskItemSchema).min(1),
});

export const tasksRouter = new Hono<HonoEnv>()
	.post(
		'/add-task',
		zValidator('json', taskInputSchema),
		async (c) => {
			const { owner, tasks } = c.req.valid('json');
			const jobId = crypto.randomUUID();

			for (const t of tasks) {
				const msg: QueueMessage = {
					id: crypto.randomUUID(),
					owner,
					meta: t.meta,
					login: t.login,
					password: t.password,
					site: t.site,
					createdAt: Date.now(),
				};
				await c.env.QUEUE.send(msg);
			}

			return c.json({ jobId, queued: tasks.length });
		}
	);
