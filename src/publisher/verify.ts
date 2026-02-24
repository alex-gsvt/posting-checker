import { ARTICLE_LINK, BROWSER_HEADERS } from './constants';
import { getFinalUrlAfterRedirects } from './url';

const isUrl = (text: string): boolean => {
	if (!text || typeof text !== 'string') return false;
	const trimmed = text.trim();
	if (!trimmed) return false;
	if (/^https?:\/\//i.test(trimmed)) return true;
	if (/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+/i.test(trimmed))
		return true;
	return false;
};

export interface VerifyResult {
	ok: boolean;
	finalUrl: string;
	reason?: string;
}

const discardBody = (r: Response) => r.body?.cancel?.();

export const verifyPublishedUrl = async (resultUrl: string): Promise<VerifyResult> => {
	if (!isUrl(resultUrl) || resultUrl.startsWith('ERROR:'))
		return { ok: false, finalUrl: resultUrl, reason: 'Invalid URL' };
	try {
		const resp = await fetch(resultUrl, { redirect: 'follow', headers: BROWSER_HEADERS });
		const httpStatus = resp.status;

		if (httpStatus >= 400) {
			await discardBody(resp);
			return { ok: false, finalUrl: resultUrl, reason: `HTTP ${httpStatus}` };
		}
		if (httpStatus >= 200 && httpStatus < 400) {
			const pageContent = await resp.text();
			const noindexPattern = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex[^"']*["']/i;
			if (noindexPattern.test(pageContent))
				return { ok: false, finalUrl: 'NOINDEX', reason: 'meta robots noindex' };
			if (pageContent.includes(ARTICLE_LINK)) {
				const finalUrl = await getFinalUrlAfterRedirects(resultUrl);
				return { ok: true, finalUrl };
			}
			return { ok: false, finalUrl: resultUrl, reason: 'ARTICLE_LINK not found on page' };
		}
		await discardBody(resp);
		return { ok: false, finalUrl: resultUrl, reason: `HTTP ${httpStatus}` };
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return { ok: false, finalUrl: resultUrl, reason: msg };
	}
};
