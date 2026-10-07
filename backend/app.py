import os
import sys
import json
import platform
import shutil
import re
from flask import Flask, request, jsonify
from flask_cors import CORS

try:
    from .config import DATA_DIR, SETTINGS_FILE, DEFAULT_SETTINGS, IS_WINDOWS
    from .utils.errors import AppError, make_success
    from .utils.safe_path import normalize_path, verify_path_in_scope, is_protected, safe_destination_filename
    from .utils.sizes import format_size
    from .modules.scanner import FilesystemScanner
    from .modules.quarantine_manager import (
        quarantine_file,
        restore_quarantined_file,
        delete_permanently_from_quarantine,
        list_quarantined_files
    )
    from .modules.history_manager import log_action, get_history, undo_action
    from .demo.generate_demo import create_demo_workspace
except (ImportError, ValueError):
    from config import DATA_DIR, SETTINGS_FILE, DEFAULT_SETTINGS, IS_WINDOWS
    from utils.errors import AppError, make_success
    from utils.safe_path import normalize_path, verify_path_in_scope, is_protected, safe_destination_filename
    from utils.sizes import format_size
    from modules.scanner import FilesystemScanner
    from modules.quarantine_manager import (
        quarantine_file,
        restore_quarantined_file,
        delete_permanently_from_quarantine,
        list_quarantined_files
    )
    from modules.history_manager import log_action, get_history, undo_action
    from demo.generate_demo import create_demo_workspace

app = Flask(__name__)
# Enable CORS for localhost frontend origins (Vite dev servers)
CORS(app, resources={r"/api/*": {"origins": "*"}})

scanner = FilesystemScanner()

def _load_settings():
    if not os.path.exists(SETTINGS_FILE):
        return DEFAULT_SETTINGS.copy()
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            merged = DEFAULT_SETTINGS.copy()
            merged.update(data)
            return merged
    except (json.JSONDecodeError, OSError):
        return DEFAULT_SETTINGS.copy()

def _save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2)

@app.errorhandler(AppError)
def handle_app_error(e):
    return jsonify(e.to_dict()), e.status_code

@app.errorhandler(404)
def handle_not_found(e):
    return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "API endpoint not found"}}), 404

