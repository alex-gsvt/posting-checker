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

export interface Bindings extends Env {}

export interface HonoEnv  {
	Bindings: Bindings;
}
