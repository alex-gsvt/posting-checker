import { attempt } from './attempts';
import { performClassicLogin } from './classic';
import { isCredentialsError } from './xmlrpc';

export type AuthResult =
	| { status: 'valid' }
	| { status: 'invalid'; error: string }
	| { status: 'unavailable'; error: string };

const xmlEscape = (s: string): string =>
	String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const getSiteBase = (u: string): string => {
	if (!u) return '';
	let url = String(u).trim();
	url = url.replace(/\/wp-login\.php(\?.*)?$/i, '');
	url = url.replace(/\/+$/, '');
	return url;
};

export const checkXmlrpcAuth = async (
	site: string,
	username: string,
	pass: string,
	signal?: AbortSignal,
): Promise<AuthResult> => {
	const siteBase = getSiteBase(site);
	const endpoint = siteBase + '/xmlrpc.php';

	const xml =
		'<?xml version="1.0"?><methodCall><methodName>wp.getProfile</methodName><params>' +
		'<param><value><int>0</int></value></param>' +
		'<param><value><string>' + xmlEscape(username) + '</string></value></param>' +
		'<param><value><string>' + xmlEscape(pass) + '</string></value></param>' +
		'</params></methodCall>';

	const resp = await fetch(endpoint, {
		method: 'post',
		headers: { Accept: 'text/xml', 'Content-Type': 'text/xml', 'User-Agent': 'AppsScript-XMLRPC' },
		body: xml,
		redirect: 'follow',
		signal,
	});

	const body = await resp.text();

	if (resp.status !== 200) {
		throw new Error('XML-RPC HTTP ' + resp.status + ' at ' + endpoint);
	}

	const faultMatch = body.match(/<name>\s*faultString\s*<\/name>\s*<value>\s*(?:<string>)?([^<]+)(?:<\/string>)?\s*<\/value>/i);
	if (faultMatch) {
		const fault = faultMatch[1];
		if (isCredentialsError(fault)) return { status: 'invalid', error: fault };
		throw new Error('XML-RPC fault: ' + fault);
	}

	if (body.includes('<methodResponse>')) return { status: 'valid' };

	throw new Error('Unexpected XML-RPC response');
};

export const checkClassicAuth = async (
	site: string,
	username: string,
	pass: string,
	signal?: AbortSignal,
): Promise<AuthResult> => {
	try {
		await performClassicLogin(site, username, pass, signal);
		return { status: 'valid' };
	} catch (e) {
		const msg = String(e instanceof Error ? e.message : e);
		// performClassicLogin throws 'Auth failed' when cookies are not set = wrong credentials
		if (msg === 'Auth failed') return { status: 'invalid', error: 'Authentication failed' };
		throw e;
	}
};

export const checkAuthWithAttempts = async (
	site: string,
	username: string,
	pass: string,
): Promise<AuthResult> => {
	try {
		return await attempt('xmlrpc auth', (signal) =>
			checkXmlrpcAuth(site, username, pass, signal),
		);
	} catch (e) {
		const msg = String(e instanceof Error ? e.message : e);
		// Definitive credentials error from xmlrpc — no point trying classic
		if (isCredentialsError(msg)) return { status: 'invalid', error: msg };
		// All other xmlrpc errors (blocked, fault, network, timeout) → fallback to classic
		try {
			return await attempt('classic auth', (signal) =>
				checkClassicAuth(site, username, pass, signal),
			);
		} catch (e2) {
			const msg2 = String(e2 instanceof Error ? e2.message : e2);
			if (isCredentialsError(msg2)) return { status: 'invalid', error: msg2 };
			return { status: 'unavailable', error: msg2 };
		}
	}
};
