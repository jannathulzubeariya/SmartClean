export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ImportanceLabel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScannedFile {
  id: string;
  path: string;
  filename: string;
  size: number;
  size_formatted: string;
  mtime: number;
  atime: number;
  mtime_formatted: string;
  category: string;
  ext: string;
  importance_score?: number;
  importance_label?: ImportanceLabel;
  importance_guidance?: string;
  importance_recommendation?: string;
  importance_reasons?: string[];
  can_permanently_delete?: boolean;
  risk?: RiskLevel;
  sha256?: string;
}

export interface DuplicateGroup {
  group_id: string;
  hash: string;
  file_size: number;
  file_size_formatted: string;
  reclaimable_bytes: number;
  reclaimable_formatted: string;
  suggested_keeper_id: string;
  copies_count: number;
  copies: ScannedFile[];
}

export interface OrganizationRecommendation {
  file_id: string;
  filename: string;
  current_path: string;
  current_folder: string;
  suggested_folder: string;
  suggested_folder_path: string;
  proposed_target_path: string;
  has_collision: boolean;
  collision_preview_name: string;
  category: string;
  size: number;
  size_formatted: string;
  importance_score: number;
  importance_label: ImportanceLabel;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
  status: 'pending' | 'moved' | 'ignored' | 'kept';
}

export interface CleanupItem {
  id: string;
  filename: string;
  path: string;
  size: number;
  size_formatted: string;
  reason: string;
  risk: RiskLevel;
  importance_score: number;
  suggested_action: 'quarantine' | 'review';
}

export interface CleanupSection {
  key: string;
  title: string;
  risk: RiskLevel;
  description: string;
  safe_action: string;
  count: number;
  total_bytes: number;
  total_formatted: string;
  items: CleanupItem[];
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  action_type: 'move' | 'quarantine' | 'restore' | 'delete' | 'undo';
  source: string;
  destination: string | null;
  filename: string;
  file_size: number;
  file_size_formatted: string;
  status: 'success' | 'failed';
  reason: string;
  undoable: boolean;
  undone: boolean;
  undo_payload: any;
}

export interface QuarantinedItem {
  id: string;
  original_path: string;
  quarantine_filename: string;
  quarantine_path: string;
  filename: string;
  timestamp: string;
  size: number;
  size_formatted: string;
  category: string;
  importance_score: number;
  risk: RiskLevel;
  reason: string;
  status: 'quarantined' | 'restored' | 'permanently_deleted';
  restored_to?: string;
  restored_at?: string;
  deleted_at?: string;
}
