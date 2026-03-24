import { processAuthTask } from './auth-consumer';
import { processTask } from './consumer';
import type { AuthCheckMessage, QueueMessage } from '../types';

export const handleQueue: ExportedHandlerQueueHandler<Env> = async (batch, env, ctx) => {
	switch (batch.queue) {
		case 'auth-checker-queue':
			return handleAuthQueue(batch as MessageBatch<AuthCheckMessage>, env, ctx);
		case 'posting-checker-queue':
			return handlePostingQueue(batch as MessageBatch<QueueMessage>, env, ctx);
		default:
			throw new Error('Invalid queue');
	}
};

const handleAuthQueue: ExportedHandlerQueueHandler<Env, AuthCheckMessage> = async (batch, env) => {
	const results = await Promise.allSettled(batch.messages.map((msg) => processAuthTask(msg.body, env)));
	batch.messages.forEach((msg, i) => {
		results[i].status === 'fulfilled' ? msg.ack() : msg.retry();
	});
};

const handlePostingQueue: ExportedHandlerQueueHandler<Env, QueueMessage> = async (batch, env) => {
	const results = await Promise.allSettled(batch.messages.map((msg) => processTask(msg.body, env)));
	batch.messages.forEach((msg, i) => {
		results[i].status === 'fulfilled' ? msg.ack() : msg.retry();
	});
};
