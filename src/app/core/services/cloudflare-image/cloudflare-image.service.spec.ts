// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CloudflareImageService } from './cloudflare-image.service';

describe('CloudflareImageService', () => {
  let service: CloudflareImageService;

  const CDN_BASE = 'https://assets.dogitect.io/projects/vellum';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CloudflareImageService],
    });
    service = TestBed.inject(CloudflareImageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUrl', () => {
    it('should generate URL with default options', () => {
      const url = service.getUrl('images/test.jpg');
      expect(url).toBe(
        `${CDN_BASE}/cdn-cgi/image/format=auto,quality=85,fit=scale-down/images/test.jpg`
      );
    });

    it('should include width when specified', () => {
      const url = service.getUrl('images/test.jpg', { width: 640 });
      expect(url).toContain('width=640');
    });

    it('should include height when specified', () => {
      const url = service.getUrl('images/test.jpg', { height: 480 });
      expect(url).toContain('height=480');
    });

    it('should override format when specified', () => {
      const url = service.getUrl('images/test.jpg', { format: 'webp' });
      expect(url).toContain('format=webp');
    });

    it('should include dpr when specified', () => {
      const url = service.getUrl('images/test.jpg', { dpr: 2 });
      expect(url).toContain('dpr=2');
    });

    it('should combine multiple options', () => {
      const url = service.getUrl('images/test.jpg', {
        width: 800,
        height: 600,
        format: 'avif',
        quality: 90,
        fit: 'cover',
      });
      expect(url).toContain('width=800');
      expect(url).toContain('height=600');
      expect(url).toContain('format=avif');
      expect(url).toContain('quality=90');
      expect(url).toContain('fit=cover');
    });
  });

  describe('getSrcset', () => {
    it('should generate srcset with responsive widths', () => {
      const srcset = service.getSrcset('images/test.jpg');
      expect(srcset).toContain('640w');
      expect(srcset).toContain('1280w');
      expect(srcset).toContain('1920w');
    });

    it('should include three responsive sizes', () => {
      const srcset = service.getSrcset('images/test.jpg');
      const entries = srcset.split(', ');
      expect(entries).toHaveLength(3);
    });

    it('should apply base options to all sizes', () => {
      const srcset = service.getSrcset('images/test.jpg', { format: 'webp' });
      expect(srcset).toContain('format=webp');
    });
  });

  describe('getSrcsetForFormat', () => {
    it('should generate AVIF srcset', () => {
      const srcset = service.getSrcsetForFormat('images/test.jpg', 'avif');
      expect(srcset).toContain('format=avif');
    });

    it('should generate WebP srcset', () => {
      const srcset = service.getSrcsetForFormat('images/test.jpg', 'webp');
      expect(srcset).toContain('format=webp');
    });
  });

  describe('getFallbackUrl', () => {
    it('should return largest size with WebP format', () => {
      const url = service.getFallbackUrl('images/test.jpg');
      expect(url).toContain('width=1920');
      expect(url).toContain('format=webp');
    });
  });

  describe('toR2Path', () => {
    it('should remove leading slash', () => {
      expect(service.toR2Path('/images/test.jpg')).toBe('images/test.jpg');
    });

    it('should preserve path without leading slash', () => {
      expect(service.toR2Path('images/test.jpg')).toBe('images/test.jpg');
    });
  });
});
