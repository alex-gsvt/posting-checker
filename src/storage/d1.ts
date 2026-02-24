import type { TaskResult } from '../types';
import type { IResultStorage } from './types';

export const createD1ResultStorage = (db: D1Database): IResultStorage => ({
	save: async (result: TaskResult) => {
		await db
			.prepare(
				`INSERT INTO results (id, owner, meta, site, result_url, status, error, completed_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				result.taskId,
				result.owner,
				result.meta ?? null,
				result.site,
				result.resultUrl ?? null,
				result.status,
				result.error ?? null,
				result.completedAt
			)
			.run();
	},
	query: async (owner: string, since: number, limit: number) => {
		const stmt = db
			.prepare(
				`SELECT id as taskId, owner, meta, site, result_url as resultUrl, status, error, completed_at as completedAt
				 FROM results
				 WHERE owner = ? AND completed_at >= ?
				 ORDER BY completed_at DESC
				 LIMIT ?`
			)
			.bind(owner, since, limit);
		const { results } = await stmt.all<{
			taskId: string;
			owner: string;
			meta: string | null;
			site: string;
			resultUrl: string | null;
			status: string;
			error: string | null;
			completedAt: number;
		}>();
		return results.map((r) => ({
			taskId: r.taskId,
			owner: r.owner,
			meta: r.meta ?? undefined,
			site: r.site,
			resultUrl: r.resultUrl,
			status: r.status as 'done' | 'error',
			error: r.error ?? undefined,
			completedAt: r.completedAt,
		}));
	},
});
