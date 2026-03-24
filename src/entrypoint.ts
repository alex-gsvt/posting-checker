import { WorkerEntrypoint } from 'cloudflare:workers';
import type { AuthCheckMessage, EnqueueAuthRecord } from './types';

const toAuthMessage = (r: EnqueueAuthRecord): AuthCheckMessage => ({
	id: crypto.randomUUID(),
	archiveRecordId: r.archiveRecordId,
	owner: r.owner,
	login: r.login,
	password: r.password,
	site: r.site,
	meta: r.meta,
	createdAt: Date.now(),
});

const chunks = <T>(arr: T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export class PostingCheckerEntrypoint extends WorkerEntrypoint<Env> {
	async fetch(): Promise<Response> {
		return new Response(null, { status: 404 });
	}

	async enqueueAuthBatch(records: EnqueueAuthRecord[]): Promise<{ queued: number }> {
		let queued = 0;
		for (const chunk of chunks(records, 1000)) {
			await this.env.AUTH_QUEUE.sendBatch(chunk.map((r) => ({ body: toAuthMessage(r) })));
			queued += chunk.length;
		}
		return { queued };
	}
}
