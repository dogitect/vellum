// Copyright 2025 Leon Xia. MIT License.

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CloudflareImageService } from '../../core/services';
import { environment } from '../../../environments/environment';

/** Full-screen hero background with CDN-optimized image. */
@Component({
  selector: 'app-hero-background',
  templateUrl: './hero-background.html',
  styleUrl: './hero-background.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBackgroundComponent {
  private readonly cfImage = inject(CloudflareImageService);

  protected readonly slogan = 'BEHIND YOU';

  /** Background image URL — local in dev, CDN in prod. */
  protected readonly backgroundUrl = computed(() => {
    const imagePath = 'images/bg.jpg';
    if (environment.useCloudflareImages) {
      return this.cfImage.getUrl(imagePath, {
        width: 1920,
        format: 'auto',
        quality: 85,
      });
    }
    return imagePath;
  });
}
