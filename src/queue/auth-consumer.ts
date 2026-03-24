import { cleanCred } from '../publisher/attempts';
import { checkAuthWithAttempts } from '../publisher/auth';
import type { AuthCheckMessage, IArchiveService } from '../types';

export const processAuthTask = async (
	task: AuthCheckMessage,
	env: Env,
): Promise<void> => {
	const archive = env.ARCHIVE as unknown as IArchiveService;
	const result = await checkAuthWithAttempts(
		task.site,
		cleanCred(task.login),
		cleanCred(task.password),
	);
	await archive.updateLoginResult(task.archiveRecordId, {
		...result,
		checkedAt: Date.now(),
	});
};