@app.errorhandler(500)
def handle_server_error(e):
    return jsonify({"success": False, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected server error occurred"}}), 500

@app.route('/api/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "SmartClean API", "engine": "Flask"})

# ----------------- DRIVES & SCOPES -----------------

@app.route('/api/drives', methods=['GET'])
def get_drives():
    drives = []
    user_home = os.path.expanduser("~")

    # Detect drives on Windows
    if IS_WINDOWS:
        import string
        for letter in string.ascii_uppercase:
            drive_path = f"{letter}:\\"
            if os.path.exists(drive_path):
                try:
                    total, used, free = shutil.disk_usage(drive_path)
                    drives.append({
                        "name": f"Local Disk ({letter}:)",
                        "path": drive_path,
                        "type": "drive",
                        "total_formatted": format_size(total),
                        "free_formatted": format_size(free),
                        "used_percent": round((used / total) * 100, 1) if total > 0 else 0
                    })
                except (OSError, PermissionError):
                    drives.append({
                        "name": f"Local Disk ({letter}:)",
                        "path": drive_path,
                        "type": "drive"
                    })
    else:
        # Linux / macOS root
        try:
            total, used, free = shutil.disk_usage("/")
            drives.append({
                "name": "System Root (/)",
                "path": "/",
                "type": "drive",
                "total_formatted": format_size(total),
                "free_formatted": format_size(free),
                "used_percent": round((used / total) * 100, 1) if total > 0 else 0
            })
        except (OSError, PermissionError):
            pass

    # Common user folder presets
    user_presets = [
        {"name": "Home Folder", "path": user_home, "type": "preset"},
        {"name": "Desktop", "path": os.path.join(user_home, "Desktop"), "type": "preset"},
        {"name": "Documents", "path": os.path.join(user_home, "Documents"), "type": "preset"},
        {"name": "Downloads", "path": os.path.join(user_home, "Downloads"), "type": "preset"},
        {"name": "Pictures", "path": os.path.join(user_home, "Pictures"), "type": "preset"},
    ]

    valid_presets = [p for p in user_presets if os.path.exists(p["path"])]

    # Check for SmartClean_Demo workspace
    demo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "SmartClean_Demo"))
    demo_exists = os.path.exists(demo_path)

    return jsonify(make_success({
        "drives": drives,
        "presets": valid_presets,
        "demo_available": demo_exists,
        "demo_path": demo_path if demo_exists else None,
        "current_scope": scanner.scope
    }))

# ----------------- SCAN CONTROLS -----------------

@app.route('/api/scan/start', methods=['POST'])
def start_scan():
    data = request.get_json(silent=True) or {}
    scope = data.get('scope')

    if not scope:
        raise AppError("MISSING_SCOPE", "Target scan directory path is required", 400)

    # Guard against sending Windows client paths (e.g. C:\Users\...) to a remote Linux server
    if not IS_WINDOWS and (
        bool(re.match(r'^[a-zA-Z]:[/\\]', scope)) or
        scope.startswith('/Users/') or
        (scope.startswith('/home/') and not os.path.exists(scope))
    ):
        raise AppError(
            "REMOTE_CLIENT_PATH_ERROR",
            f"The path '{scope}' appears to be a client device path. A remote server cannot access your local device disk directly. Please use 'Choose Folder on this Device' in the Location Picker so your browser can provide file access.",
            400
        )

    result = scanner.start_scan(scope)
    return jsonify(make_success(result, "Scan initiated successfully"))

@app.route('/api/scan/ingest', methods=['POST'])
def ingest_files():
    data = request.get_json(silent=True) or {}
    files = data.get('files', [])
    scope_name = data.get('scope_name', 'Selected Folder')
    if not files:
        raise AppError("MISSING_FILES", "No client files provided for ingestion", 400)
    result = scanner.ingest_client_files(scope_name, files)
    return jsonify(make_success(result, f"Successfully analyzed {len(files)} files"))

@app.route('/api/scan/pause', methods=['POST'])
def pause_scan():
    res = scanner.pause_scan()
    return jsonify(make_success(res))

@app.route('/api/scan/resume', methods=['POST'])
def resume_scan():
    res = scanner.resume_scan()
    return jsonify(make_success(res))

@app.route('/api/scan/cancel', methods=['POST'])
def cancel_scan():
    res = scanner.cancel_scan()
    return jsonify(make_success(res))

@app.route('/api/scan/status', methods=['GET'])
def get_scan_status():
    status = scanner.get_status()
    return jsonify(make_success(status))

# ----------------- SUMMARY & DASHBOARD -----------------

@app.route('/api/summary', methods=['GET'])
def get_summary():
    status = scanner.get_status()
    
    # If no scan has been performed yet
    if not scanner.scanned_files and status["status"] != "completed":
        return jsonify(make_success({
            "has_scanned": False,
            "status": status["status"],
            "scope": scanner.scope,
            "total_files": 0,
            "total_storage_formatted": "0 B",
            "used_storage_formatted": "0 B",
            "free_storage_formatted": "0 B",
            "reclaimable_storage_formatted": "0 B",
            "duplicate_count": 0,
            "temporary_files_count": 0,
            "misplaced_files_count": 0,
            "important_files_count": 0,
            "categories": [],
            "top_folders": []
        }))

    # Calculate counts
    temp_count = sum(1 for f in scanner.scanned_files if f.get('category') == 'Temporary')
    important_count = sum(1 for f in scanner.scanned_files if f.get('importance_score', 0) >= 70)
    misplaced_count = len(scanner.organization_result)
    dup_count = scanner.duplicates_result.get('total_duplicate_files', 0)

    storage = scanner.storage_result.get('disk', {})
    
    dup_reclaimable_fmt = scanner.duplicates_result.get("reclaimable_formatted", "0 B")
    clean_reclaimable_fmt = scanner.cleanup_result.get("reclaimable_formatted", "0 B")
    cleanup_total_items = scanner.cleanup_result.get("total_candidates", 0)

    return jsonify(make_success({
        "has_scanned": True,
        "status": status["status"],
        "scope": scanner.scope,
        "total_files": len(scanner.scanned_files),
        "scanned_files_count": len(scanner.scanned_files),
        "total_storage_formatted": storage.get("total_formatted", "0 B"),
        "used_storage_formatted": storage.get("used_formatted", "0 B"),
        "free_storage_formatted": storage.get("free_formatted", "0 B"),
        "percent_used": storage.get("percent_used", 0),
        "reclaimable_bytes": scanner.storage_result.get("reclaimable_bytes", 0),
        "reclaimable_storage_formatted": scanner.storage_result.get("reclaimable_formatted", "0 B"),
        "duplicate_count": dup_count,
        "duplicates_count": dup_count,
        "duplicate_reclaimable_formatted": dup_reclaimable_fmt,
        "cleanup_count": cleanup_total_items,
        "cleanup_reclaimable_formatted": clean_reclaimable_fmt,
        "temporary_files_count": temp_count,
        "misplaced_files_count": misplaced_count,
        "misplaced_count": misplaced_count,
        "important_files_count": important_count,
        "important_count": important_count,
        "categories": scanner.storage_result.get("categories", []),
        "top_folders": scanner.storage_result.get("top_folders", []),
        "safe_cleanup_summary": {
            "total_candidates": cleanup_total_items,
            "safe_reclaimable_formatted": clean_reclaimable_fmt
        }
    }))

# ----------------- FILES LIST & DETAILS -----------------

@app.route('/api/files', methods=['GET'])
def get_files():
    # Filtering parameters
    cat_filter = request.args.get('type')
    risk_filter = request.args.get('risk')
    importance_filter = request.args.get('importance')
    query = request.args.get('q', '').strip().lower()
    
    # Pagination
    page = max(1, int(request.args.get('page', 1)))
    limit = min(200, max(10, int(request.args.get('limit', 50))))
    
    # Sorting
    sort_by = request.args.get('sort_by', 'size')
    sort_dir = request.args.get('sort_dir', 'desc')

    filtered = scanner.scanned_files

    if cat_filter and cat_filter != 'all':
        filtered = [f for f in filtered if f.get('category') == cat_filter]

    if risk_filter and risk_filter != 'all':
        filtered = [f for f in filtered if f.get('risk') == risk_filter]

    if importance_filter and importance_filter != 'all':
        filtered = [f for f in filtered if f.get('importance_label') == importance_filter]

    if query:
        filtered = [f for f in filtered if query in f.get('filename', '').lower() or query in f.get('path', '').lower()]

    # Sort
    reverse = (sort_dir == 'desc')
    if sort_by == 'size':
        filtered.sort(key=lambda x: x.get('size', 0), reverse=reverse)
    elif sort_by == 'mtime':
        filtered.sort(key=lambda x: x.get('mtime', 0), reverse=reverse)
    elif sort_by == 'name':
        filtered.sort(key=lambda x: x.get('filename', '').lower(), reverse=reverse)
    elif sort_by == 'importance':
        filtered.sort(key=lambda x: x.get('importance_score', 0), reverse=reverse)

    total_count = len(filtered)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_items = filtered[start_idx:end_idx]

    return jsonify(make_success({
        "items": page_items,
        "files": page_items,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit if total_count > 0 else 1
    }))

@app.route('/api/files/<file_id>', methods=['GET'])
def get_file_details(file_id):
    file_info = scanner.files_by_id.get(file_id)
    if not file_info:
        raise AppError("FILE_NOT_FOUND", "File record not found in current scan session", 404)

    # Check live existence
    file_exists = os.path.exists(file_info['path'])
    
    # Find duplicate association
    dup_group = next((g for g in scanner.duplicates_result.get("groups", []) if any(c['id'] == file_id for c in g['copies'])), None)
    
    # Find organization recommendation
    org_rec = next((r for r in scanner.organization_result if r['file_id'] == file_id), None)

    return jsonify(make_success({
        **file_info,
        "exists_on_disk": file_exists,
        "duplicate_group": dup_group,
        "organization_recommendation": org_rec
    }))

# ----------------- DUPLICATES -----------------

@app.route('/api/duplicates', methods=['GET'])
def get_duplicates():
    return jsonify(make_success(scanner.duplicates_result))

# ----------------- ORGANIZATION -----------------

@app.route('/api/organize', methods=['GET'])
def get_organization():
    return jsonify(make_success({
        "recommendations": scanner.organization_result,
        "total_count": len(scanner.organization_result)
    }))

# ----------------- CLEANUP -----------------

@app.route('/api/cleanup', methods=['GET'])
def get_cleanup():
    return jsonify(make_success(scanner.cleanup_result))

# ----------------- ACTIONS (MOVE, QUARANTINE, DELETE, RESTORE, UNDO) -----------------

@app.route('/api/actions/move', methods=['POST'])
def action_move():
    data = request.get_json(silent=True) or {}
    moves = data.get('moves', [])
    
    # Single move support
    if not moves and data.get('file_id') and data.get('destination_folder'):
        moves = [{
            "file_id": data.get('file_id'),
            "destination_folder": data.get('destination_folder')
        }]

    if not moves:
        raise AppError("MISSING_DATA", "At least one move instruction must be supplied", 400)

    results = []
    for item in moves:
        file_id = item.get('file_id')
        dest_folder = item.get('destination_folder')

        file_info = scanner.files_by_id.get(file_id)
        if not file_info:
            results.append({"file_id": file_id, "success": False, "error": "File not found in scan"})
            continue

        src_path = file_info['path']
        if not os.path.exists(src_path):
            results.append({"file_id": file_id, "success": False, "error": "Source file no longer exists on disk"})
            continue

        try:
            # Check destination safe
            dest_folder = normalize_path(dest_folder)
            os.makedirs(dest_folder, exist_ok=True)
            safe_dest, final_name = safe_destination_filename(dest_folder, file_info['filename'])

            shutil.move(src_path, safe_dest)
            
            # Log action
            record = log_action(
                action_type="move",
                source=src_path,
                destination=safe_dest,
                filename=final_name,
                file_size=file_info['size'],
                status="success",
                reason=f"Organized to {dest_folder}",
                undoable=True,
                undo_payload={"original_source": src_path, "destination": safe_dest}
            )

            # Update scanner state
            scanner.remove_file_from_cache(file_id)

            results.append({
                "file_id": file_id,
                "success": True,
                "original_path": src_path,
                "new_path": safe_dest,
                "final_filename": final_name,
                "action_id": record["id"]
            })
        except Exception as e:
            results.append({"file_id": file_id, "success": False, "error": str(e)})

    return jsonify(make_success({"results": results}, f"Processed {len(results)} move operations"))

@app.route('/api/actions/quarantine', methods=['POST'])
def action_quarantine():
    data = request.get_json(silent=True) or {}
    file_id = data.get('file_id')
    file_path = data.get('file_path')
    reason = data.get('reason', 'User initiated safe quarantine')

    target_path = None
    file_info = None

    if file_id and file_id in scanner.files_by_id:
        file_info = scanner.files_by_id[file_id]
        target_path = file_info['path']
    elif file_path and any(f['path'] == file_path for f in scanner.scanned_files):
        target_path = file_path
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_path), None)
    elif file_path and os.path.exists(file_path):
        target_path = file_path
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_path), None)
    elif file_id and (os.path.exists(file_id) or '/' in file_id or '\\' in file_id):
        target_path = file_id
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_id), None)

    if not target_path:
        raise AppError("MISSING_FILE", "A valid file ID or path must be supplied for quarantine", 400)

    # Perform quarantine
    entry = quarantine_file(
        target_path,
        reason=reason,
        metadata=file_info
    )

    # Log to history
    record = log_action(
        action_type="quarantine",
        source=target_path,
        destination=entry["quarantine_path"],
        filename=entry["filename"],
        file_size=entry["size"],
        status="success",
        reason=reason,
        undoable=True,
        undo_payload={"quarantine_id": entry["id"]}
    )

    # Remove from active scanner cache
    scanner.remove_file_from_cache(target_path)

    return jsonify(make_success({
        "quarantine_entry": entry,
        "action_id": record["id"]
    }, f"File '{entry['filename']}' safely moved to quarantine"))

