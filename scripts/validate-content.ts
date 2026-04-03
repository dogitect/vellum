#!/usr/bin/env bun
// Copyright 2025 Leon Xia. MIT License.
// Validates JSON structure and cross-references for work content.
// Usage: bun run scripts/validate-content.ts

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const CONTENT_DIR = 'public/content/works';
const IMAGES_DIR = 'public/images/works';

let errors: string[] = [];

function error(msg: string): void {
  errors.push(msg);
  console.error(`  ✗ ${msg}`);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

async function readJson<T>(path: string): Promise<T> {
  const file = Bun.file(path);
  return file.json() as Promise<T>;
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

interface ProjectsConfig {
  categories: Array<{ slug: string; projects: string[] }>;
}

interface CategoryMeta {
  title: string;
  subtitle: string;
  description: string;
  coverImage: string;
}

interface ProjectMeta {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  slideCount?: number;
}

async function main(): Promise<void> {
  // ── projects.json ──────────────────────────────────────────────

  console.log('\nValidating projects.json...');

  const projectsPath = join(CONTENT_DIR, 'projects.json');
  if (!(await Bun.file(projectsPath).exists())) {
    error('projects.json not found');
    process.exit(1);
  }

  const config = await readJson<ProjectsConfig>(projectsPath);

  if (!Array.isArray(config.categories)) {
    error('projects.json: "categories" must be an array');
    process.exit(1);
  }

  ok(`projects.json has ${config.categories.length} categories`);

  // ── Category index.json ────────────────────────────────────────

  console.log('\nValidating category metadata...');

  for (const cat of config.categories) {
    const indexPath = join(CONTENT_DIR, cat.slug, 'index.json');
    if (!(await Bun.file(indexPath).exists())) {
      error(`${cat.slug}/index.json not found`);
      continue;
    }

    const meta = await readJson<Record<string, unknown>>(indexPath);
    const requiredFields: (keyof CategoryMeta)[] = [
      'title',
      'subtitle',
      'description',
      'coverImage',
    ];

    for (const field of requiredFields) {
      if (typeof meta[field] !== 'string') {
        error(`${cat.slug}/index.json: missing or invalid "${field}"`);
      }
    }

    // Cross-check cover image exists
    if (typeof meta['coverImage'] === 'string') {
      const imgPath = join('public', meta['coverImage'] as string);
      if (!(await Bun.file(imgPath).exists())) {
        error(`${cat.slug}: cover image not found: ${meta['coverImage']}`);
      }
    }

    // Cross-check category directory exists
    const catDir = join(CONTENT_DIR, cat.slug);
    if (!(await dirExists(catDir))) {
      error(`${cat.slug}: content directory not found`);
    }

    ok(`${cat.slug}/index.json`);
  }

  // ── Project metadata.json ──────────────────────────────────────

  console.log('\nValidating project metadata...');

  const DATE_REGEX = /^\d{4}-\d{2}$/;

  for (const cat of config.categories) {
    for (const projSlug of cat.projects) {
      const metaPath = join(CONTENT_DIR, cat.slug, projSlug, 'metadata.json');

      if (!(await Bun.file(metaPath).exists())) {
        error(`${cat.slug}/${projSlug}/metadata.json not found`);
        continue;
      }

      const meta = await readJson<Record<string, unknown>>(metaPath);

      // Required string fields
      for (const field of ['title', 'subtitle', 'description', 'date']) {
        if (typeof meta[field] !== 'string') {
          error(
            `${cat.slug}/${projSlug}/metadata.json: missing or invalid "${field}"`
          );
        }
      }

      // Date format
      if (typeof meta['date'] === 'string' && !DATE_REGEX.test(meta['date'])) {
        error(
          `${cat.slug}/${projSlug}: invalid date format "${meta['date']}" (expected YYYY-MM)`
        );
      }

      // slideCount
      if (
        meta['slideCount'] !== undefined &&
        typeof meta['slideCount'] !== 'number'
      ) {
        error(`${cat.slug}/${projSlug}: slideCount must be a number`);
      }

      // Cross-check slide images
      if (typeof meta['slideCount'] === 'number' && meta['slideCount'] > 0) {
        const imagesDir = join(IMAGES_DIR, cat.slug, projSlug);
        if (!(await dirExists(imagesDir))) {
          error(`${cat.slug}/${projSlug}: images directory not found`);
        } else {
          const count = meta['slideCount'] as number;
          for (let i = 1; i <= count; i++) {
            const padded = String(i).padStart(2, '0');
            const imgFile = join(imagesDir, `${projSlug}-${padded}.jpg`);
            if (!(await Bun.file(imgFile).exists())) {
              error(
                `${cat.slug}/${projSlug}: missing slide image ${projSlug}-${padded}.jpg`
              );
            }
          }
        }
      }

      ok(`${cat.slug}/${projSlug}/metadata.json`);
    }
  }

  // ── Cross-check: directories vs projects.json ──────────────────

  console.log('\nCross-checking directories vs projects.json...');

  for (const cat of config.categories) {
    const catDir = join(CONTENT_DIR, cat.slug);
    if (!(await dirExists(catDir))) continue;

    const entries = await readdir(catDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const dir of dirs) {
      if (!cat.projects.includes(dir)) {
        error(
          `${cat.slug}/${dir}: directory exists but not listed in projects.json`
        );
      }
    }

    for (const proj of cat.projects) {
      if (!dirs.includes(proj)) {
        error(
          `${cat.slug}/${proj}: listed in projects.json but no directory found`
        );
      }
    }
  }

  ok('Directory cross-check complete');

  // ── Summary ────────────────────────────────────────────────────

  console.log('');
  if (errors.length > 0) {
    console.error(`\n✗ ${errors.length} validation error(s) found.\n`);
    process.exit(1);
  } else {
    console.log('\n✓ All content validations passed.\n');
    process.exit(0);
  }
}

main();
