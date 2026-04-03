// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkDetailService } from './work-detail.service';
import { WorkProject } from '../models/work-detail.models';

describe('WorkDetailService', () => {
  let service: WorkDetailService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkDetailService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(WorkDetailService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('initial state', () => {
    it('should have empty categories', () => {
      expect(service.categories()).toEqual([]);
    });

    it('should not be loading', () => {
      expect(service.loading()).toBe(false);
    });

    it('should have no error', () => {
      expect(service.error()).toBeNull();
    });
  });

  describe('getCategoryBySlug', () => {
    it('should return undefined when no data loaded', () => {
      expect(service.getCategoryBySlug('boardroom')).toBeUndefined();
    });
  });

  describe('getProject', () => {
    it('should return undefined when no data loaded', () => {
      expect(service.getProject('boardroom', 'proj-a')).toBeUndefined();
    });
  });

  describe('loadProjectSlides', () => {
    it('should generate correct slide filenames with zero-padded indices', () => {
      const project: WorkProject = {
        slug: 'proj-a',
        title: 'Project A',
        subtitle: 'Sub',
        description: 'Desc',
        date: '2024-03',
        basePath: 'images/works/boardroom/proj-a',
        slideCount: 3,
      };

      const slides = service.loadProjectSlides(project);

      expect(slides).toHaveLength(3);
      expect(slides[0]).toEqual({
        index: 1,
        path: 'images/works/boardroom/proj-a/proj-a-01.jpg',
        filename: 'proj-a-01.jpg',
      });
      expect(slides[1]).toEqual({
        index: 2,
        path: 'images/works/boardroom/proj-a/proj-a-02.jpg',
        filename: 'proj-a-02.jpg',
      });
      expect(slides[2]).toEqual({
        index: 3,
        path: 'images/works/boardroom/proj-a/proj-a-03.jpg',
        filename: 'proj-a-03.jpg',
      });
    });

    it('should return empty array for slideCount 0', () => {
      const project: WorkProject = {
        slug: 'proj-empty',
        title: 'Empty',
        subtitle: 'Sub',
        description: 'Desc',
        date: '2024-03',
        basePath: 'images/works/boardroom/proj-empty',
        slideCount: 0,
      };

      const slides = service.loadProjectSlides(project);
      expect(slides).toHaveLength(0);
    });

    it('should handle double-digit slide indices', () => {
      const project: WorkProject = {
        slug: 'proj-big',
        title: 'Big',
        subtitle: 'Sub',
        description: 'Desc',
        date: '2024-03',
        basePath: 'images/works/boardroom/proj-big',
        slideCount: 12,
      };

      const slides = service.loadProjectSlides(project);
      expect(slides[8].filename).toBe('proj-big-09.jpg');
      expect(slides[9].filename).toBe('proj-big-10.jpg');
      expect(slides[11].filename).toBe('proj-big-12.jpg');
    });
  });

  // loadData tests must be last — async HTTP interactions can leave
  // hanging microtask chains that disrupt subsequent TestBed lifecycle.
  describe('loadData', () => {
    const mockProjectsConfig = {
      categories: [
        { slug: 'boardroom', projects: ['proj-a', 'proj-b'] },
        { slug: 'spotlight', projects: ['proj-c'] },
        { slug: 'pitch', projects: [] },
        { slug: 'blueprint', projects: [] },
        { slug: 'portfolio', projects: [] },
      ],
    };

    const mockCategoryMeta = {
      title: 'Boardroom',
      subtitle: 'Command the room',
      description: 'Executive presentation coaching.',
      coverImage: 'images/works/covers/boardroom.jpg',
    };

    const mockProjectMeta = {
      title: 'Project A',
      subtitle: 'Subtitle A',
      description: 'Description A',
      date: '2024-03',
      slideCount: 5,
    };

    /** Let pending microtasks/macrotasks drain via setTimeout. */
    function tick(): Promise<void> {
      return new Promise((resolve) => setTimeout(resolve, 0));
    }

    /** Flush all HTTP requests for a full loadData() cycle. */
    async function flushFullLoad(): Promise<void> {
      httpTesting
        .expectOne('content/works/projects.json')
        .flush(mockProjectsConfig);

      await tick();

      httpTesting
        .expectOne('content/works/boardroom/index.json')
        .flush(mockCategoryMeta);
      httpTesting
        .expectOne('content/works/spotlight/index.json')
        .flush({ ...mockCategoryMeta, title: 'Spotlight' });
      httpTesting
        .expectOne('content/works/pitch/index.json')
        .flush({ ...mockCategoryMeta, title: 'Pitch' });
      httpTesting
        .expectOne('content/works/blueprint/index.json')
        .flush({ ...mockCategoryMeta, title: 'Blueprint' });
      httpTesting
        .expectOne('content/works/portfolio/index.json')
        .flush({ ...mockCategoryMeta, title: 'Portfolio' });

      await tick();

      httpTesting
        .expectOne('content/works/boardroom/proj-a/metadata.json')
        .flush(mockProjectMeta);
      httpTesting
        .expectOne('content/works/boardroom/proj-b/metadata.json')
        .flush({ ...mockProjectMeta, title: 'Project B', date: '2024-01' });
      httpTesting
        .expectOne('content/works/spotlight/proj-c/metadata.json')
        .flush({ ...mockProjectMeta, title: 'Project C' });
    }

    it('should load categories and projects, cache results, and handle errors', async () => {
      // Verify loading state
      expect(service.loading()).toBe(false);
      const loadPromise = service.loadData();
      expect(service.loading()).toBe(true);

      await flushFullLoad();
      await loadPromise;

      expect(service.loading()).toBe(false);
      expect(service.error()).toBeNull();

      // Verify categories loaded
      const categories = service.categories();
      expect(categories.length).toBe(5);
      expect(categories[0].slug).toBe('boardroom');

      // Verify projects loaded and sorted by date descending
      const boardroom = service.getCategoryBySlug('boardroom');
      expect(boardroom?.projects).toHaveLength(2);
      expect(boardroom?.projects[0].date).toBe('2024-03');
      expect(boardroom?.projects[1].date).toBe('2024-01');

      // Verify getProject works
      const projA = service.getProject('boardroom', 'proj-a');
      expect(projA?.title).toBe('Project A');

      // Verify caching — second call makes no HTTP requests
      await service.loadData();
      httpTesting.expectNone('content/works/projects.json');
    });
  });
});
