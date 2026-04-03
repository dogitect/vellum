// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let meta: Meta;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SeoService, { provide: PLATFORM_ID, useValue: 'browser' }],
    });

    service = TestBed.inject(SeoService);
    meta = TestBed.inject(Meta);
    title = TestBed.inject(Title);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updatePageSeo', () => {
    it('should update title for non-homepage', () => {
      const spy = vi.spyOn(title, 'setTitle');

      service.updatePageSeo({
        title: 'Works',
        description: 'Test description',
        canonicalPath: '/works',
      });

      expect(spy).toHaveBeenCalledWith('Works | Vellum');
    });

    it('should not append suffix for homepage', () => {
      const spy = vi.spyOn(title, 'setTitle');

      service.updatePageSeo({
        title: 'Vellum by Dogitect — Crafting clarity on stage',
        description: 'Test description',
        canonicalPath: '/',
        isHomepage: true,
      });

      expect(spy).toHaveBeenCalledWith(
        'Vellum by Dogitect — Crafting clarity on stage'
      );
    });

    it('should update meta description', () => {
      const spy = vi.spyOn(meta, 'updateTag');

      service.updatePageSeo({
        title: 'Works',
        description: 'Custom description',
        canonicalPath: '/works',
      });

      expect(spy).toHaveBeenCalledWith({
        name: 'description',
        content: 'Custom description',
      });
    });

    it('should update Open Graph tags', () => {
      const spy = vi.spyOn(meta, 'updateTag');

      service.updatePageSeo({
        title: 'Works',
        description: 'Test description',
        canonicalPath: '/works',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:title' })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:description' })
      );
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ property: 'og:url' })
      );
    });
  });

  describe('getWorkCategorySeo', () => {
    it('should return category data for valid slug', () => {
      const result = service.getWorkCategorySeo('boardroom');

      expect(result).toBeTruthy();
      expect(result?.title).toBe('Boardroom');
      expect(result?.slug).toBe('boardroom');
    });

    it('should return undefined for invalid slug', () => {
      const result = service.getWorkCategorySeo('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should have all five work categories', () => {
      const slugs = [
        'boardroom',
        'spotlight',
        'pitch',
        'blueprint',
        'portfolio',
      ];

      slugs.forEach((slug) => {
        const result = service.getWorkCategorySeo(slug);
        expect(result).toBeTruthy();
      });
    });
  });

  describe('getWorkOgImage', () => {
    it('should generate correct CDN URL', () => {
      const result = service.getWorkOgImage(
        'images/works/covers/boardroom.jpg'
      );

      expect(result).toContain('assets.dogitect.io');
      expect(result).toContain('width=1200');
      expect(result).toContain('images/works/covers/boardroom.jpg');
    });
  });

  describe('page-specific SEO methods', () => {
    it('should set Works SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setWorksSeo();

      expect(titleSpy).toHaveBeenCalledWith('Services | Vellum');
    });

    it('should set About SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setAboutSeo();

      expect(titleSpy).toHaveBeenCalledWith('About | Vellum');
    });

    it('should set Contact SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setContactSeo();

      expect(titleSpy).toHaveBeenCalledWith('Contact | Vellum');
    });

    it('should set Home SEO correctly', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setHomeSeo();

      expect(titleSpy).toHaveBeenCalledWith(
        'Vellum by Dogitect — Crafting clarity on stage'
      );
    });

    it('should set Work Detail SEO with category data', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setWorkDetailSeo('boardroom');

      expect(titleSpy).toHaveBeenCalledWith('Boardroom | Vellum');
    });

    it('should set Work Detail SEO with custom data', () => {
      const titleSpy = vi.spyOn(title, 'setTitle');

      service.setWorkDetailSeo('custom', {
        title: 'Custom Title',
        description: 'Custom description',
      });

      expect(titleSpy).toHaveBeenCalledWith('Custom Title | Vellum');
    });
  });
});
