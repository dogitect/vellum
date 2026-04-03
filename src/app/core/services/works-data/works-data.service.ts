// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface ProjectsConfig {
  readonly categories: ReadonlyArray<{
    readonly slug: string;
    readonly projects: readonly string[];
  }>;
}

export interface CategoryMetadata {
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly coverImage: string;
}

@Injectable({
  providedIn: 'root',
})
export class WorksDataService {
  private readonly http = inject(HttpClient);

  readonly contentBasePath = 'content/works';
  readonly imagesBasePath = 'images/works';

  private cachedConfig: ProjectsConfig | null = null;

  /** Loads and caches the projects.json configuration. */
  async loadProjectsConfig(): Promise<ProjectsConfig> {
    if (this.cachedConfig) return this.cachedConfig;

    try {
      this.cachedConfig = await firstValueFrom(
        this.http.get<ProjectsConfig>(`${this.contentBasePath}/projects.json`)
      );
      return this.cachedConfig;
    } catch (err) {
      console.warn(
        'WorksDataService: Failed to load projects.json, using empty config',
        err
      );
      this.cachedConfig = { categories: [] };
      return this.cachedConfig;
    }
  }

  /** Validates raw JSON as CategoryMetadata. Throws on invalid data. */
  validateCategoryMetadata(data: unknown): CategoryMetadata {
    const meta = data as Record<string, unknown>;
    if (
      !meta ||
      typeof meta !== 'object' ||
      typeof meta['title'] !== 'string' ||
      typeof meta['subtitle'] !== 'string' ||
      typeof meta['description'] !== 'string' ||
      typeof meta['coverImage'] !== 'string'
    ) {
      throw new Error(
        'Invalid category metadata: missing required string fields'
      );
    }
    return {
      title: meta['title'],
      subtitle: meta['subtitle'],
      description: meta['description'],
      coverImage: meta['coverImage'],
    };
  }
}
