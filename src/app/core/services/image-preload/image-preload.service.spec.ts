// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImagePreloadService, IMAGE_PRESETS } from './image-preload.service';

// Creates a mock Image constructor. Trigger: 'load' | 'error' | 'none'.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockImageClass(trigger: 'load' | 'error' | 'none' = 'load') {
  return class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = '';
    get src(): string {
      return this._src;
    }
    set src(value: string) {
      this._src = value;
      if (trigger === 'load') {
        setTimeout(() => this.onload?.(), 0);
      } else if (trigger === 'error') {
        setTimeout(() => this.onerror?.(), 0);
      }
    }
  };
}

describe('ImagePreloadService', () => {
  let service: ImagePreloadService;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const OriginalImage = window.Image;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ImagePreloadService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(ImagePreloadService);
  });

  afterEach(() => {
    window.Image = OriginalImage;
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('IMAGE_PRESETS', () => {
    it('should define placeholder preset', () => {
      expect(IMAGE_PRESETS.placeholder).toEqual({ width: 120, quality: 40 });
    });

    it('should define highRes preset', () => {
      expect(IMAGE_PRESETS.highRes).toEqual({ width: 2560, quality: 92 });
    });

    it('should define medium preset', () => {
      expect(IMAGE_PRESETS.medium).toEqual({ width: 1280, quality: 85 });
    });
  });

  describe('getOptimizedUrl', () => {
    it('should return original path in development mode', () => {
      const result = service.getOptimizedUrl(
        'images/works/covers/boardroom.jpg',
        IMAGE_PRESETS.medium
      );
      expect(result).toBe('images/works/covers/boardroom.jpg');
    });

    it('should handle empty path', () => {
      const result = service.getOptimizedUrl('', IMAGE_PRESETS.medium);
      expect(result).toBe('');
    });
  });

  describe('isPreloaded', () => {
    it('should return false for unseen URL', () => {
      expect(service.isPreloaded('https://example.com/img.jpg')).toBe(false);
    });

    it('should return true after successful preload', async () => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;

      const url = 'https://example.com/test.jpg';
      await service.preload(url);
      expect(service.isPreloaded(url)).toBe(true);
    });
  });

  describe('preload', () => {
    it('should return false for empty URL', async () => {
      const result = await service.preload('');
      expect(result).toBe(false);
    });

    it('should return true immediately for already preloaded URL', async () => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;

      const url = 'https://example.com/cached.jpg';
      await service.preload(url);
      const result = await service.preload(url);
      expect(result).toBe(true);
    });

    it('should deduplicate in-flight requests', () => {
      window.Image = createMockImageClass('none') as unknown as typeof Image;

      const url = 'https://example.com/inflight.jpg';
      const promise1 = service.preload(url);
      const promise2 = service.preload(url);
      expect(promise1).toBe(promise2);
    });

    it('should resolve true on successful image load', async () => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;

      const result = await service.preload('https://example.com/success.jpg');
      expect(result).toBe(true);
    });

    it('should resolve false on image error', async () => {
      window.Image = createMockImageClass('error') as unknown as typeof Image;

      const result = await service.preload('https://example.com/error.jpg');
      expect(result).toBe(false);
    });
  });

  describe('preloadSequential', () => {
    beforeEach(() => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;
    });

    it('should return results for all URLs', async () => {
      const urls = ['https://example.com/a.jpg', 'https://example.com/b.jpg'];
      const results = await service.preloadSequential(urls, 0);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        url: 'https://example.com/a.jpg',
        status: 'loaded',
      });
      expect(results[1]).toEqual({
        url: 'https://example.com/b.jpg',
        status: 'loaded',
      });
    });

    it('should skip already-preloaded URLs', async () => {
      const url = 'https://example.com/cached.jpg';
      await service.preload(url);

      const results = await service.preloadSequential([url], 0);
      expect(results[0].status).toBe('loaded');
    });
  });

  describe('preloadBatched', () => {
    beforeEach(() => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;
    });

    it('should process all URLs in batches', async () => {
      const urls = [
        'https://example.com/1.jpg',
        'https://example.com/2.jpg',
        'https://example.com/3.jpg',
        'https://example.com/4.jpg',
        'https://example.com/5.jpg',
      ];
      const results = await service.preloadBatched(urls, 2);

      expect(results).toHaveLength(5);
      results.forEach((r) => expect(r.status).toBe('loaded'));
    });
  });

  describe('generateUrls', () => {
    it('should map paths through getOptimizedUrl', () => {
      const paths = ['images/a.jpg', 'images/b.jpg'];
      const result = service.generateUrls(paths, IMAGE_PRESETS.medium);

      // In dev mode, returns original paths
      expect(result).toEqual(['images/a.jpg', 'images/b.jpg']);
    });
  });

  describe('clearCache', () => {
    it('should clear preloaded URLs', async () => {
      window.Image = createMockImageClass('load') as unknown as typeof Image;

      const url = 'https://example.com/clear.jpg';
      await service.preload(url);
      expect(service.isPreloaded(url)).toBe(true);

      service.clearCache();
      expect(service.isPreloaded(url)).toBe(false);
    });
  });

  describe('server platform', () => {
    let serverService: ImagePreloadService;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ImagePreloadService,
          { provide: PLATFORM_ID, useValue: 'server' },
        ],
      });
      serverService = TestBed.inject(ImagePreloadService);
    });

    it('should return false for preload on server', async () => {
      const result = await serverService.preload('https://example.com/img.jpg');
      expect(result).toBe(false);
    });

    it('should return pending status for preloadSequential on server', async () => {
      const results = await serverService.preloadSequential([
        'https://example.com/a.jpg',
      ]);
      expect(results[0].status).toBe('pending');
    });

    it('should return pending status for preloadBatched on server', async () => {
      const results = await serverService.preloadBatched([
        'https://example.com/a.jpg',
      ]);
      expect(results[0].status).toBe('pending');
    });
  });
});
