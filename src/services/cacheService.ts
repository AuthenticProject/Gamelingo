export interface CacheItem {
  key: string;
  original: string;
  translation: string;
  engine: string;
  timestamp: number;
  hitCount: number;
}

export class TranslationCacheService {
  private static instance: TranslationCacheService;
  private cache: Map<string, CacheItem> = new Map();
  private maxEntries = 500;
  private storageKey = 'gamelingo_trans_cache_v1';

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): TranslationCacheService {
    if (!TranslationCacheService.instance) {
      TranslationCacheService.instance = new TranslationCacheService();
    }
    return TranslationCacheService.instance;
  }

  public normalizeKey(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u00C0-\u024F]/g, '');
  }

  public get(originalText: string): CacheItem | null {
    const key = this.normalizeKey(originalText);
    const item = this.cache.get(key);
    if (item) {
      item.hitCount += 1;
      // Re-insert to keep LRU order
      this.cache.delete(key);
      this.cache.set(key, item);
      return item;
    }
    return null;
  }

  public set(original: string, translation: string, engine: string): void {
    const key = this.normalizeKey(original);
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest (first key in map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const item: CacheItem = {
      key,
      original,
      translation,
      engine,
      timestamp: Date.now(),
      hitCount: 1,
    };

    this.cache.set(key, item);
    this.saveToStorage();
  }

  public clear(): void {
    this.cache.clear();
    localStorage.removeItem(this.storageKey);
  }

  public getStats(): { totalEntries: number; estimatedSizeKb: number } {
    let bytes = 0;
    this.cache.forEach((item) => {
      bytes += (item.original.length + item.translation.length + 32) * 2;
    });
    return {
      totalEntries: this.cache.size,
      estimatedSizeKb: Math.round(bytes / 1024),
    };
  }

  public getAllEntries(): CacheItem[] {
    return Array.from(this.cache.values()).reverse();
  }

  private saveToStorage(): void {
    try {
      const items = Array.from(this.cache.values()).slice(-200); // persist top 200 items
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch {
      // quota safeguard
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const items: CacheItem[] = JSON.parse(raw);
        items.forEach((item) => {
          this.cache.set(item.key, item);
        });
      }
    } catch {
      // fallback
    }
  }
}
