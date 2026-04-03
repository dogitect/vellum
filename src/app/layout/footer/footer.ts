// Copyright 2025 Leon Xia. MIT License.

import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Footer component with copyright information. */
@Component({
  selector: 'app-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  protected readonly currentYear = new Date().getFullYear();
}
