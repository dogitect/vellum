// Copyright 2025 Leon Xia. MIT License.

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { OptimizedImageComponent } from '../../shared';
import {
  ImagePreloadService,
  IMAGE_PRESETS,
  SeoService,
} from '../../core/services';
import { scrollBehavior } from '../../core/utils/motion';
import {
  CardStyle,
  computeHiddenCardStyles,
} from '../../core/utils/card-animation';
import { WorksService } from './services/works.service';

/** Works page with full-screen scroll-driven card animation. */
@Component({
  selector: 'app-works',
  templateUrl: './works.html',
  styleUrl: './works.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, OptimizedImageComponent],
})
export class WorksComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly seoService = inject(SeoService);
  private readonly preloadService = inject(ImagePreloadService);
  private readonly worksService = inject(WorksService);

  protected readonly workItems = this.worksService.workItems;

  /** Current active solution index (for indicator dots). */
  protected readonly activeIndex = signal(0);

  /** Card animation index (for card transforms). */
  protected readonly cardAnimationIndex = signal(0);

  /** Scroll progress for current card (0–1). */
  protected readonly scrollProgress = signal(0);

  protected readonly totalWorks = computed(() => this.workItems().length);

  protected readonly cardStyles = computed(() =>
    computeHiddenCardStyles(
      this.totalWorks(),
      this.cardAnimationIndex(),
      this.scrollProgress()
    )
  );

  constructor() {
    this.seoService.setWorksSeo();
    afterNextRender(() => {
      this.loadAndInit();
    });
  }

  private async loadAndInit(): Promise<void> {
    await this.worksService.loadData();
    this.setupScrollListener();
    this.setupKeyboardNavigation();
    this.preloadWorkImages();
  }

  // Scroll handler runs outside Angular zone for performance.
  private setupScrollListener(): void {
    let ticking = false;

    const updateScroll = (): void => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const totalWorks = this.totalWorks();

      const rawIndex = scrollTop / viewportHeight;
      const baseIndex = Math.floor(rawIndex);
      const progress = rawIndex - baseIndex;

      const cardIndex = Math.min(baseIndex, totalWorks - 1);
      const indicatorIndex = Math.min(
        progress > 0.5 ? baseIndex + 1 : baseIndex,
        totalWorks - 1
      );

      this.activeIndex.set(indicatorIndex);
      this.cardAnimationIndex.set(cardIndex);
      this.scrollProgress.set(Math.min(progress, 1));

      ticking = false;
    };

    const handleScroll = (): void => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', handleScroll, { passive: true });
    });
    updateScroll();

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', handleScroll);
    });
  }

  private setupKeyboardNavigation(): void {
    let gPressed = false;
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleKeydown = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const total = this.totalWorks();
      const current = this.cardAnimationIndex();

      if (event.key === 'g' && !event.ctrlKey) {
        if (gPressed) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: scrollBehavior() });
          gPressed = false;
          if (gTimeout) clearTimeout(gTimeout);
          return;
        }
        gPressed = true;
        gTimeout = setTimeout(() => (gPressed = false), 500);
        return;
      }

      gPressed = false;
      if (gTimeout) clearTimeout(gTimeout);

      switch (event.key) {
        case 'G':
          event.preventDefault();
          window.scrollTo({
            top: (total - 1) * viewportHeight,
            behavior: scrollBehavior(),
          });
          break;
        case 'd':
          if (event.ctrlKey) {
            event.preventDefault();
            if (current < total - 1) {
              window.scrollTo({
                top: (current + 1) * viewportHeight,
                behavior: scrollBehavior(),
              });
            }
          }
          break;
        case 'u':
          if (event.ctrlKey) {
            event.preventDefault();
            if (current > 0) {
              window.scrollTo({
                top: (current - 1) * viewportHeight,
                behavior: scrollBehavior(),
              });
            }
          }
          break;
        case 'ArrowDown':
          if (current < total - 1) {
            event.preventDefault();
            window.scrollTo({
              top: (current + 1) * viewportHeight,
              behavior: scrollBehavior(),
            });
          }
          break;
        case 'ArrowUp':
          if (current > 0) {
            event.preventDefault();
            window.scrollTo({
              top: (current - 1) * viewportHeight,
              behavior: scrollBehavior(),
            });
          }
          break;
      }
    };

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('keydown', handleKeydown);
    });

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('keydown', handleKeydown);
    });
  }

  protected getCardStyle(index: number): CardStyle {
    return this.cardStyles()[index];
  }

  protected isCardVisible(index: number): boolean {
    const active = this.activeIndex();
    return index >= active - 1 && index <= active + 1;
  }

  // Preloads cover images sequentially after initial render.
  private preloadWorkImages(): void {
    const items = this.workItems();
    if (items.length === 0) return;

    const highResUrls = items.map((item) =>
      this.preloadService.getOptimizedUrl(item.image, IMAGE_PRESETS.highRes)
    );

    this.ngZone.runOutsideAngular(async () => {
      await this.preloadService.preloadSequential(highResUrls, 50);
    });
  }
}
