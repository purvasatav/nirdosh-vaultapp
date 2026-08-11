import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import logger from './logger';
import { config } from '../config';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  gu: 'Gujarati',
  kn: 'Kannada',
};

const TranslationResponseSchema = z.object({
  translations: z.array(
    z.object({
      id: z.union([z.string(), z.number()]),
      text: z.string(),
    })
  ),
});

export interface TranslateItem {
  id: string | number;
  text: string;
}

const cache = new Map<string, string>();
const cacheKey = (lang: string, text: string) => `${lang}::${text}`;

export async function translateBatch(
  items: TranslateItem[],
  targetLang: string,
  timeoutMs = config.extraction?.geminiTimeoutMs ?? 45000
): Promise<Record<string | number, string>> {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  if (!SUPPORTED_LANGUAGES[targetLang]) {
    throw new Error(`Unsupported target language: ${targetLang}`);
  }

  const result: Record<string | number, string> = {};
  const uncached: TranslateItem[] = [];

  for (const item of items) {
    const hit = cache.get(cacheKey(targetLang, item.text));
    if (hit) {
      result[item.id] = hit;
    } else {
      uncached.push(item);
    }
  }

  if (uncached.length === 0) {
    return result;
  }

  if (targetLang === 'en') {
    for (const item of uncached) result[item.id] = item.text;
    return result;
  }

  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  });

  const prompt = `
You are a precise UI/content translation engine for a government-tech identity
verification platform used across India.

Translate each of the following text strings from English into
${SUPPORTED_LANGUAGES[targetLang]} (language code: ${targetLang}).

Rules:
- Preserve tone: formal, clear, citizen-facing.
- Do NOT translate proper nouns, document names in official use (e.g. "Aadhaar", "PAN"),
  or placeholders like {{name}} / %s -- keep them exactly as-is.
- Keep numbers, dates, and punctuation intact.
- Return ONLY valid JSON matching this shape, with one entry per input id:

{
  "translations": [
    { "id": "<same id as input>", "text": "<translated string>" }
  ]
}

Input strings:
${JSON.stringify(uncached, null, 2)}
`.trim();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await model.generateContent(prompt);
    const raw = response.response.text();
    const parsed = TranslationResponseSchema.parse(JSON.parse(raw));

    for (const t of parsed.translations) {
      result[t.id] = t.text;
      const original = uncached.find((u) => String(u.id) === String(t.id));
      if (original) {
        cache.set(cacheKey(targetLang, original.text), t.text);
      }
    }

    return result;
  } catch (error: any) {
    logger.error('[Gemini] Translation batch failed', {
      message: error?.message || String(error),
      targetLang,
      count: uncached.length,
    });
    for (const item of uncached) {
      if (!(item.id in result)) result[item.id] = item.text;
    }
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function translateText(text: string, targetLang: string): Promise<string> {
  const res = await translateBatch([{ id: 'single', text }], targetLang);
  return res['single'] ?? text;
}
