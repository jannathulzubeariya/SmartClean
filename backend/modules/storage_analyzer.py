import os
import shutil
from collections import defaultdict
from ..utils.sizes import format_size

def analyze_storage(scope_path, scanned_files, duplicate_reclaimable_bytes=0, cleanup_reclaimable_bytes=0):
    """
    Computes real disk metrics using shutil.disk_usage and aggregates
    category and folder breakdowns for scanned files.
    """
    disk_metrics = {
        "total_bytes": 0,
        "used_bytes": 0,
        "free_bytes": 0,
        "total_formatted": "0 B",
        "used_formatted": "0 B",
        "free_formatted": "0 B",
        "percent_used": 0.0
    }

    try:
        target_path = scope_path if (scope_path and os.path.exists(scope_path)) else os.path.expanduser("~")
        total, used, free = shutil.disk_usage(target_path)
        disk_metrics["total_bytes"] = total
        disk_metrics["used_bytes"] = used
        disk_metrics["free_bytes"] = free
        disk_metrics["total_formatted"] = format_size(total)
        disk_metrics["used_formatted"] = format_size(used)
        disk_metrics["free_formatted"] = format_size(free)
        if total > 0:
            disk_metrics["percent_used"] = round((used / total) * 100, 1)
    except (OSError, PermissionError):
        pass

    # Category breakdown from scanned files
    categories = defaultdict(lambda: {"count": 0, "bytes": 0})
    folder_breakdown = defaultdict(lambda: {"count": 0, "bytes": 0})

    total_scanned_bytes = 0
    for f in scanned_files:
        size = f.get('size', 0)
        cat = f.get('category', 'Other / Unknown')
        folder = os.path.dirname(f.get('path', ''))

        total_scanned_bytes += size
        categories[cat]["count"] += 1
        categories[cat]["bytes"] += size

        folder_breakdown[folder]["count"] += 1
        folder_breakdown[folder]["bytes"] += size

    # Format category list
    category_list = []
    for cat_name, data in categories.items():
        percentage = round((data["bytes"] / total_scanned_bytes * 100), 1) if total_scanned_bytes > 0 else 0
        category_list.append({
            "category": cat_name,
            "count": data["count"],
            "bytes": data["bytes"],
            "formatted_size": format_size(data["bytes"]),
            "percentage": percentage
        })

    # Sort categories by size descending
    category_list.sort(key=lambda x: x["bytes"], reverse=True)

    # Top folders list (top 8)
    top_folders = []
    for folder_path, data in folder_breakdown.items():
        top_folders.append({
            "folder": folder_path,
            "folder_name": os.path.basename(folder_path) or folder_path,
            "count": data["count"],
            "bytes": data["bytes"],
            "formatted_size": format_size(data["bytes"])
        })
    top_folders.sort(key=lambda x: x["bytes"], reverse=True)
    top_folders = top_folders[:8]

    # Total reclaimable calculation (deduplicating overlap)
    total_reclaimable_bytes = duplicate_reclaimable_bytes + cleanup_reclaimable_bytes

    return {
        "disk": disk_metrics,
        "scanned_files_count": len(scanned_files),
        "total_scanned_bytes": total_scanned_bytes,
        "total_scanned_formatted": format_size(total_scanned_bytes),
        "categories": category_list,
        "top_folders": top_folders,
        "reclaimable_bytes": total_reclaimable_bytes,
        "reclaimable_formatted": format_size(total_reclaimable_bytes)
    }
