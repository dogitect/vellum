// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WorkItem } from '../models/works.models';
import { WorksDataService } from '../../../core/services';

@Injectable({
  providedIn: 'root',
})
export class WorksService {
  private readonly http = inject(HttpClient);
  private readonly worksData = inject(WorksDataService);

  private readonly _workItems = signal<readonly WorkItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private dataLoaded = false;

  readonly workItems = this._workItems.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Loads and caches work items from JSON. */
  async loadData(): Promise<void> {
    if (this.dataLoaded) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const config = await this.worksData.loadProjectsConfig();

      const items = await Promise.all(
        config.categories.map((category) =>
          this.loadCategoryAsWorkItem(category.slug)
        )
      );

      this._workItems.set(
        items.filter((item): item is WorkItem => item !== null)
      );
      this.dataLoaded = true;
    } catch (err) {
      this._error.set('Failed to load work items');
      console.error('WorksService: Failed to load data', err);
    } finally {
      this._loading.set(false);
    }
  }

  private async loadCategoryAsWorkItem(slug: string): Promise<WorkItem | null> {
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      console.warn(`WorksService: Invalid category slug rejected: "${slug}"`);
      return null;
    }
    try {
      const indexPath = `${this.worksData.contentBasePath}/${slug}/index.json`;
      const data = await firstValueFrom(this.http.get<unknown>(indexPath));
      const meta = this.worksData.validateCategoryMetadata(data);

      return {
        slug,
        title: meta.title,
        subtitle: meta.subtitle,
        description: meta.description,
        image: meta.coverImage,
      };
    } catch (err) {
      console.error(`WorksService: Failed to load category: ${slug}`, err);
      return null;
    }
  }
}
