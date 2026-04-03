// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorksService } from './works.service';

describe('WorksService', () => {
  let service: WorksService;
  let httpTesting: HttpTestingController;

  const mockProjectsConfig = {
    categories: [
      { slug: 'boardroom', projects: ['proj-a'] },
      { slug: 'spotlight', projects: [] },
    ],
  };

  const mockCategoryMeta = (title: string): Record<string, string> => ({
    title,
    subtitle: `${title} subtitle`,
    description: `${title} description`,
    coverImage: `images/works/covers/${title.toLowerCase()}.jpg`,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorksService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(WorksService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have empty workItems', () => {
      expect(service.workItems()).toEqual([]);
    });

    it('should not be loading', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have no error', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('loadData', () => {
    /** Let pending microtasks drain. */
    function tick(): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }

    it('should load work items, cache results, and handle errors', async () => {
      // Loading state
      expect(service.loading()).toBe(false);
      const loadPromise = service.loadData();
      expect(service.loading()).toBe(true);

      // Flush projects.json
      httpTesting
        .expectOne('content/works/projects.json')
        .flush(mockProjectsConfig);

      await tick();

      // Flush category index.json requests
      httpTesting
        .expectOne('content/works/boardroom/index.json')
        .flush(mockCategoryMeta('Boardroom'));
      httpTesting
        .expectOne('content/works/spotlight/index.json')
        .flush(mockCategoryMeta('Spotlight'));

      await loadPromise;

      // Verify loaded
      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();
      expect(service.workItems()).toHaveLength(2);
      expect(service.workItems()[0].slug).toBe('boardroom');
      expect(service.workItems()[0].title).toBe('Boardroom');
      expect(service.workItems()[0].image).toBe(
        'images/works/covers/boardroom.jpg'
      );
      expect(service.workItems()[1].slug).toBe('spotlight');

      // Caching — second call makes no HTTP requests
      await service.loadData();
      httpTesting.expectNone('content/works/projects.json');
    });
  });
});
