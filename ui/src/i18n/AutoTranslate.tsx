import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../store/language';
import api from '../api/client';

// text -> translated text, cached per language (memory + localStorage)
const memoryCache: Record<string, Record<string, string>> = {};
const STORAGE_PREFIX = 'nirdosh_t_';

function loadLangCache(lang: string): Record<string, string> {
  if (memoryCache[lang]) return memoryCache[lang];
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + lang);
    memoryCache[lang] = raw ? JSON.parse(raw) : {};
  } catch {
    memoryCache[lang] = {};
  }
  return memoryCache[lang];
}

function saveLangCache(lang: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + lang, JSON.stringify(memoryCache[lang] || {}));
  } catch {
    // storage full or unavailable, safe to ignore
  }
}

interface TranslateCtx {
  lang: string;
  getTranslated: (text: string) => string;
  subscribe: (cb: () => void) => () => void;
}

const Ctx = createContext<TranslateCtx | null>(null);

let idCounter = 0;
const nextId = () => `t${idCounter++}`;

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const lang = useLanguage((s) => s.lang);
  const queueRef = useRef<Map<string, string>>(new Map());
  const subscribersRef = useRef<Set<() => void>>(new Set());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  loadLangCache(lang);

  const flush = useCallback(async () => {
    const currentLang = lang;
    if (currentLang === 'en') {
      queueRef.current.clear();
      return;
    }
    const cache = loadLangCache(currentLang);
    const pending = Array.from(queueRef.current.entries()).filter(([text]) => !cache[text]);
    queueRef.current.clear();
    if (pending.length === 0) return;

    const CHUNK = 150;
    for (let i = 0; i < pending.length; i += CHUNK) {
      const chunk = pending.slice(i, i + CHUNK);
      try {
        const items = chunk.map(([text, id]) => ({ id, text }));
        const res = await api.post('/translate', { targetLang: currentLang, items });
        const translations: Record<string, string> = res.data?.translations || {};
        for (const [text, id] of chunk) {
          if (translations[id]) cache[text] = translations[id];
        }
        saveLangCache(currentLang);
      } catch (err) {
        console.warn('[AutoTranslate] batch failed, showing English for this batch', err);
      }
    }
    subscribersRef.current.forEach((cb) => cb());
  }, [lang]);

  const getTranslated = useCallback(
    (text: string): string => {
      if (!text || lang === 'en') return text;
      const cache = loadLangCache(lang);
      if (cache[text]) return cache[text];
      if (!queueRef.current.has(text)) {
        queueRef.current.set(text, nextId());
        if (flushTimer.current) clearTimeout(flushTimer.current);
        flushTimer.current = setTimeout(flush, 120);
      }
      return text;
    },
    [lang, flush]
  );

  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => subscribersRef.current.delete(cb);
  }, []);

  return <Ctx.Provider value={{ lang, getTranslated, subscribe }}>{children}</Ctx.Provider>;
}

export function useAutoT(text: string): string {
  const ctx = useContext(Ctx);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    return ctx.subscribe(() => forceTick((t) => t + 1));
  }, [ctx]);

  if (!ctx) return text;
  return ctx.getTranslated(text);
}

export function T({ children }: { children: string }) {
  return <>{useAutoT(children)}</>;
}