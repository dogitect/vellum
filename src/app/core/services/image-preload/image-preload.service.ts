// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CloudflareImageService } from '../cloudflare-image/cloudflare-image.service';
import { environment } from '../../../../environments/environment';

export type PreloadStatus = 'pending' | 'loading' | 'loaded' | 'error';

export interface PreloadResult {
  readonly url: string;
  readonly status: PreloadStatus;
}

export interface ImagePreset {
  readonly width: number;
  readonly quality: number;
}

export const IMAGE_PRESETS = {
  placeholder: { width: 120, quality: 40 },
  highRes: { width: 2560, quality: 92 },
  medium: { width: 1280, quality: 85 },
} as const;

@Injectable({
  providedIn: 'root',
})
export class ImagePreloadService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cfImage = inject(CloudflareImageService);

  private readonly preloadedUrls = new Set<string>();

  private readonly loadingUrls = new Map<string, Promise<boolean>>();

  private readonly useCloudflare = environment.useCloudflareImages;

  /** Generates a Cloudflare-optimized URL, or returns the original path in dev. */
  getOptimizedUrl(imagePath: string, preset: ImagePreset): string {
    if (!this.useCloudflare) return imagePath;
    const r2Path = this.cfImage.toR2Path(imagePath);
    return this.cfImage.getUrl(r2Path, {
      width: preset.width,
      quality: preset.quality,
      format: 'auto',
      fit: 'scale-down',
    });
  }

  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /** Preloads a single image URL. Returns immediately if already loaded. */
  preload(url: string): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId) || !url) {
      return Promise.resolve(false);
    }

    if (this.preloadedUrls.has(url)) {
      return Promise.resolve(true);
    }

    const existing = this.loadingUrls.get(url);
    if (existing) {
      return existing;
    }

    const promise = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = (): void => {
        this.preloadedUrls.add(url);
        this.loadingUrls.delete(url);
        resolve(true);
      };
      img.onerror = (): void => {
        this.loadingUrls.delete(url);
        resolve(false);
      };
      img.src = url;
    });

    this.loadingUrls.set(url, promise);
    return promise;
  }

  /** Preloads images sequentially with a delay to avoid network congestion. */
  async preloadSequential(
    urls: string[],
    delayMs = 100
  ): Promise<PreloadResult[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return urls.map((url) => ({ url, status: 'pending' as const }));
    }

    const results: PreloadResult[] = [];

    for (const url of urls) {
      if (this.preloadedUrls.has(url)) {
        results.push({ url, status: 'loaded' });
        continue;
      }

      const success = await this.preload(url);
      results.push({ url, status: success ? 'loaded' : 'error' });

      if (delayMs > 0) {
        await this.delay(delayMs);
      }
    }

    return results;
  }

  /** Preloads images in parallel batches for throttled concurrency. */
  async preloadBatched(
    urls: string[],
    batchSize = 3
  ): Promise<PreloadResult[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return urls.map((url) => ({ url, status: 'pending' as const }));
    }

    const results: PreloadResult[] = [];

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          const success = await this.preload(url);
          return {
            url,
            status: (success ? 'loaded' : 'error') as PreloadStatus,
          };
        })
      );
      results.push(...batchResults);
    }

    return results;
  }

  generateUrls(paths: string[], preset: ImagePreset): string[] {
    return paths.map((path) => this.getOptimizedUrl(path, preset));
  }

  clearCache(): void {
    this.preloadedUrls.clear();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
