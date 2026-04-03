#!/usr/bin/env bun
// Copyright 2025 Leon Xia. MIT License.
// R2 incremental sync: uploads new/modified images to Cloudflare R2.
// Usage: bun run scripts/upload-to-r2.ts [--dry-run] [--force]

import { readdir, readFile } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const CONFIG = {
  bucketName: 'assets',
  r2KeyPrefix: 'projects/vellum',
  r2BaseUrl: 'https://assets.dogitect.io',
  r2PublicUrl: 'https://assets.dogitect.io/projects/vellum',
  sourceDirs: ['public/images'],
  supportedExtensions: new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.avif',
  ]),
} as const;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const forceUpload = args.includes('--force');

interface LocalFile {
  localPath: string;
  r2Key: string;
  size: number;
  md5: string;
}

interface SyncResult {
  uploaded: string[];
  skipped: string[];
  errors: string[];
}

function runCommand(
  cmd: string,
  cmdArgs: string[],
  timeout = 60000
): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => (stdout += data.toString()));
    child.stderr?.on('data', (data) => (stderr += data.toString()));

    const timer = setTimeout(() => {
      child.kill();
      resolve({ status: -1, stdout, stderr: 'Timeout' });
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ status: code ?? -1, stdout, stderr });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ status: -1, stdout, stderr: err.message });
    });
  });
}

async function validateAuth(): Promise<void> {
  const result = await runCommand('bunx', ['wrangler', 'whoami'], 10000);
  if (result.status === 0 && result.stdout.includes('logged in')) {
    console.log('Authenticated via wrangler login.');
    return;
  }

  const required = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error('Not authenticated with Cloudflare.');
    console.error(`Missing env vars: ${missing.join(', ')}`);
    console.error('Run `bunx wrangler login` or set environment variables.');
    process.exit(1);
  }
  console.log('Authenticated via environment variables.');
}

async function calculateMD5(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('md5').update(content).digest('hex');
}

async function findLocalFiles(): Promise<LocalFile[]> {
  const files: LocalFile[] = [];
  const seenPaths = new Set<string>();

  async function scanDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (CONFIG.supportedExtensions.has(ext)) {
            const r2Key = `${CONFIG.r2KeyPrefix}/${relative('public', fullPath)}`;

            if (seenPaths.has(r2Key)) continue;
            seenPaths.add(r2Key);

            const size = Bun.file(fullPath).size;
            const md5 = await calculateMD5(fullPath);
            files.push({ localPath: fullPath, r2Key, size, md5 });
          }
        }
      }
    } catch {
      // Directory doesn't exist, skip
    }
  }

  for (const dir of CONFIG.sourceDirs) {
    await scanDir(dir);
  }

  return files;
}

// Gets remote ETag (R2 returns MD5 as ETag for non-multipart uploads).
async function getRemoteETag(
  r2Key: string
): Promise<{ exists: boolean; etag?: string }> {
  try {
    const url = `${CONFIG.r2BaseUrl}/${r2Key}`;
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return { exists: false };
    }

    // R2 ETag is MD5 wrapped in quotes: "abc123..."
    const etag = response.headers.get('etag')?.replace(/"/g, '');
    return { exists: true, etag };
  } catch {
    return { exists: false };
  }
}

async function uploadFile(
  file: LocalFile
): Promise<{ ok: boolean; error?: string }> {
  const result = await runCommand(
    'bunx',
    [
      'wrangler',
      'r2',
      'object',
      'put',
      `${CONFIG.bucketName}/${file.r2Key}`,
      '--file',
      file.localPath,
      '--cache-control',
      'public, max-age=31536000, immutable',
      '--remote',
    ],
    120000
  );

  if (result.status === 0) return { ok: true };
  const error = (result.stderr || result.stdout || 'Unknown error').trim();
  return { ok: false, error };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function batchCheckRemote(
  files: LocalFile[]
): Promise<Map<string, { exists: boolean; etag?: string }>> {
  const results = new Map<string, { exists: boolean; etag?: string }>();
  const BATCH_SIZE = 20; // Parallel requests

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const checks = await Promise.all(
      batch.map(async (file) => {
        const result = await getRemoteETag(file.r2Key);
        return { key: file.r2Key, result };
      })
    );
    checks.forEach(({ key, result }) => results.set(key, result));
  }

  return results;
}

async function syncFiles(localFiles: LocalFile[]): Promise<SyncResult> {
  const result: SyncResult = {
    uploaded: [],
    skipped: [],
    errors: [],
  };

  // Phase 1: Parallel remote check
  let remoteCache = new Map<string, { exists: boolean; etag?: string }>();
  if (!forceUpload && !dryRun) {
    console.log('Checking remote files (parallel)...');
    remoteCache = await batchCheckRemote(localFiles);
    console.log('Done.\n');
  }

  // Phase 2: Compare and upload
  console.log('Syncing files...\n');

  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i];
    const progress = `[${i + 1}/${localFiles.length}]`;
    process.stdout.write(`${progress} ${file.r2Key}... `);

    if (dryRun) {
      console.log(`[DRY-RUN] would check/upload (${formatSize(file.size)})`);
      result.uploaded.push(file.r2Key);
      continue;
    }

    if (!forceUpload) {
      const remote = remoteCache.get(file.r2Key) ?? { exists: false };

      if (remote.exists && remote.etag === file.md5) {
        console.log('[SKIP] unchanged');
        result.skipped.push(file.r2Key);
        continue;
      }

      if (remote.exists) {
        process.stdout.write('[CHANGED] ');
      } else {
        process.stdout.write('[NEW] ');
      }
    }

    // Upload the file
    const upload = await uploadFile(file);
    if (upload.ok) {
      console.log(`uploaded (${formatSize(file.size)})`);
      result.uploaded.push(file.r2Key);
    } else {
      console.log(`FAILED: ${upload.error}`);
      result.errors.push(`${file.r2Key} — ${upload.error}`);
    }
  }

  return result;
}

async function main(): Promise<void> {
  console.log('\n===========================================');
  console.log('   Cloudflare R2 Incremental Sync');
  console.log('===========================================\n');

  if (dryRun) {
    console.log('Mode: DRY RUN (no changes will be made)\n');
  }
  if (forceUpload) {
    console.log('Mode: FORCE (upload all files regardless of MD5)\n');
  }

  // Find local files
  console.log('Scanning local files...');
  const localFiles = await findLocalFiles();

  if (localFiles.length === 0) {
    console.log('No images found.');
    return;
  }

  const totalSize = localFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`Found ${localFiles.length} files (${formatSize(totalSize)})\n`);

  if (!dryRun) {
    await validateAuth();
    console.log('');
  }

  const startTime = Date.now();
  const result = await syncFiles(localFiles);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n-------------------------------------------');
  console.log('Summary:');
  console.log(`  Uploaded: ${result.uploaded.length}`);
  console.log(`  Skipped:  ${result.skipped.length}`);
  if (result.errors.length > 0) {
    console.log(`  Errors:   ${result.errors.length}`);
    result.errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log(`  Time:     ${elapsed}s`);
  console.log('-------------------------------------------');
  console.log(`\nCDN URL: ${CONFIG.r2PublicUrl}`);

  if (result.errors.length > 0) process.exit(1);
}

main();
