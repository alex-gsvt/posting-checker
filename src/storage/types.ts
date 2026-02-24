import type { TaskResult } from '../types';

export interface IResultStorage {
	save(result: TaskResult): Promise<void>;
	query(owner: string, since: number, limit: number): Promise<TaskResult[]>;
}
