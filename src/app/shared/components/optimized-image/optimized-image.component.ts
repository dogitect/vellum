// Copyright 2025 Leon Xia. MIT License.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { CloudflareImageService } from '../../../core/services';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-optimized-image',
  templateUrl: './optimized-image.component.html',
  styleUrl: './optimized-image.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OptimizedImageComponent {
  private readonly cfImage = inject(CloudflareImageService);

  protected readonly useCloudflare = environment.useCloudflareImages;

  /** Image source path (relative to public/, e.g., "images/works/covers/boardroom.jpg") */
  readonly src = input.required<string>();

  readonly alt = input<string>('');

  readonly sizes = input<string>('100vw');

  readonly loading = input<'eager' | 'lazy'>('lazy');

  readonly fetchpriority = input<'high' | 'low' | 'auto'>('auto');

  protected readonly r2Path = computed(() => {
    return this.cfImage.toR2Path(this.src());
  });

  protected readonly avifSrcset = computed(() => {
    return this.cfImage.getSrcsetForFormat(this.r2Path(), 'avif');
  });

  protected readonly webpSrcset = computed(() => {
    return this.cfImage.getSrcsetForFormat(this.r2Path(), 'webp');
  });

  protected readonly fallbackSrc = computed(() => {
    return this.cfImage.getFallbackUrl(this.r2Path());
  });
}
