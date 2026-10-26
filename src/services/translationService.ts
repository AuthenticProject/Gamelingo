import { 
  TranslationEngineType, 
  OnlineProvider, 
  TranslationResult 
} from '../types';
import { ConfigService } from './configService';
import { TranslationCacheService } from './cacheService';
import { GlossaryService } from './glossaryService';

export class TranslationService {
  private static instance: TranslationService;
  private configService: ConfigService;
  private cacheService: TranslationCacheService;
  private glossaryService: GlossaryService;

  private constructor() {
    this.configService = ConfigService.getInstance();
    this.cacheService = TranslationCacheService.getInstance();
    this.glossaryService = GlossaryService.getInstance();
  }

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  public async translate(text: string): Promise<TranslationResult> {
    const startTime = performance.now();
    const cleanText = text.trim();

    if (!cleanText) {
      return {
        originalText: '',
        translatedText: '',
        engineUsed: 'online',
        latencyMs: 0,
        cached: false,
        timestamp: Date.now(),
      };
    }

    // 1. Check Local Cache
    const cached = this.cacheService.get(cleanText);
    if (cached) {
      return {
        originalText: cleanText,
        translatedText: cached.translation,
        engineUsed: cached.engine as TranslationEngineType,
        latencyMs: Math.round(performance.now() - startTime),
        cached: true,
        timestamp: Date.now(),
      };
    }

    const settings = this.configService.getSettings();
    const { maskedText, tokens } = this.glossaryService.applyPreTranslationTokens(cleanText);

    let translatedRaw = '';
    let engineUsed: TranslationEngineType = settings.engineType;
    let providerUsed: OnlineProvider | undefined = undefined;

    try {
      if (settings.engineType === 'online') {
        const res = await this.translateOnline(maskedText, settings.onlineProvider, settings.apiKeys);
        translatedRaw = res.text;
        providerUsed = res.provider;
      } else if (settings.engineType === 'offline') {
        translatedRaw = await this.translateOffline(maskedText);
      } else {
        // Hybrid Mode: Try offline first, fallback to online if allowed
        try {
          translatedRaw = await this.translateOffline(maskedText);
          engineUsed = 'offline';
        } catch (offlineErr) {
          if (settings.hybrid.fallbackToOnline) {
            const res = await this.translateOnline(maskedText, settings.onlineProvider, settings.apiKeys);
            translatedRaw = res.text;
            providerUsed = res.provider;
            engineUsed = 'online';
          } else {
            throw offlineErr;
          }
        }
      }
    } catch (err: any) {
      // In case of translation failure, return original with informative notice
      const errorMsg = err?.message || 'Translation unavailable';
      return {
        originalText: cleanText,
        translatedText: `[Error: ${errorMsg}]`,
        engineUsed,
        providerUsed,
        latencyMs: Math.round(performance.now() - startTime),
        cached: false,
        timestamp: Date.now(),
      };
    }

    // Restore glossary terminology
    const finalTranslation = this.glossaryService.applyPostTranslationTokens(translatedRaw, tokens);

    // Save to Cache
    this.cacheService.set(cleanText, finalTranslation, engineUsed);

    const latencyMs = Math.round(performance.now() - startTime);
    return {
      originalText: cleanText,
      translatedText: finalTranslation,
      engineUsed,
      providerUsed,
      latencyMs,
      cached: false,
      timestamp: Date.now(),
    };
  }

  private async translateOnline(
    text: string, 
    provider: OnlineProvider, 
    apiKeys: Record<string, string | undefined>
  ): Promise<{ text: string; provider: OnlineProvider }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      if (provider === 'deepl' && apiKeys.deepl) {
        const isFree = apiKeys.deepl.endsWith(':fx');
        const url = isFree 
          ? 'https://api-free.deepl.com/v2/translate' 
          : 'https://api.deepl.com/v2/translate';
        
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `DeepL-Auth-Key ${apiKeys.deepl}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            text,
            target_lang: 'ID',
            source_lang: 'EN',
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`DeepL API error: ${res.statusText}`);
        const data = await res.json();
        return { text: data.translations[0].text, provider: 'deepl' };
      }

      if (provider === 'libretranslate' && apiKeys.libretranslateUrl) {
        const res = await fetch(`${apiKeys.libretranslateUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: 'en',
            target: 'id',
            format: 'text',
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`LibreTranslate error: ${res.statusText}`);
        const data = await res.json();
        return { text: data.translatedText, provider: 'libretranslate' };
      }

      if (provider === 'openai' && apiKeys.openai) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKeys.openai}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Translate the following English gaming dialogue into natural, fluent Indonesian. Output only the translated text without extra explanation.',
              },
              { role: 'user', content: text },
            ],
            temperature: 0.3,
            max_tokens: 150,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
        const data = await res.json();
        return { text: data.choices[0].message.content.trim(), provider: 'openai' };
      }

      // Default: Public Google Translate Web Engine (Secure HTTPS client fetch)
      const encoded = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=id&dt=t&q=${encoded}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Google Translate response status: ${res.status}`);
      const data = await res.json();
      
      let translated = '';
      if (Array.isArray(data) && Array.isArray(data[0])) {
        for (const segment of data[0]) {
          if (segment && segment[0]) {
            translated += segment[0];
          }
        }
      }
      return { text: translated || text, provider: 'google' };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async translateOffline(text: string): Promise<string> {
    // Check if an offline model is active via local model manager
    const installedModel = localStorage.getItem('gamelingo_active_offline_model');
    if (!installedModel) {
      throw new Error('No offline translation model installed. Please download a model from Model Manager or enable Online Fallback.');
    }
    
    // Offline local linguistic engine bridge
    return `[Offline] ${text}`;
  }
}
