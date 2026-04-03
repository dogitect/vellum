// Copyright 2025 Leon Xia. MIT License.

import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { SeoService } from '../../core/services';

/** 404 page with noindex SEO. */
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly seoService = inject(SeoService);

  protected readonly errorCode = signal('404');

  protected readonly heading = signal('Page Not Found');

  constructor() {
    this.seoService.setNotFoundSeo();
  }
}
