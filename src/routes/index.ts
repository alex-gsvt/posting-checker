import { Hono } from 'hono';
import { resultsRouter } from './results';
import { tasksRouter } from './tasks';
import type { HonoEnv } from '../types';

export const apiRouter = new Hono<HonoEnv>()
	.route('/', tasksRouter)
	.route('/', resultsRouter);
