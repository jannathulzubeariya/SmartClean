import time
import os
from ..utils.sizes import format_size

def analyze_cleanup_candidates(scanned_files, duplicate_groups=None):
    """
    Identifies cleanup candidates, categorizes them, assigns LOW/MEDIUM/HIGH risk,
    and calculates reclaimable storage.
    """
    now = time.time()
    
    sections = {
        "temporary": {
            "title": "Temporary & Cache Files",
            "risk": "LOW",
            "description": "Transient scratch files, incomplete downloads, and crash dumps that applications left behind.",
            "safe_action": "quarantine",
            "items": [],
            "total_bytes": 0
        },
        "duplicates": {
            "title": "Redundant Duplicate Copies",
            "risk": "MEDIUM",
            "description": "Secondary identical copies of files that already have an original preserved elsewhere.",
            "safe_action": "quarantine",
            "items": [],
            "total_bytes": 0
        },
        "installers": {
            "title": "Outdated Setup Packages",
            "risk": "MEDIUM",
            "description": "Downloaded application installers and update packages usually no longer required after setup.",
            "safe_action": "review",
            "items": [],
            "total_bytes": 0
        },
        "logs": {
            "title": "Application Logs & Dumps",
            "risk": "LOW",
            "description": "Diagnostic execution logs and debug dumps generated during prior application runs.",
            "safe_action": "quarantine",
            "items": [],
            "total_bytes": 0
        },
        "large_stale": {
            "title": "Large Stale Files (>90 days untouched)",
            "risk": "HIGH",
            "description": "Unusually large files that have not been modified or accessed recently. Always review before acting.",
            "safe_action": "review",
            "items": [],
            "total_bytes": 0
        }
    }

    # Gather non-keeper duplicate file IDs
    duplicate_non_keepers = set()
    if duplicate_groups:
        for grp in duplicate_groups:
            keeper_id = grp.get('suggested_keeper_id')
            for copy in grp.get('copies', []):
                if copy['id'] != keeper_id:
                    duplicate_non_keepers.add(copy['id'])
                    item_data = {
                        "id": copy['id'],
                        "filename": copy['filename'],
                        "path": copy['path'],
                        "size": copy['size'],
                        "size_formatted": copy.get('size_formatted', format_size(copy['size'])),
                        "reason": f"Exact duplicate copy of preserved file in group '{grp['group_id']}'",
                        "risk": "MEDIUM",
                        "importance_score": copy.get('importance_score', 20),
                        "suggested_action": "quarantine"
                    }
                    sections["duplicates"]["items"].append(item_data)
                    sections["duplicates"]["total_bytes"] += copy['size']

    for f in scanned_files:
        f_id = f.get('id')
        category = f.get('category', 'Other / Unknown')
        mtime = f.get('mtime', 0)
        size = f.get('size', 0)
        age_days = (now - mtime) / (24 * 3600)
        importance_score = f.get('importance_score', 50)

        # Skip if already added as duplicate
        if f_id in duplicate_non_keepers:
            continue

        # 1. Temporary & Cache Files (LOW risk)
        if category == "Temporary":
            item_data = {
                "id": f_id,
                "filename": f['filename'],
                "path": f['path'],
                "size": size,
                "size_formatted": f.get('size_formatted', format_size(size)),
                "reason": "Identified as temporary scratch/cache file format",
                "risk": "LOW",
                "importance_score": importance_score,
                "suggested_action": "quarantine"
            }
            sections["temporary"]["items"].append(item_data)
            sections["temporary"]["total_bytes"] += size

        # 2. Logs & Crash dumps (LOW risk if > 7 days old)
        elif category == "Logs" and age_days > 7:
            item_data = {
                "id": f_id,
                "filename": f['filename'],
                "path": f['path'],
                "size": size,
                "size_formatted": f.get('size_formatted', format_size(size)),
                "reason": f"Diagnostic log file untouched for {int(age_days)} days",
                "risk": "LOW",
                "importance_score": importance_score,
                "suggested_action": "quarantine"
            }
            sections["logs"]["items"].append(item_data)
            sections["logs"]["total_bytes"] += size

        # 3. Installers (MEDIUM risk if > 14 days old)
        elif category == "Installers" and age_days > 14:
            item_data = {
                "id": f_id,
                "filename": f['filename'],
                "path": f['path'],
                "size": size,
                "size_formatted": f.get('size_formatted', format_size(size)),
                "reason": f"Setup package downloaded {int(age_days)} days ago",
                "risk": "MEDIUM",
                "importance_score": importance_score,
                "suggested_action": "review"
            }
            sections["installers"]["items"].append(item_data)
            sections["installers"]["total_bytes"] += size

        # 4. Large stale files (> 50MB and > 90 days untouched) (HIGH risk)
        elif size > 50 * 1024 * 1024 and age_days > 90 and category not in ["Executables"]:
            item_data = {
                "id": f_id,
                "filename": f['filename'],
                "path": f['path'],
                "size": size,
                "size_formatted": f.get('size_formatted', format_size(size)),
                "reason": f"Large {category.lower()} file ({format_size(size)}) untouched for {int(age_days)} days",
                "risk": "HIGH",
                "importance_score": importance_score,
                "suggested_action": "review"
            }
            sections["large_stale"]["items"].append(item_data)
            sections["large_stale"]["total_bytes"] += size

    # Format totals for each section
    total_safe_reclaimable_bytes = 0
    total_cleanup_candidates = 0

    section_list = []
    for key, sec in sections.items():
        sec["total_formatted"] = format_size(sec["total_bytes"])
        sec["count"] = len(sec["items"])
        total_cleanup_candidates += sec["count"]
        # Only LOW and MEDIUM risk count toward recommended safe cleanup
        if sec["risk"] in ["LOW", "MEDIUM"]:
            total_safe_reclaimable_bytes += sec["total_bytes"]
        section_list.append({
            "key": key,
            **sec
        })

    return {
        "sections": section_list,
        "total_candidates": total_cleanup_candidates,
        "safe_reclaimable_bytes": total_safe_reclaimable_bytes,
        "safe_reclaimable_formatted": format_size(total_safe_reclaimable_bytes),
        "guidance": "SmartClean isolates candidates in Quarantine first. Permanent deletion is always gated."
    }
