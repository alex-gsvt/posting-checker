import { getPublicUrlHybrid } from './url';

const xmlEscape = (s: string): string =>
	String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const parseXmlrpcFault = (xml: string): string | null => {
	const m = xml.match(/<name>\s*faultString\s*<\/name>\s*<value>\s*(?:<string>)?([^<]+)(?:<\/string>)?\s*<\/value>/i);
	return m ? m[1] : null;
};

const parseXmlrpcPostId = (xml: string): string | null => {
	let m = xml.match(/<methodResponse>[\s\S]*?<value>[\s\S]*?<int>\s*(\d+)\s*<\/int>/i);
	if (m?.[1]) return m[1];
	m = xml.match(/<methodResponse>[\s\S]*?<value>[\s\S]*?<string>\s*(\d+)\s*<\/string>/i);
	if (m?.[1]) return m[1];
	m = xml.match(/<name>\s*postid\s*<\/name>\s*<value>\s*(?:<int>|<string>)\s*(\d+)\s*(?:<\/int>|<\/string>)\s*<\/value>/i);
	return m?.[1] ?? null;
};

const isHtml = (text: string): boolean => {
	const t = (text || '').trim();
	return /^<!doctype html/i.test(t) || /^<html[\s>]/i.test(t);
};

export const isCredentialsError = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	return (
		s.includes('incorrect username') ||
		s.includes('incorrect password') ||
		s.includes('authentication failed') ||
		s.includes('invalid credentials') ||
		s.includes('wrong password') ||
		s.includes('wrong username') ||
		s.includes('xml-rpc fault: incorrect username or password')
	);
};

export const isXmlrpcBlockedError = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	const mentionsXmlrpc = s.includes('xmlrpc') || s.includes('xml-rpc');
	const codeHit =
		s.includes('http 403') ||
		s.includes('http 405') ||
		s.includes(' status 403') ||
		s.includes(' status 405');
	const phraseHit =
		s.includes('forbidden') || s.includes('method not allowed') || s.includes('not allowed');
	return mentionsXmlrpc && (codeHit || phraseHit);
};

export const isXmlrpcPermissionError = (msg: string): boolean =>
	String(msg || '').toLowerCase().includes('not allowed to publish posts');

export const isXmlrpcUnavailableError = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	if (
		s.includes('ssl') ||
		s.includes('certificate') ||
		s.includes('tls') ||
		s.includes('ssl error') ||
		s.includes('certificate error') ||
		s.includes('certificate validation') ||
		s.includes('certificate verification') ||
		s.includes('invalid certificate') ||
		s.includes('self-signed certificate') ||
		s.includes('certificate chain') ||
		s.includes('handshake failure') ||
		s.includes('ssl handshake')
	)
		return true;
	if (
		s.includes('address unavailable') ||
		s.includes('unable to connect') ||
		s.includes('connection refused') ||
		s.includes('connection timeout') ||
		s.includes('connection error') ||
		s.includes('connection failed') ||
		s.includes('failed to connect') ||
		s.includes('timeout') ||
		s.includes('network error') ||
		s.includes('dns') ||
		s.includes('host not found')
	)
		return true;
	const isCreds = isCredentialsError(msg);
	if ((s.includes('http') || s.includes('status')) && !isCreds) {
		if (!s.includes('http 200') && !s.includes('status 200'))
			if (s.includes('http 0') || s.includes('status 0') || s.includes('http -1')) return true;
	}
	return false;
};

export const isXmlrpcHttpErrorForFallback = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	if (!s.includes('xmlrpc') && !s.includes('xml-rpc')) return false;
	const codes = ['http 404', 'status 404', 'http 406', 'status 406', 'http 422', 'status 422', 'http 202', 'status 202', 'http 466', 'status 466', 'http 500', 'status 500', 'http 502', 'status 502', 'http 503', 'status 503'];
	return codes.some((code) => s.includes(code));
};

export const isXmlrpcFaultForFallback = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	if ((!s.includes('xmlrpc') && !s.includes('xml-rpc')) || !s.includes('fault')) return false;
	const phrases = ['method does not exist', 'does not exist', 'server error', 'requested method'];
	return phrases.some((phrase) => s.includes(phrase));
};

export const isDateRelatedError = (msg: string): boolean => {
	const s = String(msg || '').toLowerCase();
	if (isCredentialsError(msg)) return false;
	const phrases = [
		'invalid date',
		'invalid post date',
		'post date',
		'date is not allowed',
		'cannot publish with date',
		'backdating',
		'back date',
		'publish date',
		'date format',
		'date error',
		'forbidden date',
		'not allowed to publish with date',
	];
	return phrases.some((phrase) => s.includes(phrase));
};

const getSiteBase = (u: string): string => {
	if (!u) return '';
	let url = String(u).trim();
	url = url.replace(/\/wp-login\.php(\?.*)?$/i, '');
	url = url.replace(/\/+$/, '');
	return url;
};

