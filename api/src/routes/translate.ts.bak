import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import {
  translateBatch,
  SUPPORTED_LANGUAGES,
} from '../services/translationService';
import logger from '../services/logger';

const router = Router();

const TranslateRequestSchema = z.object({
  targetLang: z.string(),
  items: z
    .array(
      z.object({
        id: z.union([z.string(), z.number()]),
        text: z.string().min(1),
      })
    )
    .min(1)
    .max(200),
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = TranslateRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { targetLang, items } = parsed.data;

  if (!SUPPORTED_LANGUAGES[targetLang]) {
    return res.status(400).json({
      error: `Unsupported language "${targetLang}"`,
      supported: Object.keys(SUPPORTED_LANGUAGES),
    });
  }

  try {
    const translations = await translateBatch(items, targetLang);
    return res.json({ targetLang, translations });
  } catch (error: any) {
    logger.error('[Translate] Request failed', { message: error?.message });
    return res.status(500).json({ error: 'Translation failed' });
  }
});

router.get('/languages', (_req, res: Response) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

export default router;
