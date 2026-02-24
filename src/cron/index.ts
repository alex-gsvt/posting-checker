export const handleCron: ExportedHandlerScheduledHandler<Env> = async (_, env) => {
	const cutoff = Date.now() - 172800 * 1000; // 48h ago (ms)
	await env.DB.prepare('DELETE FROM results WHERE completed_at < ?').bind(cutoff).run();
};
