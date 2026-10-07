import path from 'path';
import fs from 'fs';
import os from 'os';
import { PROTECTED_PATHS, IS_WINDOWS } from './config';

export function normalizePath(inputPath: string): string {
  if (!inputPath) return '';
  let resolved = inputPath;
  if (resolved.startsWith('~')) {
    resolved = path.join(os.homedir(), resolved.slice(1));
  }
  return path.resolve(resolved);
}

export function isProtected(targetPath: string): [boolean, string] {
  const norm = normalizePath(targetPath);
  if (!norm) return [false, ''];

  for (const prot of PROTECTED_PATHS) {
    const protNorm = normalizePath(prot);
    if (!protNorm) continue;

    if (norm === protNorm || norm.startsWith(protNorm + path.sep)) {
      return [true, `Path is in protected system location: ${prot}`];
    }

    if (IS_WINDOWS) {
      if (
        norm.toLowerCase() === protNorm.toLowerCase() ||
        norm.toLowerCase().startsWith(protNorm.toLowerCase() + path.sep)
      ) {
        return [true, `Path is in protected system location: ${prot}`];
      }
    }
  }

  // Check filesystem root
  if (path.dirname(norm) === norm) {
    return [true, 'Path is filesystem root directory'];
  }

  return [false, ''];
}

export function verifyPathInScope(filePath: string, scopePath?: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Path must be a non-empty string');
  }

  if (filePath.includes('\0')) {
    throw new Error('Null byte detected in path');
  }

  const normTarget = normalizePath(filePath);

  try {
    const stat = fs.lstatSync(normTarget);
    if (stat.isSymbolicLink()) {
      throw new Error('Operating on symbolic links is not permitted for safety');
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  const [protectedLocation, reason] = isProtected(normTarget);
  if (protectedLocation) {
    throw new Error(`Protected system path: ${reason}`);
  }

  if (scopePath) {
    const normScope = normalizePath(scopePath);
    const rel = path.relative(normScope, normTarget);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path '${normTarget}' is outside authorized scope '${normScope}'`);
    }
  }

  return normTarget;
}

export function safeDestinationFilename(
  destFolder: string,
  originalFilename: string
): [string, string] {
  const normDest = normalizePath(destFolder);
  fs.mkdirSync(normDest, { recursive: true });

  const ext = path.extname(originalFilename);
  const base = path.basename(originalFilename, ext);

  let candidateName = originalFilename;
  let candidatePath = path.join(normDest, candidateName);

  let counter = 1;
  while (fs.existsSync(candidatePath)) {
    candidateName = `${base} (${counter})${ext}`;
    candidatePath = path.join(normDest, candidateName);
    counter++;
  }

  return [candidatePath, candidateName];
}
