// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ProjectMetadata,
  WorkCategory,
  WorkProject,
  WorkSlide,
} from '../models/work-detail.models';
import { WorksDataService } from '../../../core/services';

@Injectable({
  providedIn: 'root',
})
export class WorkDetailService {
  private readonly http = inject(HttpClient);
  private readonly worksData = inject(WorksDataService);

  private readonly _categories = signal<readonly WorkCategory[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private dataLoaded = false;

  readonly categories = this._categories.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Loads and caches all work data from JSON. */
  async loadData(): Promise<void> {
    if (this.dataLoaded) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const config = await this.worksData.loadProjectsConfig();
      const categorySlugs = config.categories.map((c) => c.slug);

      const categories = await Promise.all(
        categorySlugs.map((slug) => this.loadCategory(slug, config))
      );
      this._categories.set(
        categories.filter((c): c is WorkCategory => c !== null)
      );
      this.dataLoaded = true;
    } catch (err) {
      this._error.set('Failed to load work data');
      console.error('WorkDetailService: Failed to load data', err);
    } finally {
      this._loading.set(false);
    }
  }

  /** Validates project metadata from JSON. */
  private validateProjectMetadata(data: unknown): ProjectMetadata {
    const meta = data as Record<string, unknown>;
    if (
      !meta ||
      typeof meta !== 'object' ||
      typeof meta['title'] !== 'string' ||
      typeof meta['subtitle'] !== 'string' ||
      typeof meta['description'] !== 'string' ||
      typeof meta['date'] !== 'string'
    ) {
      throw new Error(
        'Invalid project metadata: missing required string fields'
      );
    }
    const slideCount =
      typeof meta['slideCount'] === 'number' ? meta['slideCount'] : undefined;
    return {
      title: meta['title'],
      subtitle: meta['subtitle'],
      description: meta['description'],
      date: meta['date'],
      slideCount,
    };
  }

  private async loadCategory(
    categorySlug: string,
    config: import('../../../core/services').ProjectsConfig
  ): Promise<WorkCategory | null> {
    if (!/^[a-zA-Z0-9_-]+$/.test(categorySlug)) {
      console.warn(
        `WorkDetailService: Invalid category slug rejected: "${categorySlug}"`
      );
      return null;
    }
    try {
      const indexPath = `${this.worksData.contentBasePath}/${categorySlug}/index.json`;
      const categoryMeta = await firstValueFrom(
        this.http.get<unknown>(indexPath)
      );
      const validMeta = this.worksData.validateCategoryMetadata(categoryMeta);

      const projectSlugs = this.discoverProjects(categorySlug, config);
      const projects = await Promise.all(
        projectSlugs.map((slug) => this.loadProject(categorySlug, slug))
      );

      return {
        slug: categorySlug,
        title: validMeta.title,
        subtitle: validMeta.subtitle,
        description: validMeta.description,
        coverImage: validMeta.coverImage,
        projects: projects
          .filter((p): p is WorkProject => p !== null)
          .sort((a, b) => b.date.localeCompare(a.date)),
      };
    } catch (err) {
      console.error(`Failed to load category: ${categorySlug}`, err);
      return null;
    }
  }

  private discoverProjects(
    categorySlug: string,
    config: import('../../../core/services').ProjectsConfig
  ): string[] {
    const categoryConfig = config.categories.find(
      (c) => c.slug === categorySlug
    );
    return categoryConfig ? [...categoryConfig.projects] : [];
  }

  private async loadProject(
    categorySlug: string,
    projectSlug: string
  ): Promise<WorkProject | null> {
    try {
      const metadataPath = `${this.worksData.contentBasePath}/${categorySlug}/${projectSlug}/metadata.json`;
      const meta = await firstValueFrom(
        this.http.get<ProjectMetadata>(metadataPath)
      );
      this.validateProjectMetadata(meta);

      return {
        slug: projectSlug,
        title: meta.title,
        subtitle: meta.subtitle,
        description: meta.description,
        date: meta.date,
        basePath: `${this.worksData.imagesBasePath}/${categorySlug}/${projectSlug}`,
        slideCount: meta.slideCount ?? 0,
      };
    } catch (err) {
      console.error(
        `Failed to load project: ${categorySlug}/${projectSlug}`,
        err
      );
      return null;
    }
  }

  getCategoryBySlug(slug: string): WorkCategory | undefined {
    return this._categories().find((c) => c.slug === slug);
  }

  getProject(
    categorySlug: string,
    projectSlug: string
  ): WorkProject | undefined {
    const category = this.getCategoryBySlug(categorySlug);
    return category?.projects.find((p) => p.slug === projectSlug);
  }

  /** Generates slide paths for a project based on slideCount. */
  loadProjectSlides(project: WorkProject): readonly WorkSlide[] {
    const slides: WorkSlide[] = [];
    const imagesPath = project.basePath;
    const projectName = project.slug;
    const count = project.slideCount;

    for (let i = 1; i <= count; i++) {
      const paddedIndex = String(i).padStart(2, '0');
      const filename = `${projectName}-${paddedIndex}.jpg`;
      const path = `${imagesPath}/${filename}`;
      slides.push({ index: i, path, filename });
    }

    return slides;
  }
}
