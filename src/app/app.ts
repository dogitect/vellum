// Copyright 2025 Leon Xia. MIT License.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import {
  NavigationComponent,
  HeroBackgroundComponent,
  FooterComponent,
} from './layout';
import { SeoService } from './core/services';

/** Root application component with route-based conditional layout. */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    NavigationComponent,
    HeroBackgroundComponent,
    FooterComponent,
  ],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly seoService = inject(SeoService);

  // Gets the initial URL before Angular routing initializes.
  private getInitialUrl(): string {
    if (isPlatformBrowser(this.platformId)) {
      return this.document.location.pathname;
    }
    return this.router.url;
  }

  /** Current route URL as signal, initialized from browser location. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.getInitialUrl())
    )
  );

  /** Whether to show the hero background (only on home page). */
  protected readonly showHeroBackground = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '';
  });

  /** Whether to show the footer (hide on home page). */
  protected readonly showFooter = computed(
    () => (this.currentUrl() ?? '/') !== '/'
  );

  constructor() {
    effect(() => {
      const url = this.currentUrl();
      if (url === '/' || url === '') {
        this.seoService.setHomeSeo();
      }
    });
  }
}
