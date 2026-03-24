import type { AuthResult } from './publisher/auth';

export type { AuthResult };

export interface TaskInputItem {
	meta?: string;
	login: string;
	password: string;
	site: string;
}

export interface TaskInput {
	owner: string;
	tasks: TaskInputItem[];
}

export interface QueueMessage {
	id: string;
	owner: string;
	meta?: string;
	login: string;
	password: string;
	site: string;
	createdAt: number;
}

export interface TaskResult {
	taskId: string;
	owner: string;
	meta?: string;
	site: string;
	resultUrl: string | null;
	status: 'done' | 'error';
	error?: string;
	completedAt: number;
}

export interface AuthCheckMessage {
	id: string;
	archiveRecordId: string;
	owner: string;
	login: string;
	password: string;
	site: string;
	meta?: string;
	createdAt: number;
}

export interface IAuthCheckResult {
	status: 'valid' | 'invalid' | 'unavailable';
	error?: string;
	checkedAt: number;
}

export interface IArchiveService {
	updateLoginResult(archiveRecordId: string, result: IAuthCheckResult): Promise<void>;
}

export interface EnqueueAuthRecord {
	archiveRecordId: string;
	owner: string;
	login: string;
	password: string;
	site: string;
	meta?: string;
}

export interface Bindings extends Env {}

export interface HonoEnv {
	Bindings: Bindings;
}
