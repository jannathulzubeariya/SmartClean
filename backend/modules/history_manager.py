import os
import json
import time
import shutil
import uuid
from ..config import HISTORY_FILE
from ..utils.safe_path import normalize_path, safe_destination_filename
from ..utils.sizes import format_size
from ..utils.errors import AppError
from .quarantine_manager import restore_quarantined_file, quarantine_file

def _load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []

def _save_history(records):
    os.makedirs(os.path.dirname(HISTORY_FILE), exist_ok=True)
    temp_file = HISTORY_FILE + ".tmp"
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    os.replace(temp_file, HISTORY_FILE)

def log_action(action_type, source, destination=None, filename=None, file_size=0, status="success", reason="", undoable=False, undo_payload=None):
    """
    Log an operation to append-only history.
    """
    history = _load_history()
    action_id = f"act_{int(time.time())}_{uuid.uuid4().hex[:6]}"

    record = {
        "id": action_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "action_type": action_type,
        "source": source,
        "destination": destination,
        "filename": filename or os.path.basename(source),
        "file_size": file_size,
        "file_size_formatted": format_size(file_size),
        "status": status,
        "reason": reason,
        "undoable": undoable,
        "undone": False,
        "undo_payload": undo_payload or {}
    }

    # Prepend to history so recent is first
    history.insert(0, record)
    # Keep up to 500 entries
    history = history[:500]
    _save_history(history)
    return record

def get_history(limit=100):
    history = _load_history()
    return history[:limit]

def undo_action(action_id):
    """
    Reverts a previously performed action (move or quarantine).
    """
    history = _load_history()
    record = next((item for item in history if item["id"] == action_id), None)

    if not record:
        raise AppError("ACTION_NOT_FOUND", f"Action '{action_id}' not found in history", 404)

    if record.get("undone"):
        raise AppError("ALREADY_UNDONE", "This action has already been reverted", 400)

    if not record.get("undoable"):
        raise AppError("NOT_UNDOABLE", f"Action type '{record['action_type']}' cannot be automatically undone", 400)

    action_type = record["action_type"]
    undo_payload = record.get("undo_payload", {})

    # Revert MOVE: move destination back to source
    if action_type == "move":
        current_loc = record["destination"]
        orig_loc = record["source"]

        if not os.path.exists(current_loc):
            raise AppError("FILE_VANISHED", f"Moved file '{current_loc}' no longer exists", 404)

        orig_dir = os.path.dirname(orig_loc)
        orig_name = os.path.basename(orig_loc)
        safe_back_path, final_name = safe_destination_filename(orig_dir, orig_name)

        try:
            shutil.move(current_loc, safe_back_path)
        except OSError as e:
            raise AppError("UNDO_MOVE_FAILED", f"Failed to restore file back: {str(e)}", 500)

        record["undone"] = True
        _save_history(history)

        # Log the undo as an action
        log_action(
            action_type="undo",
            source=current_loc,
            destination=safe_back_path,
            filename=final_name,
            file_size=record.get("file_size", 0),
            status="success",
            reason=f"Reverted previous move of {record['filename']}",
            undoable=False
        )

        return {
            "reverted_action": action_id,
            "restored_path": safe_back_path,
            "message": f"Successfully moved '{final_name}' back to {orig_dir}"
        }

    # Revert QUARANTINE: restore from quarantine
    elif action_type == "quarantine":
        q_id = undo_payload.get("quarantine_id")
        if not q_id:
            raise AppError("INVALID_UNDO_DATA", "Missing quarantine reference ID", 400)

        restore_result = restore_quarantined_file(q_id)
        record["undone"] = True
        _save_history(history)

        log_action(
            action_type="undo",
            source=f"quarantine:{q_id}",
            destination=restore_result["restored_path"],
            filename=restore_result["final_filename"],
            file_size=record.get("file_size", 0),
            status="success",
            reason=f"Reverted quarantine of {record['filename']}",
            undoable=False
        )

        return {
            "reverted_action": action_id,
            "restored_path": restore_result["restored_path"],
            "message": f"Restored '{restore_result['final_filename']}' from quarantine"
        }

    raise AppError("UNSUPPORTED_UNDO", f"Cannot undo action of type '{action_type}'", 400)
