import { createWpPost } from './classic';
import { ARTICLE_EXAMPLE, ARTICLE_TITLE } from './constants';
import type { QueueMessage } from '../types';
import {
	createWpPostXmlrpc,
	isCredentialsError,
	isDateRelatedError,
	isXmlrpcBlockedError,
	isXmlrpcFaultForFallback,
	isXmlrpcHttpErrorForFallback,
	isXmlrpcPermissionError,
	isXmlrpcUnavailableError,
} from './xmlrpc';

const getBackdatedPublishDate = (): {
	xmlrpc: string;
	classic: { aa: string; mm: string; jj: string; hh: string; mn: string };
} => {
	const now = new Date();
	const backdatedDate = new Date(now);
	backdatedDate.setFullYear(now.getFullYear() - 1);
	const year = backdatedDate.getFullYear();
	const month = String(backdatedDate.getMonth() + 1).padStart(2, '0');
	const day = String(backdatedDate.getDate()).padStart(2, '0');
	const hours = String(backdatedDate.getHours()).padStart(2, '0');
	const minutes = String(backdatedDate.getMinutes()).padStart(2, '0');
	const seconds = String(backdatedDate.getSeconds()).padStart(2, '0');
	const xmlrpcDate = `${year}${month}${day}T${hours}:${minutes}:${seconds}`;
	return {
		xmlrpc: xmlrpcDate,
		classic: { aa: String(year), mm: month, jj: day, hh: hours, mn: minutes },
	};
};

export const cleanCred = (s: string): string =>
	String(s || '')
		.replace(/[\u200B-\u200D\uFEFF]/g, '')
		.replace(/\u00A0/g, ' ')
		.trim();

export type PublishResult = { url: string } | { error: string };

export const ATTEMPT_TIMEOUT_MS = 40_000;

export const attempt = async <T>(label: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> => {
	const timeoutMessage = `Timeout after ${ATTEMPT_TIMEOUT_MS / 1000}s (${label})`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
	try {
		return await fn(controller.signal);
	} catch (error) {
		if (controller.signal.aborted) throw new Error(timeoutMessage);
		throw error;
	} finally {
		clearTimeout(timeoutId);
	}
};

const tryWithoutDate = async (site: string, username: string, password: string): Promise<PublishResult> => {
	try {
		const url = await attempt('xmlrpc no-date', (signal) =>
			createWpPostXmlrpc(site, username, password, ARTICLE_TITLE, ARTICLE_EXAMPLE, undefined, undefined, signal)
		);
		if (url && !url.includes('but no ID found')) return { url };
		try {
			const url2 = await attempt('classic no-date', (signal) =>
				createWpPost(site, username, password, ARTICLE_TITLE, ARTICLE_EXAMPLE, 'publish', undefined, signal)
			);
			return { url: url2 };
		} catch (e4) {
			return { error: String(e4 instanceof Error ? e4.message : e4) };
		}
	} catch (e3) {
		const e3Msg = String(e3 instanceof Error ? e3.message : e3);
		if (
			isXmlrpcBlockedError(e3Msg) ||
			isXmlrpcPermissionError(e3Msg) ||
			isXmlrpcUnavailableError(e3Msg) ||
			isXmlrpcFaultForFallback(e3Msg) ||
			isXmlrpcHttpErrorForFallback(e3Msg)
		) {
			try {
				const url = await attempt('classic no-date fallback', (signal) =>
					createWpPost(site, username, password, ARTICLE_TITLE, ARTICLE_EXAMPLE, 'publish', undefined, signal)
				);
				return { url };
			} catch (e4) {
				return { error: String(e4 instanceof Error ? e4.message : e4) };
			}
		}
		return { error: e3Msg };
	}
};

export const publishWithAttempts = async (task: QueueMessage): Promise<PublishResult> => {
	const cleanUser = cleanCred(task.login);
	const cleanPass = cleanCred(task.password);
	const backdatedDate = getBackdatedPublishDate();

	// Step 1: try with backdated date
	try {
		let finalOut = await attempt('xmlrpc with-date', (signal) =>
			createWpPostXmlrpc(
				task.site,
				cleanUser,
				cleanPass,
				ARTICLE_TITLE,
				ARTICLE_EXAMPLE,
				undefined,
				backdatedDate.xmlrpc,
				signal
			)
		);
		if (finalOut && finalOut.includes('but no ID found')) {
			try {
				finalOut = await attempt('classic with-date', (signal) =>
					createWpPost(
						task.site,
						cleanUser,
						cleanPass,
						ARTICLE_TITLE,
						ARTICLE_EXAMPLE,
						'publish',
						backdatedDate.classic,
						signal
					)
				);
			} catch (e2) {
				const classicError = String(e2 instanceof Error ? e2.message : e2);
				if (isCredentialsError(classicError)) return { error: classicError };
				return tryWithoutDate(task.site, cleanUser, cleanPass);
			}
		}
		if (finalOut && !finalOut.startsWith('ERROR:')) return { url: finalOut };
	} catch (e) {
		const originalError = String(e instanceof Error ? e.message : e);
		if (isCredentialsError(originalError)) return { error: originalError };
		if (
			isDateRelatedError(originalError) ||
			isXmlrpcBlockedError(originalError) ||
			isXmlrpcPermissionError(originalError) ||
			isXmlrpcUnavailableError(originalError) ||
			isXmlrpcHttpErrorForFallback(originalError) ||
			isXmlrpcFaultForFallback(originalError)
		) {
			return tryWithoutDate(task.site, cleanUser, cleanPass);
		}
		return { error: originalError };
	}
	return { error: 'Unknown error' };
};
