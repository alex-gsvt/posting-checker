import { getPublicUrlHybrid } from './url';

type RequestFn = (
	u: string,
	opt?: { method?: string; payload?: string; headers?: Record<string, string> },
) => Promise<Response>;

const discardBody = (r: Response) => r.body?.cancel?.();

const formEncode = (obj: Record<string, string>): string =>
	Object.entries(obj)
		.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
		.join('&');

const absoluteUrl = (base: string, loc: string): string =>
	/^https?:\/\//i.test(loc) ? loc : loc.startsWith('/') ? base + loc : base + '/' + loc;

export const performClassicLogin = async (
	url: string,
	username: string,
	pass: string,
	signal?: AbortSignal,
): Promise<{ jar: Map<string, string>; adminUrl: string; request: RequestFn }> => {
	const SITE = String(url)
		.replace(/\/+$/, '')
		.replace(/\/?(wp-admin|wp-login\.php)\/?$/, '');
	const ADMIN_URL = SITE + '/wp-admin/';
	const jar = new Map<string, string>();

	const addSetCookieHeaders = (resp: Response): void => {
		const setCookies = resp.headers.getSetCookie?.() ?? [];
		for (const line of setCookies) {
			const semis = line.split(';')[0];
			const eq = semis.indexOf('=');
			if (eq > 0) {
				const name = semis.slice(0, eq).trim();
				const val = semis.slice(eq + 1).trim();
				if (name && val) jar.set(name, val);
			}
		}
	};

	const cookieHeader = (): string =>
		Array.from(jar.entries())
			.map(([k, v]) => k + '=' + v)
			.join('; ');

	const request: RequestFn = async (u, opt = {}) => {
		const method = (opt.method || 'get').toLowerCase();
		const headers: Record<string, string> = {
			'User-Agent': 'Mozilla/5.0 (AppsScript)',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'en-US,en;q=0.9',
			Cookie: cookieHeader(),
			...opt.headers,
		};
		const init: RequestInit = { method, headers, redirect: 'manual', signal };
		if (opt.payload && method === 'post') {
			headers['Content-Type'] = 'application/x-www-form-urlencoded';
			if (!headers.Referer) headers.Referer = u;
			init.body = opt.payload;
		}
		const resp = await fetch(u, init);
		addSetCookieHeaders(resp);
		return resp;
	};

	const hasCookie = (prefix: string): boolean =>
		Array.from(jar.keys()).some((n) => n.toLowerCase().startsWith(prefix));

	const looksLikeLoginHtml = (html: string): boolean =>
		/<form[^>]+id=["']loginform["']/i.test(html) ||
		/<form[^>]+action=["'][^"']*wp-login\.php/i.test(html) ||
		/name=["']log["']/.test(html);

	const getFormAction = (html: string, fallbackUrl: string): string => {
		const m =
			html.match(/<form[^>]+id=["']loginform["'][^>]*action=["']([^"']+)["']/i) ||
			html.match(/<form[^>]*action=["']([^"']+)["'][^>]*id=["']loginform["']/i);
		return m?.[1] ? absoluteUrl(SITE, m[1]) : fallbackUrl.replace(/\?[^#]*$/, '');
	};

	const discoverLoginEndpoint = async (): Promise<{ page: string; post: string } | null> => {
		const r2 = await request(SITE + '/wp-admin/', { method: 'get' });
		const loc = r2.headers.get('Location');
		if (loc) {
			await discardBody(r2);
			const loginPage = absoluteUrl(SITE, loc);
			const pageResp = await request(loginPage, { method: 'get', headers: { Referer: SITE + '/' } });
			if (pageResp.status === 200) {
				const html = await pageResp.text();
				return { page: loginPage, post: getFormAction(html, loginPage) };
			}
			await discardBody(pageResp);
		} else {
			await discardBody(r2);
		}
		const std = await request(SITE + '/wp-login.php', { method: 'get' });
		if (std.status === 200) {
			const html = await std.text();
			return { page: SITE + '/wp-login.php', post: getFormAction(html, SITE + '/wp-login.php') };
		}
		await discardBody(std);
		return null;
	};

	const found = await discoverLoginEndpoint();
	if (!found) throw new Error('Login endpoint not found');
	const LOGIN_PAGE_URL = found.page;
	const LOGIN_POST_URL = found.post;

	const loginPageResp = await request(LOGIN_PAGE_URL, {
		method: 'get',
		headers: { Referer: SITE + '/' },
	});
	await discardBody(loginPageResp);

	const payloadLogin = formEncode({
		log: username,
		pwd: pass,
		'wp-submit': 'Log In',
		redirect_to: ADMIN_URL,
		testcookie: '1',
	});
	const loginPostResp = await request(LOGIN_POST_URL, {
		method: 'post',
		payload: payloadLogin,
		headers: { Origin: SITE, Referer: LOGIN_PAGE_URL },
	});
	await discardBody(loginPostResp);

	const dash = await request(ADMIN_URL, { method: 'get', headers: { Referer: LOGIN_PAGE_URL } });
	const htmlDash = await dash.text();

	if (!hasCookie('wordpress_logged_in_') || (SITE.startsWith('https://') && !hasCookie('wordpress_sec_')))
		throw new Error('Auth failed');
	if (looksLikeLoginHtml(htmlDash)) throw new Error('Auth failed');

	return { jar, adminUrl: ADMIN_URL, request };
};

export const createWpPost = async (
	url: string,
	username: string,
	pass: string,
	title: string,
	content: string,
	postStatus: string,
	postDate?: { aa: string; mm: string; jj: string; hh: string; mn: string },
	signal?: AbortSignal,
): Promise<string> => {
	const SITE = String(url)
		.replace(/\/+$/, '')
		.replace(/\/?(wp-admin|wp-login\.php)\/?$/, '');
	const STATUS = (postStatus || 'draft').toLowerCase();

	const { adminUrl: ADMIN_URL, request } = await performClassicLogin(url, username, pass, signal);

	let postNew = await request(SITE + '/wp-admin/post-new.php?classic-editor=1', {
		method: 'get',
		headers: { Referer: ADMIN_URL },
	});
	if (postNew.status !== 200) {
		await discardBody(postNew);
		postNew = await request(SITE + '/wp-admin/post-new.php', {
			method: 'get',
			headers: { Referer: ADMIN_URL },
		});
	}
	if (postNew.status !== 200) throw new Error('post-new.php not accessible');

	const pnh = await postNew.text();
	const nonce = pnh.match(/name=["']_wpnonce["'][^>]*value=["']([^"']+)["']/i)?.[1];
	const httpRef =
		pnh.match(/name=["']_wp_http_referer["'][^>]*value=["']([^"']+)["']/i)?.[1] ??
		'/wp-admin/post-new.php';
	const postId = pnh.match(/name=["']post_ID["'][^>]*value=["'](\d+)["']/i)?.[1];
	if (!nonce) throw new Error('Create nonce not found');

	const submitClassic = async (desiredStatus: string): Promise<{ code: number; id: string }> => {
		const payload: Record<string, string> = {
			_wpnonce: nonce!,
			_wp_http_referer: httpRef!,
			action: 'editpost',
			originalaction: 'editpost',
			post_type: 'post',
			post_title: title,
			content: content,
			visibility: 'public',
			post_status: desiredStatus,
			comment_status: 'open',
			ping_status: 'open',
		};
		if (postId) payload.post_ID = postId;
		if (postDate) {
			payload.aa = postDate.aa;
			payload.mm = postDate.mm;
			payload.jj = postDate.jj;
			payload.hh = postDate.hh;
			payload.mn = postDate.mn;
		}
		if (desiredStatus === 'publish') payload.publish = 'Publish';
		else payload.save = 'Save Draft';

		const resp = await request(SITE + '/wp-admin/post.php', {
			method: 'post',
			payload: formEncode(payload),
			headers: { Origin: SITE, Referer: SITE + '/wp-admin/post-new.php' },
		});
		const code = resp.status;
		const loc = resp.headers.get('Location') ?? '';
		const body = await resp.text();
		const idFromLoc = loc.match(/post=(\d+)/)?.[1];
		const idFromBody = body.match(/name=["']post_ID["'][^>]*value=["'](\d+)["']/i)?.[1];
		return { code, id: idFromLoc || idFromBody || '' };
	};

	let r = await submitClassic(STATUS);
	if ((r.code >= 300 && r.code < 400) || r.id)
		return r.id ? getPublicUrlHybrid(SITE, r.id, username, pass, signal) : 'OK';
	if (STATUS === 'publish' && (!r.id || r.code === 403)) {
		r = await submitClassic('draft');
		if ((r.code >= 300 && r.code < 400) || r.id)
			return r.id ? getPublicUrlHybrid(SITE, r.id, username, pass, signal) : 'OK (draft)';
	}
	throw new Error('Create failed (' + r.code + ')');
};
