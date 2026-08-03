import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * The client is built on first use, not at import time.
 *
 * This module used to read GEMINI_API_KEY and throw at module scope. Because
 * `app/actions.ts` imports it, any environment without that key — a fresh
 * clone, CI, a cloud Claude session — failed to build before rendering a
 * single page, even though the key is only needed by two AI-assisted actions.
 *
 * Failing at the call site instead means the app builds and runs without a
 * Gemini key, and only the features that genuinely need one error — with a
 * message naming the missing variable.
 */
let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
    if (client) return client;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error(
            'Missing GEMINI_API_KEY. Set it in .env.local (see .env.example) to use the AI-assisted features.',
        );
    }

    client = new GoogleGenerativeAI(apiKey);
    return client;
}

/**
 * Same shape as the old export, so callers keep using
 * `genAI.getGenerativeModel({ ... })` unchanged — the key is only read once a
 * model is actually requested.
 */
export const genAI = {
    getGenerativeModel: (
        ...args: Parameters<GoogleGenerativeAI['getGenerativeModel']>
    ) => getClient().getGenerativeModel(...args),
};
