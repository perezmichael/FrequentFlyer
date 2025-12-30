import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;

if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(apiKey);
// Using user-specified "Nano Banana" model
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
