import os
import time
import threading
import uuid
from collections import defaultdict
from ..utils.safe_path import normalize_path, is_protected
from ..utils.sizes import format_size
from ..utils.errors import AppError
from .file_classifier import classify_file
from .duplicate_detector import detect_duplicates
from .importance_analyzer import analyze_importance
from .organization_engine import generate_organization_recommendations
from .cleanup_engine import analyze_cleanup_candidates
from .storage_analyzer import analyze_storage

class FilesystemScanner:
    def __init__(self):
        self.lock = threading.Lock()
        self.pause_event = threading.Event()
        self.pause_event.set()  # Not paused initially
        self.cancel_event = threading.Event()
        
        self.thread = None
        self.status = "idle"  # idle, scanning, paused, completed, cancelled, error
        self.scope = None
        self.current_path = ""
        self.files_scanned = 0
        self.folders_scanned = 0
        self.skipped_count = 0
        self.errors = []
        self.start_time = 0
        self.elapsed_seconds = 0
        
        # Results cache
        self.scanned_files = []
        self.files_by_id = {}
        self.duplicates_result = {"groups": [], "total_groups": 0, "total_duplicate_files": 0, "total_reclaimable_bytes": 0, "total_reclaimable_formatted": "0 B"}
        self.organization_result = []
        self.cleanup_result = {"sections": [], "total_candidates": 0, "safe_reclaimable_bytes": 0, "safe_reclaimable_formatted": "0 B"}
        self.storage_result = {}

    def get_status(self):
        with self.lock:
            elapsed = time.time() - self.start_time if self.status in ["scanning", "paused"] else self.elapsed_seconds
            return {
                "status": self.status,
                "scope": self.scope,
                "current_path": self.current_path,
                "files_scanned": self.files_scanned,
                "folders_scanned": self.folders_scanned,
                "skipped_count": self.skipped_count,
                "elapsed_seconds": round(elapsed, 1),
                "error_count": len(self.errors),
                "errors": self.errors[-10:]  # Recent errors
            }

    def start_scan(self, scope_path):
        with self.lock:
            if self.status == "scanning":
                raise AppError("SCAN_IN_PROGRESS", "A scan is already actively running", 400)

            norm_scope = normalize_path(scope_path)
            if not os.path.exists(norm_scope):
                raise AppError("DIR_NOT_FOUND", f"Directory '{norm_scope}' does not exist", 404)
            if not os.path.isdir(norm_scope):
                raise AppError("NOT_A_DIR", f"Path '{norm_scope}' is not a directory", 400)

            protected, reason = is_protected(norm_scope)
            if protected:
                raise AppError("PROTECTED_PATH", f"Cannot scan protected location: {reason}", 403)

            # Reset state
            self.scope = norm_scope
            self.status = "scanning"
            self.files_scanned = 0
            self.folders_scanned = 0
            self.skipped_count = 0
            self.errors = []
            self.current_path = norm_scope
            self.start_time = time.time()
            self.elapsed_seconds = 0
            
            self.pause_event.set()
            self.cancel_event.clear()

            self.thread = threading.Thread(target=self._run_scan_thread, daemon=True)
            self.thread.start()

            return {
                "status": "scanning",
                "scope": self.scope,
                "message": f"Scan started for {self.scope}"
            }

    def pause_scan(self):
        with self.lock:
            if self.status != "scanning":
                return {"status": self.status, "message": "Scan is not actively running"}
            self.pause_event.clear()
            self.status = "paused"
            return {"status": "paused", "message": "Scan paused"}

    def resume_scan(self):
        with self.lock:
            if self.status != "paused":
                return {"status": self.status, "message": "Scan is not paused"}
            self.pause_event.set()
            self.status = "scanning"
            return {"status": "scanning", "message": "Scan resumed"}

    def cancel_scan(self):
        with self.lock:
            if self.status not in ["scanning", "paused"]:
                return {"status": self.status, "message": "No scan to cancel"}
            self.cancel_event.set()
            self.pause_event.set()  # Unblock if paused
            self.status = "cancelled"
            return {"status": "cancelled", "message": "Scan cancellation requested"}

    def _run_scan_thread(self):
        discovered_raw = []
        stack = [self.scope]
        
        while stack and not self.cancel_event.is_set():
            # Check pause
            self.pause_event.wait()
            if self.cancel_event.is_set():
                break

            current_dir = stack.pop()
            
            with self.lock:
                self.current_path = current_dir
                self.folders_scanned += 1

            # Skip protected directories
            protected, reason = is_protected(current_dir)
            if protected and current_dir != self.scope:
                with self.lock:
                    self.skipped_count += 1
                    self.errors.append({"path": current_dir, "reason": reason})
                continue

            try:
                with os.scandir(current_dir) as entries:
                    for entry in entries:
                        if self.cancel_event.is_set():
                            break
                        self.pause_event.wait()

                        try:
                            # Skip symlinks for safety
                            if entry.is_symlink():
                                with self.lock:
                                    self.skipped_count += 1
                                    self.errors.append({"path": entry.path, "reason": "Skipped symbolic link"})
                                continue

                            if entry.is_dir(follow_symlinks=False):
                                stack.append(entry.path)
                            elif entry.is_file(follow_symlinks=False):
                                stat_res = entry.stat(follow_symlinks=False)
                                file_id = f"f_{uuid.uuid4().hex[:10]}"
                                category, ext = classify_file(entry.path, entry.name)

                                item = {
                                    "id": file_id,
                                    "path": entry.path,
                                    "filename": entry.name,
                                    "size": stat_res.st_size,
                                    "size_formatted": format_size(stat_res.st_size),
                                    "mtime": stat_res.st_mtime,
                                    "atime": getattr(stat_res, 'st_atime', stat_res.st_mtime),
                                    "mtime_formatted": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat_res.st_mtime)),
                                    "category": category,
                                    "ext": ext
                                }
                                discovered_raw.append(item)
                                with self.lock:
                                    self.files_scanned += 1
                        except (PermissionError, OSError) as e:
                            with self.lock:
                                self.skipped_count += 1
                                self.errors.append({"path": entry.path, "reason": f"Access denied: {str(e)}"})
            except (PermissionError, OSError) as e:
                with self.lock:
                    self.skipped_count += 1
                    self.errors.append({"path": current_dir, "reason": f"Directory unreadable: {str(e)}"})

        # If cancelled, wrap up early
        if self.cancel_event.is_set():
            with self.lock:
                self.status = "cancelled"
                self.elapsed_seconds = time.time() - self.start_time
            return

        # Perform Post-Scan Analysis Pipeline
        self._analyze_scanned_files(discovered_raw)

    def _analyze_scanned_files(self, files_list):
        # 1. Folder file count map
        folder_counts = defaultdict(int)
        for f in files_list:
            folder_counts[os.path.dirname(f['path'])] += 1

        # 2. Duplicate Detection (Size -> Partial Hash -> Full SHA-256)
        duplicates = detect_duplicates(files_list)
        
        # Build hash frequency map for importance engine
        duplicate_hashes = defaultdict(int)
        for grp in duplicates["groups"]:
            for copy in grp["copies"]:
                if "sha256" in copy:
                    duplicate_hashes[copy["sha256"]] += 1

        # 3. Transparent Importance Analysis
        for f in files_list:
            imp = analyze_importance(f, folder_counts, duplicate_hashes)
            f["importance_score"] = imp["score"]
            f["importance_label"] = imp["label"]
            f["importance_guidance"] = imp["guidance"]
            f["importance_recommendation"] = imp["recommendation"]
            f["can_permanently_delete"] = imp["can_permanently_delete"]
            f["importance_reasons"] = imp["reasons"]
            
            # Risk estimation
            if imp["score"] >= 70:
                f["risk"] = "HIGH"
            elif f["category"] in ["Temporary", "Logs"]:
                f["risk"] = "LOW"
            elif grp_found := any(f["id"] in [c["id"] for c in g["copies"] if c["id"] != g["suggested_keeper_id"]] for g in duplicates["groups"]):
                f["risk"] = "MEDIUM"
            elif f["category"] in ["Installers"]:
                f["risk"] = "MEDIUM"
            else:
                f["risk"] = "HIGH" if imp["score"] >= 50 else "MEDIUM"

        # 4. Organization Engine (Misplaced-file recommendations)
        org_recs = generate_organization_recommendations(files_list, self.scope)

        # 5. Cleanup Engine (Safe cleanup candidates by risk)
        cleanup_res = analyze_cleanup_candidates(files_list, duplicates["groups"])

        # 6. Storage Analysis (shutil.disk_usage + category breakdowns)
        storage_res = analyze_storage(
            self.scope,
            files_list,
            duplicate_reclaimable_bytes=duplicates["total_reclaimable_bytes"],
            cleanup_reclaimable_bytes=cleanup_res["safe_reclaimable_bytes"]
        )

        with self.lock:
            self.scanned_files = files_list
            self.files_by_id = {f["id"]: f for f in files_list}
            self.duplicates_result = duplicates
            self.organization_result = org_recs
            self.cleanup_result = cleanup_res
            self.storage_result = storage_res
            self.status = "completed"
            self.elapsed_seconds = time.time() - self.start_time

    def remove_file_from_cache(self, file_path_or_id):
        """Called when a file is moved, quarantined, or deleted to update state."""
        with self.lock:
            target = None
            if file_path_or_id in self.files_by_id:
                target = self.files_by_id[file_path_or_id]
            else:
                target = next((f for f in self.scanned_files if f['path'] == file_path_or_id), None)

            if target:
                self.scanned_files = [f for f in self.scanned_files if f['id'] != target['id']]
                self.files_by_id.pop(target['id'], None)
                # Filter organization
                self.organization_result = [r for r in self.organization_result if r['file_id'] != target['id']]
                # Filter cleanup
                for sec in self.cleanup_result.get('sections', []):
                    sec['items'] = [it for it in sec.get('items', []) if it['id'] != target['id']]
                    sec['count'] = len(sec['items'])
                # Filter duplicates
                for grp in self.duplicates_result.get('groups', []):
                    grp['copies'] = [c for c in grp.get('copies', []) if c['id'] != target['id']]
                    grp['copies_count'] = len(grp['copies'])
                self.duplicates_result['groups'] = [g for g in self.duplicates_result.get('groups', []) if g['copies_count'] >= 2]
                self.duplicates_result['total_groups'] = len(self.duplicates_result['groups'])

    def ingest_client_files(self, scope_name, client_files):
        """Processes client-provided files from browser directory/file picker."""
        processed_files = []
        for cf in client_files:
            file_id = cf.get("id") or f"f_{uuid.uuid4().hex[:12]}"
            filename = cf.get("filename") or os.path.basename(cf.get("path", "file"))
            size = int(cf.get("size") or 0)
            ext = cf.get("ext") or os.path.splitext(filename)[1].lower()
            category = cf.get("category") or classify_file(filename, ext)

            f_record = {
                "id": file_id,
                "filename": filename,
                "path": cf.get("path") or filename,
                "relative_path": cf.get("path") or filename,
                "display_path": cf.get("path") or filename,
                "size": size,
                "size_formatted": format_size(size),
                "ext": ext,
                "category": category,
                "mtime": cf.get("mtime") or time.time(),
                "atime": cf.get("atime") or time.time(),
                "mtime_formatted": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cf.get("mtime") or time.time())),
                "sha256": cf.get("sha256"),
                "is_client_file": True
            }
            processed_files.append(f_record)

        duplicates = detect_duplicates(processed_files, fast_mode=True)
        for f in processed_files:
            imp = analyze_importance(f, processed_files, duplicates["groups"])
            f["importance_score"] = imp["score"]
            f["importance_label"] = imp["label"]
            f["importance_guidance"] = imp["guidance"]
            f["importance_recommendation"] = imp["recommendation"]
            f["can_permanently_delete"] = imp["can_permanently_delete"]
            f["importance_reasons"] = imp["reasons"]

            if imp["score"] >= 70:
                f["risk"] = "HIGH"
            elif f["category"] in ["Temporary", "Logs"]:
                f["risk"] = "LOW"
            elif any(f["id"] in [c["id"] for c in g["copies"] if c["id"] != g["suggested_keeper_id"]] for g in duplicates["groups"]):
                f["risk"] = "MEDIUM"
            elif f["category"] in ["Installers"]:
                f["risk"] = "MEDIUM"
            else:
                f["risk"] = "HIGH" if imp["score"] >= 50 else "MEDIUM"

        org_recs = generate_organization_recommendations(processed_files, scope_name)
        cleanup_res = analyze_cleanup_candidates(processed_files, duplicates["groups"])
        storage_res = analyze_storage(
            scope_name,
            processed_files,
            duplicate_reclaimable_bytes=duplicates["total_reclaimable_bytes"],
            cleanup_reclaimable_bytes=cleanup_res["safe_reclaimable_bytes"]
        )

        with self.lock:
            self.scope = scope_name
            self.scanned_files = processed_files
            self.files_by_id = {f["id"]: f for f in processed_files}
            self.duplicates_result = duplicates
            self.organization_result = org_recs
            self.cleanup_result = cleanup_res
            self.storage_result = storage_res
            self.status = "completed"
            self.files_scanned = len(processed_files)
            self.folders_scanned = len(set(f["path"].split("/")[0] for f in processed_files if "/" in f["path"]))
            self.elapsed_seconds = 1.0

        return {
            "total_files": len(processed_files),
            "duplicates": len(duplicates["groups"]),
            "recommendations": len(org_recs),
            "cleanup_candidates": cleanup_res["total_candidates"]
        }
