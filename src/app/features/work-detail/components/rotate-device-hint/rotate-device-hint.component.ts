// Copyright 2025 Leon Xia. MIT License.

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { BreakpointService } from '../../../../core/services';

/** Overlay prompting mobile users to rotate to landscape for slide viewing. */
@Component({
  selector: 'app-rotate-device-hint',
  templateUrl: './rotate-device-hint.component.html',
  styleUrl: './rotate-device-hint.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RotateDeviceHintComponent {
  private readonly breakpointService = inject(BreakpointService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dismissed = signal(false);

  readonly hintDismissed = output<void>();

  protected readonly isPhone = this.breakpointService.isPhone;

  protected readonly isTablet = this.breakpointService.isTablet;

  protected readonly shouldShow = computed(() => {
    if (this.dismissed()) return false;
    return this.isPortrait() && (this.isPhone() || this.isTablet());
  });

  private readonly isPortrait = signal(true);

  constructor() {
    afterNextRender(() => {
      this.checkOrientation();
      this.setupOrientationListener();
    });
  }

  private checkOrientation(): void {
    if (typeof window === 'undefined') return;

    if (window.screen?.orientation) {
      this.isPortrait.set(
        window.screen.orientation.type.startsWith('portrait')
      );
    } else {
      this.isPortrait.set(window.innerHeight > window.innerWidth);
    }
  }

  private setupOrientationListener(): void {
    if (typeof window === 'undefined') return;

    const handleOrientationChange = (): void => {
      this.checkOrientation();
    };

    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener(
        'change',
        handleOrientationChange
      );
    }

    window.addEventListener('resize', handleOrientationChange);

    this.destroyRef.onDestroy(() => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener(
          'change',
          handleOrientationChange
        );
      }
      window.removeEventListener('resize', handleOrientationChange);
    });
  }

  protected dismiss(): void {
    this.dismissed.set(true);
    this.hintDismissed.emit();
  }

  protected onDismissKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.dismiss();
    }
  }
}
