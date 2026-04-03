// Copyright 2025 Leon Xia. MIT License.

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  SeoService,
  CloudflareImageService,
  BreakpointService,
} from '../../core/services';
import { AboutService } from './services/about.service';
import { AboutSection } from './models/about.models';
import { environment } from '../../../environments/environment';
import { prefersReducedMotion } from '../../core/utils/motion';

const GOLDEN_RATIO = 1.618033988749895;

const SCROLL_SENSITIVITY = 1.5;

const ANIMATION_DURATION = 600;

/** About page with golden-ratio horizontal scroll navigation. */
@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
  private readonly seoService = inject(SeoService);
  private readonly aboutService = inject(AboutService);
  private readonly cfImage = inject(CloudflareImageService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly galleryRef = viewChild<ElementRef<HTMLElement>>('gallery');

  protected readonly activeIndex = signal(0);

  protected readonly scrollProgress = signal(0);

  protected readonly webgpuAvailable = signal(false);

  protected readonly sections = computed(() => this.aboutService.sections());

  protected readonly loading = computed(() => this.aboutService.loading());

  protected readonly totalCount = computed(() => this.sections().length);

  protected readonly activeSection = computed<AboutSection | null>(() => {
    const all = this.sections();
    const index = this.activeIndex();
    return all[index] ?? null;
  });

  /** Formatted display index (01, 02, etc.) */
  protected readonly displayIndex = computed(() => {
    const index = this.activeIndex() + 1;
    return index.toString().padStart(2, '0');
  });

  protected getBackgroundUrl(imagePath: string): string {
    if (environment.useCloudflareImages) {
      const r2Path = this.cfImage.toR2Path(imagePath);
      return this.cfImage.getUrl(r2Path, { width: 1920, format: 'auto' });
    }
    return imagePath;
  }

  private isAnimating = false;
  private animationFrameId: number | null = null;
  private targetScrollPosition = 0;
  private currentScrollPosition = 0;

  constructor() {
    this.seoService.setAboutSeo();

    afterNextRender(() => {
      this.initWebGPU();
      this.loadData();
      this.initScrollListener();
    });

    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }

  // Detects WebGPU availability for potential rendering optimizations.
  private async initWebGPU(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      if ('gpu' in navigator) {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          this.webgpuAvailable.set(true);
        }
      }
    } catch {
      this.webgpuAvailable.set(false);
    }
  }

  private async loadData(): Promise<void> {
    await this.aboutService.loadData();
  }

  // Wheel scroll listener runs outside Angular zone.
  private initScrollListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('wheel', this.handleWheel, { passive: false });
      window.addEventListener('keydown', this.handleKeydown);
    });
  }

  // Translates vertical wheel input to horizontal scroll.
  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();

    if (this.isAnimating) return;

    const delta = event.deltaY * SCROLL_SENSITIVITY;
    const gallery = this.galleryRef()?.nativeElement;

    if (!gallery) return;

    const totalWidth = gallery.scrollWidth;
    const viewWidth = gallery.clientWidth;
    const maxScroll = totalWidth - viewWidth;

    this.targetScrollPosition = Math.max(
      0,
      Math.min(maxScroll, this.targetScrollPosition + delta)
    );

    this.animateScroll(gallery, maxScroll);
  };

  private lastKeyTime = 0;

  private readonly KEY_DEBOUNCE_MS = 150;

  // Keyboard nav: vim keys (h/l) and arrows, debounced.
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();

    if (!['h', 'l', 'arrowleft', 'arrowright'].includes(key)) return;

    const now = performance.now();
    if (now - this.lastKeyTime < this.KEY_DEBOUNCE_MS) return;
    this.lastKeyTime = now;

    if (this.isAnimating) return;

    const currentIndex = this.activeIndex();
    const maxIndex = this.totalCount() - 1;
    let newIndex = currentIndex;

    if (key === 'h' || key === 'arrowleft') {
      newIndex = Math.max(0, currentIndex - 1);
    } else if (key === 'l' || key === 'arrowright') {
      newIndex = Math.min(maxIndex, currentIndex + 1);
    }

    if (newIndex !== currentIndex) {
      this.navigateToSection(newIndex);
    }
  };

  private navigateToSection(index: number): void {
    const gallery = this.galleryRef()?.nativeElement;
    if (!gallery) return;

    const totalWidth = gallery.scrollWidth;
    const viewWidth = gallery.clientWidth;
    const maxScroll = totalWidth - viewWidth;
    const itemCount = this.totalCount();

    if (itemCount <= 1) return;

    const sectionWidth = maxScroll / (itemCount - 1);
    this.targetScrollPosition = sectionWidth * index;

    this.isAnimating = true;
    this.animateToPosition(gallery, () => {
      this.isAnimating = false;
    });
  }

  private animateScroll(gallery: HTMLElement, maxScroll: number): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const animate = (): void => {
      const diff = this.targetScrollPosition - this.currentScrollPosition;

      if (Math.abs(diff) < 1) {
        this.currentScrollPosition = this.targetScrollPosition;
        gallery.scrollLeft = this.currentScrollPosition;
        this.updateActiveIndex(gallery, maxScroll);
        this.animationFrameId = null;
        return;
      }

      this.currentScrollPosition += diff * 0.12;
      gallery.scrollLeft = this.currentScrollPosition;
      this.updateActiveIndex(gallery, maxScroll);

      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  private updateActiveIndex(gallery: HTMLElement, maxScroll: number): void {
    const scrollPosition = gallery.scrollLeft;
    const itemCount = this.totalCount();

    if (itemCount === 0) return;

    const sectionWidth = maxScroll / (itemCount - 1 || 1);
    const rawIndex = scrollPosition / sectionWidth;
    const newIndex = Math.round(rawIndex);
    const clampedIndex = Math.max(0, Math.min(itemCount - 1, newIndex));

    const progress = rawIndex - Math.floor(rawIndex);

    this.ngZone.run(() => {
      this.activeIndex.set(clampedIndex);
      this.scrollProgress.set(progress);
    });
  }

  protected onIndexClick(index: number): void {
    if (this.isAnimating) return;
    this.navigateToSection(index);
  }

  // Animated scroll with easing. Jumps instantly if reduced motion is preferred.
  private animateToPosition(
    gallery: HTMLElement,
    onComplete: () => void
  ): void {
    const endPosition = this.targetScrollPosition;

    if (prefersReducedMotion()) {
      this.currentScrollPosition = endPosition;
      gallery.scrollLeft = this.currentScrollPosition;
      const maxScroll = gallery.scrollWidth - gallery.clientWidth;
      this.updateActiveIndex(gallery, maxScroll);
      onComplete();
      return;
    }

    const startPosition = this.currentScrollPosition;
    const startTime = performance.now();

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const eased = this.easeOutCubic(progress);

      this.currentScrollPosition =
        startPosition + (endPosition - startPosition) * eased;
      gallery.scrollLeft = this.currentScrollPosition;

      const maxScroll = gallery.scrollWidth - gallery.clientWidth;
      this.updateActiveIndex(gallery, maxScroll);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
        onComplete();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private cleanup(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('wheel', this.handleWheel);
      window.removeEventListener('keydown', this.handleKeydown);

      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
      }
    }
  }

  // Golden ratio left panel (~38.2%). Returns null on mobile.
  protected readonly leftPanelWidth = computed(() => {
    if (this.breakpoint.isPhone()) {
      return null;
    }
    const ratio = 1 - 1 / GOLDEN_RATIO;
    return `${ratio * 100}%`;
  });

  // Golden ratio right panel (~61.8%). Returns null on mobile.
  protected readonly rightPanelWidth = computed(() => {
    if (this.breakpoint.isPhone()) {
      return null;
    }
    const ratio = 1 / GOLDEN_RATIO;
    return `${ratio * 100}%`;
  });

  protected trackBySection(_: number, section: AboutSection): number {
    return section.id;
  }
}
