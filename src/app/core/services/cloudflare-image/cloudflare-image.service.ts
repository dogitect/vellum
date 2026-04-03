// Copyright 2025 Leon Xia. MIT License.

import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

export interface ImageTransformOptions {
  /** Width in pixels. */
  width?: number;
  /** Height in pixels. */
  height?: number;
  /** Output format. 'auto' negotiates based on browser support. */
  format?: 'auto' | 'avif' | 'webp' | 'jpeg' | 'png';
  /** Quality 1-100 (default: 85) */
  quality?: number;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  /** Device pixel ratio multiplier */
  dpr?: number;
}

const RESPONSIVE_WIDTHS = [640, 1280, 1920] as const;

const CDN_ORIGIN = environment.cloudflareCdnOrigin;
const R2_PREFIX = 'projects/vellum/';

const DEFAULT_OPTIONS: ImageTransformOptions = {
  format: 'auto',
  quality: 85,
  fit: 'scale-down',
};

@Injectable({
  providedIn: 'root',
})
export class CloudflareImageService {
  /** Generates a Cloudflare Image Transformation URL. */
  getUrl(imagePath: string, options: ImageTransformOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const params: string[] = [];

    if (opts.width) params.push(`width=${opts.width}`);
    if (opts.height) params.push(`height=${opts.height}`);
    if (opts.format) params.push(`format=${opts.format}`);
    if (opts.quality) params.push(`quality=${opts.quality}`);
    if (opts.fit) params.push(`fit=${opts.fit}`);
    if (opts.dpr) params.push(`dpr=${opts.dpr}`);

    const transformPath = params.join(',');
    const r2Path = this.toR2Path(imagePath);
    return `${CDN_ORIGIN}/cdn-cgi/image/${transformPath}/${r2Path}`;
  }

  /** Generates srcset string for responsive images. */
  getSrcset(
    imagePath: string,
    options: Omit<ImageTransformOptions, 'width'> = {}
  ): string {
    return RESPONSIVE_WIDTHS.map(
      (width) => `${this.getUrl(imagePath, { ...options, width })} ${width}w`
    ).join(', ');
  }

  /** Generates srcset for a specific image format. */
  getSrcsetForFormat(imagePath: string, format: 'avif' | 'webp'): string {
    return this.getSrcset(imagePath, { format });
  }

  /** Returns the fallback URL (largest size, WebP format). */
  getFallbackUrl(imagePath: string): string {
    return this.getUrl(imagePath, {
      width: RESPONSIVE_WIDTHS[RESPONSIVE_WIDTHS.length - 1],
      format: 'webp',
    });
  }

  /** Converts a local image path to R2 key (idempotent). */
  toR2Path(localPath: string): string {
    const stripped = localPath.replace(/^\//, '');
    return stripped.startsWith(R2_PREFIX)
      ? stripped
      : `${R2_PREFIX}${stripped}`;
  }
}
