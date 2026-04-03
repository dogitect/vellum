// Copyright 2025 Leon Xia. MIT License.

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  NgZone,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { WorkSlide } from '../../models/work-detail.models';
import {
  CloudflareImageService,
  ImagePreloadService,
  IMAGE_PRESETS,
  UiStateService,
} from '../../../../core/services';
import { environment } from '../../../../../environments/environment';
import { RotateDeviceHintComponent } from '../rotate-device-hint/rotate-device-hint.component';

@Component({
  selector: 'app-slide-viewer',
  templateUrl: './slide-viewer.component.html',
  styleUrl: './slide-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RotateDeviceHintComponent],
})
export class SlideViewerComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly document = inject(DOCUMENT);
  private readonly uiState = inject(UiStateService);
  private readonly cfImage = inject(CloudflareImageService);
  private readonly preloadService = inject(ImagePreloadService);
  private readonly containerRef =
    viewChild<ElementRef<HTMLElement>>('slideContainer');
  private readonly stageRef = viewChild<ElementRef<HTMLElement>>('slideStage');

  private lastSwipeAt = 0;

  readonly slides = input.required<readonly WorkSlide[]>();

  readonly title = input.required<string>();

  readonly closed = output<void>();

  protected readonly currentIndex = signal(0);

  protected readonly isFullscreen = signal(false);

  protected readonly lowResLoaded = signal(false);
  protected readonly highResLoaded = signal(false);

  protected readonly loadedIndices = signal<Set<number>>(new Set());

  protected readonly currentSlide = computed(() => {
    const allSlides = this.slides();
    const index = this.currentIndex();
    return allSlides[index] ?? null;
  });

  protected readonly useCloudflare = environment.useCloudflareImages;

  protected readonly currentR2Path = computed(() => {
    const slide = this.currentSlide();
    return slide ? this.cfImage.toR2Path(slide.path) : '';
  });

  protected readonly lowResUrl = computed(() => {
    const slide = this.currentSlide();
    if (!slide) return '';
    if (!this.useCloudflare) return slide.path;
    return this.cfImage.getUrl(this.currentR2Path(), {
      width: 120,
      quality: 40,
      format: 'auto',
      fit: 'scale-down',
    });
  });

  protected readonly highResUrl = computed(() => {
    const slide = this.currentSlide();
    if (!slide) return '';
    if (!this.useCloudflare) return slide.path;
    return this.cfImage.getUrl(this.currentR2Path(), {
      width: 2560,
      quality: 92,
      format: 'auto',
      fit: 'scale-down',
    });
  });

  protected readonly totalSlides = computed(() => this.slides().length);

  protected readonly canGoPrev = computed(() => this.currentIndex() > 0);

  protected readonly canGoNext = computed(
    () => this.currentIndex() < this.totalSlides() - 1
  );

  constructor() {
    this.uiState.hideNavigation();
    this.destroyRef.onDestroy(() => this.uiState.showNavigation());

    afterNextRender(() => {
      this.setupKeyboardNavigation();
      this.setupFullscreenListener();
      this.setupTouchNavigation();
      this.preloadAllSlides();
    });

    effect(() => {
      const slide = this.currentSlide();
      if (!slide) return;

      const index = this.currentIndex();
      const alreadyLoaded = this.loadedIndices().has(index);

      if (alreadyLoaded) {
        this.lowResLoaded.set(true);
        this.highResLoaded.set(true);
      } else {
        this.lowResLoaded.set(false);
        this.highResLoaded.set(false);
      }
    });
  }

  protected onLowResLoad(img: HTMLImageElement): void {
    if (img.src === this.lowResUrl()) {
      this.lowResLoaded.set(true);
    }
  }

  protected onHighResLoad(img: HTMLImageElement): void {
    if (img.src === this.highResUrl()) {
      this.highResLoaded.set(true);
      const index = this.currentIndex();
      this.loadedIndices.update((set) => {
        const newSet = new Set(set);
        newSet.add(index);
        return newSet;
      });
    }
  }

  protected goToPrev(): void {
    if (this.canGoPrev()) {
      this.currentIndex.update((i) => i - 1);
    }
  }

  protected goToNext(): void {
    if (this.canGoNext()) {
      this.currentIndex.update((i) => i + 1);
    }
  }

  protected goToSlide(index: number): void {
    if (index >= 0 && index < this.totalSlides()) {
      this.currentIndex.set(index);
    }
  }

  protected toggleFullscreen(): void {
    const container = this.containerRef()?.nativeElement;
    if (!container) return;

    if (!this.document.fullscreenElement) {
      container.requestFullscreen?.().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      this.document.exitFullscreen?.();
    }
  }

  protected close(): void {
    if (this.document.fullscreenElement) {
      this.document.exitFullscreen?.().then(() => {
        this.closed.emit();
      });
    } else {
      this.closed.emit();
    }
  }

  protected onSlideClick(event: MouseEvent): void {
    if (Date.now() - this.lastSwipeAt < 350) return;

    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const halfWidth = rect.width / 2;

    if (clickX < halfWidth) {
      this.goToPrev();
    } else {
      this.goToNext();
    }
  }

  protected onStageKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.goToNext();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPrev();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goToNext();
    }
  }

  private setupKeyboardNavigation(): void {
    const handleKeydown = (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          this.close();
          break;
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          this.goToPrev();
          break;
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          this.goToNext();
          break;
        case 'f':
          event.preventDefault();
          this.toggleFullscreen();
          break;
        case 'Home':
          event.preventDefault();
          this.goToSlide(0);
          break;
        case 'End':
          event.preventDefault();
          this.goToSlide(this.totalSlides() - 1);
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

  private setupFullscreenListener(): void {
    const handleFullscreenChange = (): void => {
      this.isFullscreen.set(!!this.document.fullscreenElement);
    };

    this.ngZone.runOutsideAngular(() => {
      this.document.addEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    });

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
    });
  }

  /** Sets up touch/swipe navigation for mobile. */
  private setupTouchNavigation(): void {
    const stage = this.stageRef()?.nativeElement;
    if (!stage) return;

    // Minimum swipe distance in pixels to trigger navigation.
    const SWIPE_THRESHOLD = 50;
    // Maximum time in ms for a swipe gesture.
    const SWIPE_TIMEOUT = 350;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let activePointerId: number | null = null;

    const onSwipe = (
      deltaX: number,
      deltaY: number,
      deltaTime: number
    ): void => {
      if (
        Math.abs(deltaX) > SWIPE_THRESHOLD &&
        Math.abs(deltaX) > Math.abs(deltaY) &&
        deltaTime < SWIPE_TIMEOUT
      ) {
        if (deltaX < 0) {
          this.goToNext();
        } else {
          this.goToPrev();
        }

        this.lastSwipeAt = Date.now();
      }
    };

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (activePointerId !== null) return;

      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startTime = Date.now();
    };

    const handlePointerUp = (event: PointerEvent): void => {
      if (activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const deltaTime = Date.now() - startTime;

      activePointerId = null;
      onSwipe(deltaX, deltaY, deltaTime);
    };

    const handlePointerCancel = (event: PointerEvent): void => {
      if (activePointerId === event.pointerId) {
        activePointerId = null;
      }
    };

    const handleTouchStart = (event: TouchEvent): void => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (event: TouchEvent): void => {
      if (event.changedTouches.length !== 1) return;
      const endX = event.changedTouches[0].clientX;
      const endY = event.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = Date.now() - startTime;
      onSwipe(deltaX, deltaY, deltaTime);
    };

    this.ngZone.runOutsideAngular(() => {
      if ('PointerEvent' in window) {
        stage.addEventListener('pointerdown', handlePointerDown, {
          passive: true,
        });
        stage.addEventListener('pointerup', handlePointerUp, {
          passive: true,
        });
        stage.addEventListener('pointercancel', handlePointerCancel, {
          passive: true,
        });
      } else {
        stage.addEventListener('touchstart', handleTouchStart, {
          passive: true,
        });
        stage.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
    });

    this.destroyRef.onDestroy(() => {
      if ('PointerEvent' in window) {
        stage.removeEventListener('pointerdown', handlePointerDown);
        stage.removeEventListener('pointerup', handlePointerUp);
        stage.removeEventListener('pointercancel', handlePointerCancel);
      } else {
        stage.removeEventListener('touchstart', handleTouchStart);
        stage.removeEventListener('touchend', handleTouchEnd);
      }
    });
  }

  /** Preloads all slides sequentially after first slide loads. */
  private async preloadAllSlides(): Promise<void> {
    const allSlides = this.slides();
    if (allSlides.length <= 1) return;

    await this.waitForFirstSlide();

    const slidePaths = allSlides.slice(1).map((slide) => slide.path);

    const highResUrls = slidePaths.map((path) =>
      this.preloadService.getOptimizedUrl(path, IMAGE_PRESETS.highRes)
    );

    this.ngZone.runOutsideAngular(async () => {
      for (let i = 0; i < highResUrls.length; i++) {
        const url = highResUrls[i];
        const success = await this.preloadService.preload(url);
        if (success) {
          this.loadedIndices.update((set) => {
            const newSet = new Set(set);
            newSet.add(i + 1);
            return newSet;
          });
        }
      }
    });
  }

  // Waits for first slide to load, with 5s timeout.
  private waitForFirstSlide(): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 5000);

      const wrappedCheck = (): void => {
        if (this.highResLoaded()) {
          clearTimeout(timeout);
          resolve();
        } else {
          requestAnimationFrame(wrappedCheck);
        }
      };
      wrappedCheck();
    });
  }
}
