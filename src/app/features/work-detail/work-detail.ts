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
import { ActivatedRoute, Router } from '@angular/router';
import { SlideViewerComponent } from './components/slide-viewer/slide-viewer.component';
import { WorkDetailService } from './services/work-detail.service';
import { OptimizedImageComponent } from '../../shared';
import { SeoService } from '../../core/services';
import {
  WorkCategory,
  WorkProject,
  WorkSlide,
} from './models/work-detail.models';
import { scrollBehavior } from '../../core/utils/motion';
import {
  CardStyle,
  computeStackedCardStyles,
} from '../../core/utils/card-animation';

/** Work detail page with full-screen project cards and slide viewer. */
@Component({
  selector: 'app-work-detail',
  templateUrl: './work-detail.html',
  styleUrl: './work-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SlideViewerComponent, OptimizedImageComponent],
})
export class WorkDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly workDetailService = inject(WorkDetailService);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  protected readonly category = signal<WorkCategory | null>(null);

  protected readonly activeIndex = signal(0);

  /** Card animation index (for smooth transitions) */
  protected readonly cardAnimationIndex = signal(0);

  /** Scroll progress for current card (0-1) */
  protected readonly scrollProgress = signal(0);

  private isNavigating = false;

  private previousActiveElement: Element | null = null;

  protected readonly slideViewerOpen = signal(false);

  protected readonly currentSlides = signal<readonly WorkSlide[]>([]);

  protected readonly currentProjectTitle = signal('');

  protected readonly projects = computed(() => this.category()?.projects ?? []);

  protected readonly totalProjects = computed(() => this.projects().length);

  protected readonly activeProject = computed(() => {
    const all = this.projects();
    const index = this.activeIndex();
    return all[index] ?? null;
  });

  protected readonly cardStyles = computed(() =>
    computeStackedCardStyles(
      this.totalProjects(),
      this.cardAnimationIndex(),
      this.scrollProgress()
    )
  );

  constructor() {
    afterNextRender(() => {
      this.loadCategory();
    });

    this.destroyRef.onDestroy(() => {
      if (this.slideViewerOpen()) {
        document.body.style.overflow = '';
      }
    });
  }

  private async loadCategory(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      this.router.navigate(['/works']);
      return;
    }

    await this.workDetailService.loadData();

    const categoryData = this.workDetailService.getCategoryBySlug(slug);

    if (!categoryData) {
      this.router.navigate(['/works']);
      return;
    }

    this.category.set(categoryData);
    this.seoService.setWorkDetailSeo(slug, {
      title: categoryData.title,
      description: categoryData.description,
      coverImage: categoryData.coverImage,
    });

    this.setupScrollListener();
    this.setupKeyboardNavigation();
  }

  private setupScrollListener(): void {
    let ticking = false;

    const updateScroll = (): void => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const total = this.totalProjects();

      const rawIndex = scrollTop / viewportHeight;
      const baseIndex = Math.floor(rawIndex);
      const progress = rawIndex - baseIndex;

      const cardIndex = Math.min(baseIndex, total - 1);
      const indicatorIndex = Math.min(
        progress > 0.5 ? baseIndex + 1 : baseIndex,
        total - 1
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
    const SCROLL_DURATION = 400;

    const navigateTo = (targetIndex: number): void => {
      if (this.isNavigating) return;

      const viewportHeight = window.innerHeight;
      const targetTop = targetIndex * viewportHeight;

      this.isNavigating = true;
      window.scrollTo({ top: targetTop, behavior: scrollBehavior() });

      setTimeout(() => {
        this.isNavigating = false;
      }, SCROLL_DURATION);
    };

    const handleKeydown = (event: KeyboardEvent): void => {
      if (this.slideViewerOpen() || this.isNavigating) return;

      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const total = this.totalProjects();
      const current = this.cardAnimationIndex();

      switch (event.key) {
        case 'j':
        case 'ArrowDown':
          if (current < total - 1) {
            event.preventDefault();
            navigateTo(current + 1);
          }
          break;
        case 'k':
        case 'ArrowUp':
          if (current > 0) {
            event.preventDefault();
            navigateTo(current - 1);
          }
          break;
        case 'Enter':
          event.preventDefault();
          this.openSlideViewer(this.activeProject());
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

  protected openSlideViewer(project: WorkProject | null): void {
    if (!project) return;

    this.previousActiveElement = document.activeElement;
    this.currentProjectTitle.set(project.title);

    const slides = this.workDetailService.loadProjectSlides(project);
    if (slides.length > 0) {
      this.currentSlides.set(slides);
      this.slideViewerOpen.set(true);
      document.body.style.overflow = 'hidden';
    }
  }

  protected closeSlideViewer(): void {
    this.slideViewerOpen.set(false);
    document.body.style.overflow = '';
    (this.previousActiveElement as HTMLElement)?.focus?.();
    this.previousActiveElement = null;
  }

  /** Formats a YYYY-MM date string to "Month Year". */
  protected formatDate(dateStr: string): string {
    if (!dateStr || !/^\d{4}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const [year, month] = dateStr.split('-');
    const yearNum = Number(year);
    const monthNum = Number(month);

    if (monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
      return dateStr;
    }

    const date = new Date(yearNum, monthNum - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  protected getCardStyle(index: number): CardStyle {
    return this.cardStyles()[index];
  }

  protected isCardVisible(index: number): boolean {
    const active = this.activeIndex();
    return index >= active - 1 && index <= active + 1;
  }

  protected getProjectCover(project: WorkProject): string {
    return `${project.basePath}/${project.slug}-01.jpg`;
  }
}
