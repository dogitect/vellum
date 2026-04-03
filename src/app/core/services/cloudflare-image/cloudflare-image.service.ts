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

const CDN_BASE = environment.cloudflareCdnUrl;

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
    return `${CDN_BASE}/cdn-cgi/image/${transformPath}/${imagePath}`;
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

  /** Converts a local image path to R2 path by stripping the leading slash. */
  toR2Path(localPath: string): string {
    return localPath.replace(/^\//, '');
  }
}
