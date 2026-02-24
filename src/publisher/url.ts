import { BROWSER_HEADERS } from './constants';

const discardBody = (r: Response) => r.body?.cancel?.();

const resolvePublicUrl = async (url: string, signal?: AbortSignal): Promise<string> => {
	const resp = await fetch(url, { redirect: 'manual', headers: BROWSER_HEADERS, signal });
	if (resp.status >= 300 && resp.status < 400) {
		const loc = resp.headers.get('Location');
		if (loc) {
			await discardBody(resp);
			return loc;
		}
	}
	await discardBody(resp);
	return url;
};

export const getFinalUrlAfterRedirects = async (url: string, signal?: AbortSignal): Promise<string> => {
	let currentUrl = url;
	const maxRedirects = 10;
	const visitedUrls = new Set<string>();
	for (let i = 0; i < maxRedirects; i++) {
		if (visitedUrls.has(currentUrl)) return currentUrl;
		visitedUrls.add(currentUrl);
		try {
			const resp = await fetch(currentUrl, { redirect: 'manual', headers: BROWSER_HEADERS, signal });
			if (resp.status < 300 || resp.status >= 400) {
				await discardBody(resp);
				return currentUrl;
			}
			const location = resp.headers.get('Location');
			if (!location) {
				await discardBody(resp);
				return currentUrl;
			}
			await discardBody(resp);
			currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
		} catch {
			return currentUrl;
		}
	}
	return currentUrl;
};

const getPublicLink = async (
	site: string,
	postId: string,
	username: string,
	password: string,
	signal?: AbortSignal
): Promise<string> => {
	const url = site.replace(/\/+$/, '') + '/wp-json/wp/v2/posts/' + postId;
	const auth = btoa(`${username}:${password}`);
	const resp = await fetch(url, {
		method: 'get',
		headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
		signal,
	});
	if (resp.status !== 200) {
		await discardBody(resp);
		throw new Error(`REST API returned status ${resp.status}`);
	}
	const data = (await resp.json()) as { link?: string };
	if (!data?.link) throw new Error('REST API response missing link field');
	return data.link;
};

const getPublicLinkFromEditPage = async (
	site: string,
	postId: string,
	username: string,
	password: string,
	signal?: AbortSignal
): Promise<string> => {
	try {
		const editUrl = site.replace(/\/+$/, '') + '/wp-admin/post.php?post=' + postId + '&action=edit';
		const auth = btoa(`${username}:${password}`);
		const resp = await fetch(editUrl, {
			method: 'get',
			headers: {
				Authorization: `Basic ${auth}`,
				Accept: 'text/html',
				Referer: site.replace(/\/+$/, '') + '/wp-admin/edit.php',
			},
			signal,
		});
		if (resp.status !== 200) {
			await discardBody(resp);
			return '';
		}
		const html = await resp.text();
		let m = html.match(/id=["']sample-permalink["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
		if (m?.[1]) return m[1];
		m = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>(?:\s*View\s*|Переглянути|Просмотр|Visualizar|Ver)\s*<\/a>/i);
		if (m?.[1]) return m[1];
		m = html.match(/>(?:\s*Permalink\s*|Постійне посилання|Постоянная ссылка|Link permanente)<\/span>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
		return m?.[1] ?? '';
	} catch {
		return '';
	}
};

export const getPublicUrlHybrid = async (
	site: string,
	postId: string,
	username: string,
	password: string,
	signal?: AbortSignal
): Promise<string> => {
	const fallbackUrl = site.replace(/\/+$/, '') + '/?p=' + postId;
	try {
		const restUrl = await getPublicLink(site, postId, username, password, signal);
		if (restUrl && !restUrl.includes('/?p=')) return restUrl;
	} catch {
		// continue
	}
	const editPageUrl = await getPublicLinkFromEditPage(site, postId, username, password, signal);
	if (editPageUrl && !editPageUrl.includes('/?p=')) return editPageUrl;
	try {
		const resolvedUrl = await resolvePublicUrl(site.replace(/\/+$/, '') + '/?p=' + postId, signal);
		if (resolvedUrl && !resolvedUrl.includes('/?p=')) return resolvedUrl;
	} catch {
		// continue
	}
	return fallbackUrl;
};
