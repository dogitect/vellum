// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AboutService } from './about.service';

describe('AboutService', () => {
  let service: AboutService;
  let httpTesting: HttpTestingController;

  const mockSectionData = {
    sections: [
      {
        id: 1,
        slug: 'craft',
        title: 'Craft',
        statement: 'We believe in craft.',
        imagePath: 'images/about/about-01.png',
      },
      {
        id: 2,
        slug: 'clarity',
        title: 'Clarity',
        statement: 'Clarity drives impact.',
        imagePath: 'images/about/about-02.png',
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AboutService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AboutService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have empty sections', () => {
      expect(service.sections()).toEqual([]);
    });

    it('should not be loading', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have no error', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('loadData', () => {
    it('should set loading to true during load', () => {
      service.loadData();
      expect(service.loading()).toBe(true);

      httpTesting.expectOne('content/about/index.json').flush(mockSectionData);
    });

    it('should populate sections on success', async () => {
      const loadPromise = service.loadData();

      httpTesting.expectOne('content/about/index.json').flush(mockSectionData);

      await loadPromise;

      expect(service.sections()).toHaveLength(2);
      expect(service.sections()[0].slug).toBe('craft');
      expect(service.sections()[1].title).toBe('Clarity');
      expect(service.loading()).toBe(false);
    });

    it('should cache data and skip second call', async () => {
      const loadPromise = service.loadData();

      httpTesting.expectOne('content/about/index.json').flush(mockSectionData);

      await loadPromise;

      // Second call should not make HTTP request
      await service.loadData();
      httpTesting.expectNone('content/about/index.json');
    });

    it('should set error on HTTP failure', async () => {
      const loadPromise = service.loadData();

      httpTesting
        .expectOne('content/about/index.json')
        .error(new ProgressEvent('error'));

      await loadPromise;

      expect(service.error()).toBe('Failed to load about sections');
      expect(service.loading()).toBe(false);
      expect(service.sections()).toEqual([]);
    });

    it('should set error for missing sections array', async () => {
      const loadPromise = service.loadData();

      httpTesting
        .expectOne('content/about/index.json')
        .flush({ notSections: [] });

      await loadPromise;

      expect(service.error()).toBe('Failed to load about sections');
    });

    it('should set error for section with missing required fields', async () => {
      const loadPromise = service.loadData();

      httpTesting.expectOne('content/about/index.json').flush({
        sections: [{ id: 'not-a-number', slug: 'test' }],
      });

      await loadPromise;

      expect(service.error()).toBe('Failed to load about sections');
    });
  });
});
