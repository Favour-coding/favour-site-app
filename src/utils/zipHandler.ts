/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { AssetFile } from '../types';

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svgz',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  'mp4', 'webm', 'mov',
  'pdf', 'zip'
]);

function isBinaryFile(filename: string): boolean {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1];
  return BINARY_EXTENSIONS.has(ext);
}

export async function processUploadedFile(file: File): Promise<{
  html: string;
  assets: AssetFile[];
}> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    const text = await file.text();
    return {
      html: text,
      assets: []
    };
  }

  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const fileEntries = Object.keys(zip.files).filter((path) => !zip.files[path].dir);

    // Search for index.html at root first, then inside one subfolder
    let indexPath = fileEntries.find((p) => p.toLowerCase() === 'index.html');
    let prefix = '';

    if (!indexPath) {
      // Find inside one directory (e.g., "dist/index.html" or "my-app/index.html")
      const candidate = fileEntries.find((p) => {
        const segments = p.split('/').filter(Boolean);
        return segments.length === 2 && segments[1].toLowerCase() === 'index.html';
      });
      if (candidate) {
        indexPath = candidate;
        prefix = candidate.substring(0, candidate.lastIndexOf('/') + 1);
      } else {
        // Fallback: any index.html
        const anyIndex = fileEntries.find((p) => p.toLowerCase().endsWith('/index.html'));
        if (anyIndex) {
          indexPath = anyIndex;
          prefix = anyIndex.substring(0, anyIndex.lastIndexOf('/') + 1);
        }
      }
    }

    if (!indexPath || !zip.files[indexPath]) {
      throw new Error('Could not find index.html at the root or in a subfolder inside the uploaded zip archive.');
    }

    const html = await zip.files[indexPath].async('string');
    const assets: AssetFile[] = [];

    for (const filePath of fileEntries) {
      if (filePath === indexPath) continue; // index.html is handled separately
      if (prefix && !filePath.startsWith(prefix)) continue; // ignore files outside project root

      const relativePath = prefix ? filePath.slice(prefix.length) : filePath;
      if (!relativePath || relativePath.startsWith('__MACOSX') || relativePath.endsWith('.DS_Store')) {
        continue;
      }

      const zipEntry = zip.files[filePath];
      const binary = isBinaryFile(filePath);

      if (binary) {
        const uint8 = await zipEntry.async('uint8array');
        assets.push({
          path: relativePath,
          content: uint8,
          isBinary: true,
          size: uint8.length
        });
      } else {
        const str = await zipEntry.async('string');
        assets.push({
          path: relativePath,
          content: str,
          isBinary: false,
          size: str.length
        });
      }
    }

    return { html, assets };
  }

  throw new Error('Unsupported file format. Please upload an .html file or a .zip archive.');
}