const createWpPostXmlrpcWithBlogId = async (
	siteBase: string,
	username: string,
	pass: string,
	title: string,
	content: string,
	postType: string,
	blogId: number,
	postDate?: string,
	signal?: AbortSignal
): Promise<string> => {
	const endpoint = siteBase + '/xmlrpc.php';
	let bodyStruct =
		'<member><name>post_title</name><value><string>' +
		xmlEscape(title) +
		'</string></value></member><member><name>post_content</name><value><string><![CDATA[' +
		(content || '') +
		']]></string></value></member><member><name>post_status</name><value><string>publish</string></value></member><member><name>post_type</name><value><string>' +
		xmlEscape(postType || 'post') +
		'</string></value></member>';
	if (postDate)
		bodyStruct +=
			'<member><name>post_date</name><value><dateTime.iso8601>' +
			xmlEscape(postDate) +
			'</dateTime.iso8601></value></member>';
	const xml =
		'<?xml version="1.0"?><methodCall><methodName>wp.newPost</methodName><params><param><value><int>' +
		blogId +
		'</int></value></param><param><value><string>' +
		xmlEscape(username) +
		'</string></value></param><param><value><string>' +
		xmlEscape(pass) +
		'</string></value></param><param><value><struct>' +
		bodyStruct +
		'</struct></value></param></params></methodCall>';

	const resp = await fetch(endpoint, {
		method: 'post',
		headers: { Accept: 'text/xml', 'Content-Type': 'text/xml', 'User-Agent': 'AppsScript-XMLRPC' },
		body: xml,
		redirect: 'follow',
		signal,
	});
	const code = resp.status;
	const body = await resp.text();

	if (code === 0 || (code < 100 && body && (body.toLowerCase().includes('address unavailable') || body.toLowerCase().includes('unable to connect')))) {
		throw new Error('Address unavailable: ' + endpoint);
	}
	if (body && typeof body === 'string') {
		const bodyLower = body.toLowerCase();
		if (
			bodyLower.includes('address unavailable') ||
			bodyLower.includes('unable to connect') ||
			bodyLower.includes('connection refused') ||
			bodyLower.includes('connection timeout')
		)
			throw new Error('Address unavailable: ' + endpoint);
	}
	if (code !== 200) throw new Error('XML-RPC HTTP ' + code + ' at ' + endpoint + ' (blog_id=' + blogId + ')');
	const fault = parseXmlrpcFault(body);
	if (fault) throw new Error('XML-RPC fault (blog_id=' + blogId + '): ' + fault);
	const postId = parseXmlrpcPostId(body);
	if (postId) return getPublicUrlHybrid(siteBase, postId, username, pass, signal);
	return 'SUCCESS (XMLRPC, blog_id=' + blogId + '), but no ID found. Response head: ' + body.substring(0, 300);
};

export const createWpPostXmlrpc = async (
	rawUrl: string,
	username: string,
	pass: string,
	title: string,
	content: string,
	postType: string | undefined,
	postDate?: string,
	signal?: AbortSignal
): Promise<string> => {
	const siteBase = getSiteBase(rawUrl);
	const xmlrpcEndpoint = siteBase + '/xmlrpc.php';
	let bodyStruct =
		'<member><name>post_title</name><value><string>' +
		xmlEscape(title) +
		'</string></value></member><member><name>post_content</name><value><string><![CDATA[' +
		(content || '') +
		']]></string></value></member><member><name>post_status</name><value><string>publish</string></value></member><member><name>post_type</name><value><string>' +
		xmlEscape(postType || 'post') +
		'</string></value></member>';
	if (postDate)
		bodyStruct +=
			'<member><name>post_date</name><value><dateTime.iso8601>' +
			xmlEscape(postDate) +
			'</dateTime.iso8601></value></member>';
	const xml =
		'<?xml version="1.0"?><methodCall><methodName>wp.newPost</methodName><params><param><value><int>0</int></value></param><param><value><string>' +
		xmlEscape(username) +
		'</string></value></param><param><value><string>' +
		xmlEscape(pass) +
		'</string></value></param><param><value><struct>' +
		bodyStruct +
		'</struct></value></param></params></methodCall>';

	const resp = await fetch(xmlrpcEndpoint, {
		method: 'post',
		headers: { Accept: 'text/xml', 'Content-Type': 'text/xml', 'User-Agent': 'AppsScript-XMLRPC' },
		body: xml,
		redirect: 'follow',
		signal,
	});
	const code = resp.status;
	const body = await resp.text();

	if (body && typeof body === 'string') {
		const bodyLower = body.toLowerCase();
		if (
			bodyLower.includes('address unavailable') ||
			bodyLower.includes('unable to connect') ||
			bodyLower.includes('connection refused') ||
			bodyLower.includes('connection timeout')
		)
			throw new Error('Address unavailable: ' + xmlrpcEndpoint);
	}
	if (code === 200 && isHtml(body))
		throw new Error('XML-RPC відповів HTML, перевір endpoint: ' + xmlrpcEndpoint);
	if (code === 200) {
		const fault = parseXmlrpcFault(body);
		if (fault) {
			if (/blog_id|blogid/i.test(fault))
				return createWpPostXmlrpcWithBlogId(
					siteBase,
					username,
					pass,
					title,
					content,
					postType || 'post',
					1,
					postDate,
					signal
				);
			throw new Error('XML-RPC fault: ' + fault);
		}
		const postId = parseXmlrpcPostId(body);
		if (postId) return getPublicUrlHybrid(siteBase, postId, username, pass, signal);
		return 'SUCCESS (XMLRPC), but no ID found. Response head: ' + body.substring(0, 300);
	}
	if (code === 403 || code === 405)
		return createWpPostXmlrpcWithBlogId(
			siteBase,
			username,
			pass,
			title,
			content,
			postType || 'post',
			1,
			postDate,
			signal
		);
	throw new Error('XML-RPC HTTP ' + code + ' at ' + xmlrpcEndpoint);
};
