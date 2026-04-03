// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AboutSection, AboutSectionData } from '../models/about.models';

@Injectable({
  providedIn: 'root',
})
export class AboutService {
  private readonly http = inject(HttpClient);
  private readonly contentPath = 'content/about/index.json';

  private readonly _sections = signal<readonly AboutSection[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private dataLoaded = false;

  readonly sections = this._sections.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  /** Loads and caches section data from JSON. */
  async loadData(): Promise<void> {
    if (this.dataLoaded) return;

    this._loading.set(true);
    this._error.set(null);

    try {
      const data = await firstValueFrom(
        this.http.get<AboutSectionData>(this.contentPath)
      );
      const validated = this.validateSectionData(data);
      this._sections.set(validated);
      this.dataLoaded = true;
    } catch (err) {
      this._error.set('Failed to load about sections');
      console.error('AboutService: Failed to load data', err);
    } finally {
      this._loading.set(false);
    }
  }

  /** Validates section data from JSON. */
  private validateSectionData(data: unknown): readonly AboutSection[] {
    const parsed = data as AboutSectionData;

    if (!parsed || !Array.isArray(parsed.sections)) {
      throw new Error('Invalid section data: missing sections array');
    }

    return parsed.sections.map((item, index) => {
      if (
        typeof item.id !== 'number' ||
        typeof item.slug !== 'string' ||
        typeof item.title !== 'string' ||
        typeof item.statement !== 'string' ||
        typeof item.imagePath !== 'string'
      ) {
        throw new Error(
          `Invalid section at index ${index}: missing required fields`
        );
      }
      return item;
    });
  }
}