@app.route('/api/actions/delete', methods=['POST'])
def action_delete():
    data = request.get_json(silent=True) or {}
    file_id = data.get('file_id')
    file_path = data.get('file_path')
    confirmed = data.get('confirmed', False)
    permanent = data.get('permanent', False)

    if not confirmed:
        raise AppError("CONFIRMATION_REQUIRED", "Permanent deletion requires explicit user confirmation", 400)

    target_path = None
    file_info = None

    if file_id and file_id in scanner.files_by_id:
        file_info = scanner.files_by_id[file_id]
        target_path = file_info['path']
    elif file_path and any(f['path'] == file_path for f in scanner.scanned_files):
        target_path = file_path
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_path), None)
    elif file_path and os.path.exists(file_path):
        target_path = file_path
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_path), None)
    elif file_id and (os.path.exists(file_id) or '/' in file_id or '\\' in file_id):
        target_path = file_id
        file_info = next((f for f in scanner.scanned_files if f['path'] == file_id), None)

    if not target_path:
        raise AppError("MISSING_FILE", "File record not found", 404)

    # Safety checks: Never delete high importance files
    if file_info and file_info.get('importance_score', 0) >= 70:
        raise AppError("HIGH_IMPORTANCE_PROTECTED", "This file is rated High Importance. Permanent deletion is disabled to prevent accidental data loss.", 403)

    # Check protected path
    protected, reason = is_protected(target_path)
    if protected:
        raise AppError("PROTECTED_PATH", f"Cannot delete system path: {reason}", 403)

    if not os.path.exists(target_path):
        raise AppError("FILE_NOT_FOUND", "The file no longer exists on disk", 404)

    # Delete permanently
    try:
        size = os.path.getsize(target_path)
        os.remove(target_path)
    except Exception as e:
        raise AppError("DELETE_FAILED", f"Failed to delete file: {str(e)}", 500)

    log_action(
        action_type="delete",
        source=target_path,
        destination=None,
        filename=os.path.basename(target_path),
        file_size=size,
        status="success",
        reason="Permanently deleted after explicit user confirmation",
        undoable=False
    )

    scanner.remove_file_from_cache(target_path)

    return jsonify(make_success({
        "deleted_path": target_path
    }, f"File '{os.path.basename(target_path)}' permanently deleted"))

