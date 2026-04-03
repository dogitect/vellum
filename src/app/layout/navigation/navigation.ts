// Copyright 2025 Leon Xia. MIT License.

import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  NgZone,
  signal,
} from '@angular/core';
import { UiStateService } from '../../core/services';

interface NavItem {
  readonly label: string;
  readonly href: string;
}

/** Header navigation with hamburger menu. */
@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.html',
  styleUrl: './navigation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  private readonly uiState = inject(UiStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  protected readonly isMenuOpen = signal(false);

  protected readonly isHidden = this.uiState.navigationHidden;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Overview', href: '/' },
    { label: 'Works', href: '/works' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  constructor() {
    afterNextRender(() => {
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape' && this.isMenuOpen()) {
          this.ngZone.run(() => this.closeMenu());
        }
      };

      document.addEventListener('keydown', onKeyDown);

      this.destroyRef.onDestroy(() => {
        document.removeEventListener('keydown', onKeyDown);
      });
    });
  }

  protected toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected onNavItemClick(): void {
    this.closeMenu();
  }

  // Keyboard handler for a11y.
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      this.closeMenu();
    }
  }
}
