import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BASE_DIR = path.resolve(__dirname, '..');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS);
let resolvedDataDir = process.env.DATA_DIR || (isServerless ? path.join(os.tmpdir(), 'smartclean_data') : path.join(BASE_DIR, 'backend', 'data'));

try {
  fs.mkdirSync(resolvedDataDir, { recursive: true });
} catch {
  resolvedDataDir = path.join(os.tmpdir(), 'smartclean_data');
  fs.mkdirSync(resolvedDataDir, { recursive: true });
}

export const DATA_DIR = resolvedDataDir;
export const QUARANTINE_DIR = path.join(DATA_DIR, 'quarantine');
export const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const MANIFEST_FILE = path.join(QUARANTINE_DIR, 'manifest.json');
export const DEMO_DIR = path.join(BASE_DIR, 'SmartClean_Demo');

try {
  fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
} catch {}

export const IS_WINDOWS = process.platform === 'win32';

export const PROTECTED_PATHS: string[] = [
  // Windows
  'C:\\Windows',
  'C:\\Program Files',
  'C:\\Program Files (x86)',
  'C:\\ProgramData',
  'AppData\\Local\\Microsoft',
  'System Volume Information',
  '$Recycle.Bin',
  'pagefile.sys',
  'hiberfil.sys',
  'swapfile.sys',
  // Unix / Linux / macOS
  '/bin',
  '/sbin',
  '/usr/bin',
  '/usr/sbin',
  '/usr/lib',
  '/lib',
  '/lib64',
  '/etc',
  '/proc',
  '/sys',
  '/dev',
  '/boot',
  '/System',
  '/Library',
];

export const DEFAULT_SETTINGS = {
  collision_policy: 'rename', // "rename", "skip"
  duplicate_partial_kb: 64,
  max_history_entries: 500,
  auto_quarantine_before_delete: true,
  protected_extensions: ['.sys', '.dll', '.so', '.dylib', '.ini', '.inf'],
  importance_weights: {
    modified_recent_30d: 15,
    accessed_recent: 8,
    located_user_folder: 15,
    document_type: 12,
    meaningful_terms: 10,
    sole_copy: 15,
    related_files_dense: 10,
    referenced_detectable: 8,
    large_for_type: 7,
    old_installer_duplicate_penalty: -15,
  },
};