@app.route('/api/actions/restore', methods=['POST'])
def action_restore():
    data = request.get_json(silent=True) or {}
    q_id = data.get('quarantine_id')
    dest = data.get('destination')

    if not q_id:
        raise AppError("MISSING_QUARANTINE_ID", "Quarantine entry ID is required", 400)

    res = restore_quarantined_file(q_id, dest)

    log_action(
        action_type="restore",
        source=f"quarantine:{q_id}",
        destination=res["restored_path"],
        filename=res["final_filename"],
        file_size=res["entry"]["size"],
        status="success",
        reason="Restored from quarantine",
        undoable=False
    )

    return jsonify(make_success(res, f"File successfully restored to '{res['restored_path']}'"))

@app.route('/api/actions/undo', methods=['POST'])
def action_undo():
    data = request.get_json(silent=True) or {}
    action_id = data.get('action_id')

    if not action_id:
        raise AppError("MISSING_ACTION_ID", "Action ID to undo is required", 400)

    res = undo_action(action_id)
    return jsonify(make_success(res, res.get("message", "Action reverted successfully")))

# ----------------- QUARANTINE LIST -----------------

@app.route('/api/quarantine', methods=['GET'])
def get_quarantine():
    items = list_quarantined_files()
    total_bytes = sum(it.get('size', 0) for it in items)
    return jsonify(make_success({
        "items": items,
        "count": len(items),
        "total_bytes": total_bytes,
        "total_formatted": format_size(total_bytes)
    }))

