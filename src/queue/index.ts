import { processTask } from './consumer';
import type { QueueMessage } from '../types';

export const handleQueue: ExportedHandlerQueueHandler<Env, QueueMessage> = async (batch, env) => {
	const results = await Promise.allSettled(batch.messages.map((msg) => processTask(msg.body, env)));
	batch.messages.forEach((msg, i) => {
		results[i].status === 'fulfilled' ? msg.ack() : msg.retry();
	});
};
