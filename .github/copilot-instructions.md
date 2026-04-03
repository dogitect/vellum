# Copilot Instructions

## Project Overview

Angular 21 presentation design studio site with **zoneless change detection** and standalone components.
Entry: `src/main.ts` → `src/app/app.config.ts` (provideZonelessChangeDetection, view transitions, fetch HttpClient).
Uses **Bun** as package manager and **Vitest** for testing. Deployed to **Cloudflare Workers** with static assets (client-side only, no SSR).

**Key Angular APIs used**: `provideZonelessChangeDetection()`, `withViewTransitions()`, `withComponentInputBinding()`, `provideHttpClient(withFetch())`

## Commands

```bash
bun run start               # Dev server (ng serve --open)
bun run build               # Production build
bun run test                # Run all tests (vitest)
bun run test -- --run src/app/app.spec.ts  # Run single test file
bun run lint                # ESLint check
bun run lint:fix            # ESLint with auto-fix
bun run format              # Prettier formatting
bun run deploy              # Build + deploy to Cloudflare Workers (production)
bun run deploy:staging      # Build + deploy to staging worker
bun run preview             # Build + local preview via wrangler dev
bun run cf:tail             # Stream live logs from production worker
bun run validate-content    # Validate JSON structure and cross-references for work content
bun run upload-to-r2        # Upload public/images/ to Cloudflare R2
```

## Architecture

```
src/app/
├── app.ts              # Root component with route-based conditional layout
├── app.routes.ts       # Lazy loadComponent routes + legacy redirects
├── core/services/      # Singleton services (CloudflareImageService, BreakpointService, SeoService, UiStateService)
├── features/           # Route-level components (works, work-detail, about, contact, not-found)
├── layout/             # Shell components (navigation, hero-background, footer)
└── shared/components/  # Reusable UI (OptimizedImageComponent)
```

### Content Data Flow (File-Based JSON)

Content lives in `public/content/works/`, images in `public/images/works/`:

| File                                 | Schema                                               |
| ------------------------------------ | ---------------------------------------------------- |
| `[category]/index.json`              | `{ title, subtitle, description, coverImage }`       |
| `[category]/[project]/metadata.json` | `{ title, subtitle, description, date, slideCount }` |

`WorkDetailService` loads via HttpClient, validates JSON, caches in signals. Project lists are configured in `public/content/works/projects.json`. `slideCount` determines the number of slides (no auto-discovery).

### Image Pipeline

**Development**: Local images from `public/images/` (`useCloudflareImages: false` in `environment.ts`)
**Production**: Cloudflare R2 CDN with on-the-fly transformations (`useCloudflareImages: true`)

```typescript
// Template: Use OptimizedImageComponent (handles AVIF/WebP srcsets automatically)
<app-optimized-image [src]="'images/works/covers/boardroom.jpg'" [alt]="'...'" />

// Programmatic: CloudflareImageService
this.cfImage.getUrl('images/works/covers/boardroom.jpg', { width: 640, format: 'webp' });
```

## Critical Patterns (Zoneless)

### Every Component MUST Use

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,  // REQUIRED - enforced by ESLint
  // ...
})
export class MyComponent {
  private readonly state = signal<Data | null>(null);      // Writable signals for state
  protected readonly derived = computed(() => ...);         // Computed for derived values
  readonly inputValue = input.required<string>();           // Signal inputs (not @Input())
}
```

### DOM Initialization

```typescript
// Use afterNextRender for DOM work (runs after component renders)
afterNextRender(() => this.initScrollListener());
```

### High-Frequency Events (Avoid Change Detection)

```typescript
private readonly ngZone = inject(NgZone);
private readonly destroyRef = inject(DestroyRef);

constructor() {
  afterNextRender(() => {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleScroll);
    });
    this.destroyRef.onDestroy(() => window.removeEventListener('scroll', this.handleScroll));
  });
}
```

## Conventions

- **Templates**: `@if/@for/@switch` only (never `*ngIf/*ngFor`)
- **Files**: Separate `.ts/.html/.scss` with `templateUrl/styleUrl`
- **File Header**: Every file starts with `// Copyright 2025 Leon Xia. MIT License.`
- **Styles**: SCSS with CSS variables from `src/styles/_theme.scss` (Apple dark mode palette)
- **Barrel Exports**: `index.ts` in `layout/`, `shared/`, `core/services/`, feature folders
- **Visibility**: `private` for internal, `protected` for template-bound, `readonly` for signals
- **Component Prefix**: `app-` (enforced by ESLint)
- **Directive Prefix**: `app` with camelCase (e.g., `appMyDirective`)
- **No `any`**: ESLint enforces `@typescript-eslint/no-explicit-any`
- **Console logging**: Only `console.warn` and `console.error` allowed (ESLint rule)

## Testing (Vitest)

```typescript
import { describe, it, expect, beforeEach } from 'vitest'; // NOT jasmine/jest
import { TestBed } from '@angular/core/testing';

describe('MyComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent], // Standalone components use imports
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: SomeService, useValue: mockService }, // Signal-based mocks
      ],
    }).compileComponents();
  });
});
```

Run single test: `bun run test -- --run src/app/path/to/file.spec.ts`

## Adding New Features

1. Create feature folder: `src/app/features/[name]/`
2. Add lazy route in `app.routes.ts`: `loadComponent: () => import('./features/[name]/[name]').then((m) => m.NameComponent)`
3. Create barrel export `index.ts` if multiple files
4. Use signal-based state, OnPush detection, `afterNextRender` for DOM init

## Adding Routes

Routes use lazy loading with dynamic imports. Pattern:

```typescript
{
  path: 'feature-name',
  loadComponent: () =>
    import('./features/feature-name/feature-name').then((m) => m.FeatureNameComponent),
  title: 'Feature | Vellum',
}
```

Legacy path redirects should be added for SEO (see `solutions` → `works` redirects in `app.routes.ts`).

## Adding Work Content

1. Category: Create `public/content/works/[category]/index.json`
2. Project: Create `public/content/works/[category]/[project]/metadata.json`
3. Images: Add to `public/images/works/[category]/[project]/`
4. Register: Add project slug to `public/content/works/projects.json` under the corresponding category

## Environment Configuration

- `src/environments/environment.ts` - Development (local images)
- `src/environments/environment.prod.ts` - Production (Cloudflare R2 CDN)

Toggle `useCloudflareImages` to switch between local and CDN image delivery.

## Deployment (Cloudflare Workers)

Worker config lives in `wrangler.toml`, worker source in `worker/index.ts`.

- **Production**: `bun run deploy` builds Angular and runs `wrangler deploy` to the `project-vellum` worker.
- **Staging**: `bun run deploy:staging` deploys to `project-vellum-staging`.
- **Preview**: `bun run preview` builds and runs `wrangler dev` locally.
- **CI/CD**: `.github/workflows/r2-upload.yml` — auto-uploads images to Cloudflare R2 on pushes to `main` that touch `public/images/**`.

The worker adds security headers (CSP, HSTS, X-Frame-Options), Cache-Control per asset type, and www-to-apex 301 redirects. SPA fallback is handled by the `not_found_handling = "single-page-application"` asset config.
