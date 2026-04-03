// Copyright 2025 Leon Xia. MIT License.

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiStateService {
  private readonly _navigationHidden = signal(false);

  readonly navigationHidden = this._navigationHidden.asReadonly();

  hideNavigation(): void {
    this._navigationHidden.set(true);
  }

  showNavigation(): void {
    this._navigationHidden.set(false);
  }
}