@app.route('/api/quarantine/<q_id>/delete', methods=['POST'])
def delete_quarantine_item(q_id):
    entry = delete_permanently_from_quarantine(q_id)
    log_action(
        action_type="delete",
        source=f"quarantine:{q_id}",
        destination=None,
        filename=entry["filename"],
        file_size=entry["size"],
        status="success",
        reason="Permanently deleted from quarantine manifest",
        undoable=False
    )
    return jsonify(make_success(entry, f"Quarantined item '{entry['filename']}' permanently deleted"))

# ----------------- HISTORY -----------------

@app.route('/api/history', methods=['GET'])
def api_get_history():
    limit = int(request.args.get('limit', 100))
    items = get_history(limit)
    return jsonify(make_success({
        "history": items,
        "count": len(items)
    }))

# ----------------- SETTINGS -----------------

@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    settings = _load_settings()
    return jsonify(make_success(settings))

@app.route('/api/settings', methods=['POST'])
def api_save_settings():
    data = request.get_json(silent=True) or {}
    current = _load_settings()
    current.update(data)
    _save_settings(current)
    return jsonify(make_success(current, "Settings updated successfully"))

# ----------------- DEMO GENERATOR -----------------

@app.route('/api/demo/generate', methods=['POST'])
def api_generate_demo():
    result = create_demo_workspace()
    
    # Auto-start scan of demo workspace immediately
    scan_res = scanner.start_scan(result["demo_dir"])

    return jsonify(make_success({
        "demo": result,
        "scan": scan_res
    }, f"Demo workspace generated at '{result['demo_dir']}' and scan started!"))

if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5000))
    print(f"SmartClean Flask Backend starting on http://127.0.0.1:{port}")
    app.run(host='127.0.0.1', port=port, debug=False, threaded=True)
