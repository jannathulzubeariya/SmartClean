import os
import json
import shutil
import time
import uuid
from ..config import QUARANTINE_DIR, MANIFEST_FILE
from ..utils.safe_path import normalize_path, safe_destination_filename
from ..utils.sizes import format_size
from ..utils.errors import AppError

def _load_manifest():
    if not os.path.exists(MANIFEST_FILE):
        return []
    try:
        with open(MANIFEST_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []

def _save_manifest(items):
    os.makedirs(os.path.dirname(MANIFEST_FILE), exist_ok=True)
    temp_file = MANIFEST_FILE + ".tmp"
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, MANIFEST_FILE)

def quarantine_file(file_path, reason="User initiated safe quarantine", metadata=None):
    """
    Moves file to the safe quarantine directory and logs it in the manifest.
    """
    norm_path = normalize_path(file_path)
    if not os.path.exists(norm_path):
        raise AppError("FILE_NOT_FOUND", f"File '{norm_path}' does not exist on disk", 404)

    if not os.path.isfile(norm_path):
        raise AppError("NOT_A_FILE", f"'{norm_path}' is a directory, not a regular file", 400)

    try:
        stat_info = os.stat(norm_path)
    except OSError as e:
        raise AppError("IO_ERROR", f"Unable to access file: {str(e)}", 500)

    q_id = f"q_{int(time.time())}_{uuid.uuid4().hex[:8]}"
    orig_filename = os.path.basename(norm_path)
    q_filename = f"{q_id}_{orig_filename}"
    q_target_path = os.path.join(QUARANTINE_DIR, q_filename)

    # Perform the move into quarantine
    try:
        shutil.move(norm_path, q_target_path)
    except (PermissionError, OSError) as e:
        raise AppError("QUARANTINE_FAILED", f"Could not move file to quarantine: {str(e)}", 500)

    meta = metadata or {}
    manifest_entry = {
        "id": q_id,
        "original_path": norm_path,
        "quarantine_filename": q_filename,
        "quarantine_path": q_target_path,
        "filename": orig_filename,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "size": stat_info.st_size,
        "size_formatted": format_size(stat_info.st_size),
        "category": meta.get("category", "Other / Unknown"),
        "importance_score": meta.get("importance_score", 30),
        "risk": meta.get("risk", "LOW"),
        "reason": reason,
        "status": "quarantined"
    }

    manifest = _load_manifest()
    manifest.append(manifest_entry)
    _save_manifest(manifest)

    return manifest_entry

def restore_quarantined_file(q_id, custom_destination=None):
    """
    Restores file from quarantine to original path (or custom destination).
    Never overwrites an existing file: uses safe collision rename if target exists.
    """
    manifest = _load_manifest()
    entry = next((item for item in manifest if item["id"] == q_id and item["status"] == "quarantined"), None)

    if not entry:
        raise AppError("QUARANTINE_ENTRY_NOT_FOUND", "Quarantined item not found or already restored", 404)

    q_path = entry["quarantine_path"]
    if not os.path.exists(q_path):
        raise AppError("QUARANTINE_FILE_MISSING", "Quarantined archive file is missing from disk", 404)

    target_dest_path = custom_destination or entry["original_path"]
    dest_folder = os.path.dirname(target_dest_path)
    orig_name = os.path.basename(entry["original_path"])

    os.makedirs(dest_folder, exist_ok=True)
    safe_dest_path, final_name = safe_destination_filename(dest_folder, orig_name)

    try:
        shutil.move(q_path, safe_dest_path)
    except (PermissionError, OSError) as e:
        raise AppError("RESTORE_FAILED", f"Could not restore file: {str(e)}", 500)

    entry["status"] = "restored"
    entry["restored_to"] = safe_dest_path
    entry["restored_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    _save_manifest(manifest)

    return {
        "restored_path": safe_dest_path,
        "final_filename": final_name,
        "had_collision": (final_name != orig_name),
        "entry": entry
    }

def delete_permanently_from_quarantine(q_id):
    """
    Permanently deletes a file that was previously isolated in quarantine.
    """
    manifest = _load_manifest()
    entry = next((item for item in manifest if item["id"] == q_id and item["status"] == "quarantined"), None)

    if not entry:
        raise AppError("QUARANTINE_ENTRY_NOT_FOUND", "Item not found in active quarantine", 404)

    q_path = entry["quarantine_path"]
    if os.path.exists(q_path):
        try:
            os.remove(q_path)
        except OSError as e:
            raise AppError("DELETE_FAILED", f"Could not permanently delete file: {str(e)}", 500)

    entry["status"] = "permanently_deleted"
    entry["deleted_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
    _save_manifest(manifest)

    return entry

def list_quarantined_files():
    manifest = _load_manifest()
    active_items = [item for item in manifest if item["status"] == "quarantined"]
    return active_items
