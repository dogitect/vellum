// Copyright 2025 Leon Xia. MIT License.

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorksDataService } from './works-data.service';

describe('WorksDataService', () => {
  let service: WorksDataService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorksDataService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(WorksDataService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadProjectsConfig', () => {
    it('should load projects.json and return the config', async () => {
      const mockConfig = {
        categories: [
          { slug: 'boardroom', projects: ['annual-report'] },
          { slug: 'pitch', projects: ['seed-round'] },
        ],
      };

      const promise = service.loadProjectsConfig();
      const req = httpTesting.expectOne('content/works/projects.json');
      req.flush(mockConfig);
      const config = await promise;

      expect(config.categories).toHaveLength(2);
      expect(config.categories[0].slug).toBe('boardroom');
    });

    it('should return empty config when request fails', async () => {
      const promise = service.loadProjectsConfig();
      const req = httpTesting.expectOne('content/works/projects.json');
      req.error(new ProgressEvent('error'));
      const config = await promise;

      expect(config.categories).toHaveLength(0);
    });

    it('should cache the config and not make a second HTTP request', async () => {
      const mockConfig = { categories: [{ slug: 'boardroom', projects: [] }] };

      const p1 = service.loadProjectsConfig();
      httpTesting.expectOne('content/works/projects.json').flush(mockConfig);
      await p1;

      const p2 = service.loadProjectsConfig();
      httpTesting.expectNone('content/works/projects.json');
      const config2 = await p2;

      expect(config2.categories[0].slug).toBe('boardroom');
    });
  });

  describe('validateCategoryMetadata', () => {
    it('should return validated metadata for valid input', () => {
      const raw = {
        title: 'Boardroom',
        subtitle: 'Executive presentations',
        description: 'For the boardroom',
        coverImage: 'images/covers/boardroom.jpg',
      };

      const meta = service.validateCategoryMetadata(raw);

      expect(meta.title).toBe('Boardroom');
      expect(meta.coverImage).toBe('images/covers/boardroom.jpg');
    });

    it('should throw when a required field is missing', () => {
      const invalid = { title: 'Boardroom', subtitle: 'Sub' };
      expect(() => service.validateCategoryMetadata(invalid)).toThrow();
    });

    it('should throw when a field is not a string', () => {
      const invalid = {
        title: 42,
        subtitle: 'Sub',
        description: 'Desc',
        coverImage: 'img.jpg',
      };
      expect(() => service.validateCategoryMetadata(invalid)).toThrow();
    });
  });
});
