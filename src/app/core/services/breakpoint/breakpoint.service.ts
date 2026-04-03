// Copyright 2025 Leon Xia. MIT License.

import {
  Injectable,
  computed,
  signal,
  inject,
  PLATFORM_ID,
  DestroyRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Device types based on screen width. */
export enum DeviceType {
  /** Mobile devices with width < 768px */
  Phone = 'phone',
  /** Tablet devices with width 768px - 1024px */
  Tablet = 'tablet',
  /** Desktop devices with width > 1024px */
  Desktop = 'desktop',
}

const CUSTOM_BREAKPOINTS = {
  Phone: '(max-width: 767.98px)',
  Tablet: '(min-width: 768px) and (max-width: 1024px)',
  Desktop: '(min-width: 1024.01px)',
} as const;

/** Detects viewport breakpoint changes using native MediaQueryList API. */
@Injectable({
  providedIn: 'root',
})
export class BreakpointService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _isPhone = signal(false);

  private readonly _isTablet = signal(false);

  private readonly _isDesktop = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeBreakpoints();
    }
  }

  // Initializes media query listeners for all breakpoints.
  private initializeBreakpoints(): void {
    const phoneQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Phone);
    this._isPhone.set(phoneQuery.matches);
    const phoneHandler = (e: MediaQueryListEvent): void =>
      this._isPhone.set(e.matches);
    phoneQuery.addEventListener('change', phoneHandler);

    const tabletQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Tablet);
    this._isTablet.set(tabletQuery.matches);
    const tabletHandler = (e: MediaQueryListEvent): void =>
      this._isTablet.set(e.matches);
    tabletQuery.addEventListener('change', tabletHandler);

    const desktopQuery = window.matchMedia(CUSTOM_BREAKPOINTS.Desktop);
    this._isDesktop.set(desktopQuery.matches);
    const desktopHandler = (e: MediaQueryListEvent): void =>
      this._isDesktop.set(e.matches);
    desktopQuery.addEventListener('change', desktopHandler);

    this.destroyRef.onDestroy(() => {
      phoneQuery.removeEventListener('change', phoneHandler);
      tabletQuery.removeEventListener('change', tabletHandler);
      desktopQuery.removeEventListener('change', desktopHandler);
    });
  }

  readonly isPhone = this._isPhone.asReadonly();

  readonly isTablet = this._isTablet.asReadonly();

  readonly isDesktop = this._isDesktop.asReadonly();

  readonly isMobile = computed(() => this._isPhone() || this._isTablet());

  readonly deviceType = computed<DeviceType>(() => {
    if (this._isPhone()) {
      return DeviceType.Phone;
    }
    if (this._isTablet()) {
      return DeviceType.Tablet;
    }
    return DeviceType.Desktop;
  });
}
