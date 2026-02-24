import { publishWithAttempts } from '../publisher/attempts';
import { verifyPublishedUrl } from '../publisher/verify';
import { createD1ResultStorage } from '../storage/d1';
import type { QueueMessage, TaskResult } from '../types';

export const processTask = async (task: QueueMessage, env: { DB: D1Database }): Promise<void> => {
	const storage = createD1ResultStorage(env.DB);
	const result = await publishWithAttempts(task);

	if ('error' in result) {
		const taskResult: TaskResult = {
			taskId: task.id,
			owner: task.owner,
			meta: task.meta,
			site: task.site,
			resultUrl: null,
			status: 'error',
			error: result.error,
			completedAt: Date.now(),
		};
		await storage.save(taskResult);
		return;
	}

	const verified = await verifyPublishedUrl(result.url);
	const taskResult: TaskResult = {
		taskId: task.id,
		owner: task.owner,
		meta: task.meta,
		site: task.site,
		resultUrl: verified.finalUrl,
		status: verified.ok ? 'done' : 'error',
		error: verified.ok ? undefined : verified.reason,
		completedAt: Date.now(),
	};
	await storage.save(taskResult);
};
