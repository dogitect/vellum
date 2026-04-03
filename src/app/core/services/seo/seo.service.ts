// Copyright 2025 Leon Xia. MIT License.

import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

export interface PageSeoConfig {
  /** Page title (will be appended with " | Vellum" if not homepage) */
  title: string;
  /** Meta description for the page */
  description: string;
  /** Canonical URL path (e.g., '/works/boardroom') */
  canonicalPath: string;
  /** Open Graph image URL (optional, uses default if not provided) */
  ogImage?: string;
  /** Page type for Open Graph (default: 'website') */
  ogType?: 'website' | 'article' | 'profile';
  /** Keywords for the page (optional) */
  keywords?: string[];
  /** Whether this is the homepage */
  isHomepage?: boolean;
}

export interface BreadcrumbItem {
  name: string;
  /** URL path (e.g., '/works') */
  path: string;
}

export interface WorkCategorySeo {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
}

const BASE_URL = environment.siteUrl;

const ASSETS_URL = environment.cloudflareCdnUrl;

const DEFAULT_OG_IMAGE = `${ASSETS_URL}/cdn-cgi/image/width=1280,format=png,quality=100/images/social-preview.png`;

const WORK_CATEGORIES: WorkCategorySeo[] = [
  {
    slug: 'boardroom',
    title: 'Boardroom',
    description:
      'Executive presentation coaching for board meetings, strategy reviews, and leadership communications. Command the room when it matters most.',
    coverImage: 'images/works/covers/boardroom.jpg',
  },
  {
    slug: 'spotlight',
    title: 'Spotlight',
    description:
      'Keynote consulting for product launches, press conferences, and high-visibility presentations. Own the stage and captivate your audience.',
    coverImage: 'images/works/covers/spotlight.jpg',
  },
  {
    slug: 'pitch',
    title: 'Pitch',
    description:
      'Pitch deck consulting and investor presentation coaching. Tell the story investors want to fund and close with confidence.',
    coverImage: 'images/works/covers/pitch.jpg',
  },
  {
    slug: 'blueprint',
    title: 'Blueprint',
    description:
      'Technical presentation strategy for architects, engineers, and product leaders. Make complexity crystal clear for decision-makers.',
    coverImage: 'images/works/covers/blueprint.jpg',
  },
  {
    slug: 'portfolio',
    title: 'Portfolio',
    description:
      'Personal branding and portfolio presentation coaching for creative professionals. Present yourself with clarity and conviction.',
    coverImage: 'images/works/covers/portfolio.jpg',
  },
];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  /** Updates all SEO meta tags for a page. */
  updatePageSeo(config: PageSeoConfig): void {
    const fullTitle = config.isHomepage
      ? config.title
      : `${config.title} | Vellum`;
    const canonicalUrl = `${BASE_URL}${config.canonicalPath}`;
    const ogImage = config.ogImage ?? DEFAULT_OG_IMAGE;

    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: config.description });
    this.meta.updateTag({
      name: 'robots',
      content: 'index, follow, max-snippet:-1, max-image-preview:large',
    });

    if (config.keywords?.length) {
      this.meta.updateTag({
        name: 'keywords',
        content: config.keywords.join(', '),
      });
    }

    this.meta.updateTag({
      property: 'og:title',
      content: fullTitle,
    });
    this.meta.updateTag({
      property: 'og:description',
      content: config.description,
    });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({
      property: 'og:type',
      content: config.ogType ?? 'website',
    });

    this.meta.updateTag({
      name: 'twitter:title',
      content: fullTitle,
    });
    this.meta.updateTag({
      name: 'twitter:description',
      content: config.description,
    });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });

    this.updateCanonicalUrl(canonicalUrl);
  }

  /** Updates the canonical URL link element. */
  private updateCanonicalUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    let link: HTMLLinkElement | null = this.document.querySelector(
      'link[rel="canonical"]'
    );

    if (link) {
      link.setAttribute('href', url);
    } else {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.document.head.appendChild(link);
    }
  }

  /** Updates the breadcrumb structured data. */
  updateBreadcrumbs(items: BreadcrumbItem[]): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${BASE_URL}${item.path}`,
      })),
    };

    this.updateJsonLdScript('breadcrumb-jsonld', breadcrumbSchema);
  }

  /** Adds page-specific structured data (e.g., for a work detail page). */
  updatePageSchema(schema: object): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.updateJsonLdScript('page-specific-jsonld', schema);
  }

  /** Removes page-specific structured data. */
  clearPageSchema(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const existing = this.document.getElementById('page-specific-jsonld');
    if (existing) {
      existing.remove();
    }
  }

  /** Updates or creates a JSON-LD script element. */
  private updateJsonLdScript(id: string, schema: object): void {
    let script = this.document.getElementById(id) as HTMLScriptElement | null;

    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }

    script.textContent = JSON.stringify(schema);
  }

  /** Gets SEO metadata for a work category by slug. */
  getWorkCategorySeo(slug: string): WorkCategorySeo | undefined {
    return WORK_CATEGORIES.find((cat) => cat.slug === slug);
  }

  /** Generates full OG image URL for a work category. */
  getWorkOgImage(coverImage: string): string {
    return `${ASSETS_URL}/cdn-cgi/image/width=1200,format=jpg,quality=90/${coverImage}`;
  }

  /** Sets SEO for the Works listing page. */
  setWorksSeo(): void {
    this.updatePageSeo({
      title: 'Services',
      description:
        'Executive presentation consulting services: Boardroom coaching for executives, Spotlight keynote consulting, Pitch deck strategy for investors, Blueprint for technical presentations, and Portfolio personal branding.',
      canonicalPath: '/works',
      keywords: [
        'executive presentation consultant',
        'pitch deck consultant',
        'board presentation design',
        'presentation coaching',
        'keynote consulting',
        'investor deck consultant',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/works' },
    ]);
  }

  /** Sets SEO for a work category detail page. */
  setWorkDetailSeo(
    slug: string,
    categoryData?: { title: string; description: string; coverImage?: string }
  ): void {
    const category = this.getWorkCategorySeo(slug);
    const title = categoryData?.title ?? category?.title ?? 'Work';
    const description =
      categoryData?.description ??
      category?.description ??
      'Presentation design work';
    const coverImage =
      categoryData?.coverImage ?? category?.coverImage ?? undefined;

    this.updatePageSeo({
      title,
      description,
      canonicalPath: `/works/${slug}`,
      ogImage: coverImage ? this.getWorkOgImage(coverImage) : undefined,
      keywords: [
        'presentation consulting',
        title.toLowerCase(),
        'presentation coaching',
        'executive presentation',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/works' },
      { name: title, path: `/works/${slug}` },
    ]);

    if (category) {
      this.updatePageSchema({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: title,
        description,
        url: `${BASE_URL}/works/${slug}`,
        image: coverImage ? this.getWorkOgImage(coverImage) : undefined,
        provider: {
          '@type': 'Organization',
          name: 'Vellum by Dogitect',
        },
        serviceType: 'Presentation Consulting',
      });
    }
  }

  /** Sets SEO for the About page. */
  setAboutSeo(): void {
    this.updatePageSeo({
      title: 'About',
      description:
        'Learn about Vellum by Dogitect — a presentation craft studio specializing in high-quality Keynote and slide design. We help teams turn complex ideas into clear, confident, and memorable presentations through narrative structure, visual precision, and stage-ready design.',
      canonicalPath: '/about',
      keywords: [
        'about Vellum',
        'presentation consultant',
        'presentation coaching',
        'storytelling for executives',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'About', path: '/about' },
    ]);
  }

  /** Sets SEO for the Contact page. */
  setContactSeo(): void {
    this.updatePageSeo({
      title: 'Contact',
      description:
        'Get in touch with Vellum by Dogitect for keynote presentation design. We specialize in launches, pitches, and professional talks. Let us help you communicate with clarity, confidence, and authority.',
      canonicalPath: '/contact',
      keywords: [
        'contact Vellum',
        'presentation consulting services',
        'hire presentation coach',
        'presentation strategy',
      ],
    });

    this.updateBreadcrumbs([
      { name: 'Home', path: '/' },
      { name: 'Contact', path: '/contact' },
    ]);
  }

  /** Sets SEO for the homepage. */
  setHomeSeo(): void {
    this.updatePageSeo({
      title: 'Vellum by Dogitect — Crafting clarity on stage',
      description:
        'We craft keynote presentations that help professionals communicate with clarity, confidence, and authority.',
      canonicalPath: '/',
      isHomepage: true,
      keywords: [
        'executive presentation consultant',
        'pitch deck consultant',
        'board presentation design',
        'presentation coaching',
        'keynote consulting',
      ],
    });

    this.updateBreadcrumbs([{ name: 'Home', path: '/' }]);
  }

  /**
   * Sets SEO for the 404 Not Found page.
   * Uses noindex to prevent search engines from indexing error pages.
   */
  setNotFoundSeo(): void {
    this.updatePageSeo({
      title: 'Page Not Found',
      description:
        'The page you are looking for does not exist or has been moved. Return to Vellum to explore our presentation design services.',
      canonicalPath: '/',
    });

    this.meta.updateTag({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  }
}
