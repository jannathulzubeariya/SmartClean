import { ScanStatus, DuplicateGroup, OrganizationRecommendation, CleanupSection, HistoryRecord, QuarantinedItem, ScannedFile } from '../types';

const API_BASE = '/api';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => null);
    if (!res.ok) {
      if (json && json.error) {
        return json as ApiResponse<T>;
      }
      return {
        success: false,
        error: {
          code: `HTTP_${res.status}`,
          message: res.status === 503 
            ? 'SmartClean backend is not running or still starting.' 
            : `Server returned status ${res.status}`,
        },
      };
    }
    return json as ApiResponse<T>;
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'SmartClean backend is not reachable. Ensure the server is running.',
        details: err?.message,
      },
    };
  }
}

export const api = {
  // Drives & Presets
  getDrives: () => request<{
    drives: any[];
    presets: any[];
    demo_available: boolean;
    demo_path: string | null;
    current_scope: string | null;
  }>('/drives'),

  // Scan Controls
  startScan: (scope: string) => request('/scan/start', {
    method: 'POST',
    body: JSON.stringify({ scope }),
  }),
  ingestFiles: (scopeName: string, files: any[]) => request('/scan/ingest', {
    method: 'POST',
    body: JSON.stringify({ scope_name: scopeName, files }),
  }),
  pauseScan: () => request('/scan/pause', { method: 'POST' }),
  resumeScan: () => request('/scan/resume', { method: 'POST' }),
  cancelScan: () => request('/scan/cancel', { method: 'POST' }),
  getScanStatus: () => request('/scan/status'),

  // Summary & Dashboard
  getSummary: () => request('/summary'),

  // Files & Details
  getFiles: (params: {
    type?: string;
    risk?: string;
    importance?: string;
    q?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_dir?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.risk) query.set('risk', params.risk);
    if (params.importance) query.set('importance', params.importance);
    if (params.q) query.set('q', params.q);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sort_by) query.set('sort_by', params.sort_by);
    if (params.sort_dir) query.set('sort_dir', params.sort_dir);
    return request(`/files?${query.toString()}`);
  },

  getFileDetails: (id: string) => request(`/files/${encodeURIComponent(id)}`),

  // Duplicates
  getDuplicates: () => request('/duplicates'),

  // Organize
  getOrganization: () => request('/organize'),

  // Cleanup
  getCleanup: () => request('/cleanup'),

  // Actions
  moveFiles: (moves: Array<{ file_id: string; destination_folder: string }>) => request('/actions/move', {
    method: 'POST',
    body: JSON.stringify({ moves }),
  }),

  quarantineFile: (fileIdOrPath: string, reason?: string) => request('/actions/quarantine', {
    method: 'POST',
    body: JSON.stringify({
      file_id: fileIdOrPath,
      file_path: fileIdOrPath,
      reason,
    }),
  }),

  deleteFile: (fileIdOrPath: string, confirmed: boolean = true) => request('/actions/delete', {
    method: 'POST',
    body: JSON.stringify({
      file_id: fileIdOrPath,
      file_path: fileIdOrPath,
      confirmed,
      permanent: true,
    }),
  }),

  restoreQuarantined: (quarantineId: string, destination?: string) => request('/actions/restore', {
    method: 'POST',
    body: JSON.stringify({
      quarantine_id: quarantineId,
      destination,
    }),
  }),

  undoAction: (actionId: string) => request('/actions/undo', {
    method: 'POST',
    body: JSON.stringify({ action_id: actionId }),
  }),

  // History
  getHistory: (limit: number = 100) => request(`/history?limit=${limit}`),

  // Quarantine list
  getQuarantineList: () => request('/quarantine'),
  deleteQuarantinedItem: (qId: string) => request(`/quarantine/${encodeURIComponent(qId)}/delete`, { method: 'POST' }),

  // Settings
  getSettings: () => request('/settings'),
  saveSettings: (settings: any) => request('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  // Demo generator
  generateDemo: () => request('/demo/generate', { method: 'POST' }),
};
