import os
import hashlib
from collections import defaultdict
from ..utils.sizes import format_size

PARTIAL_HASH_CHUNK = 64 * 1024  # 64 KB

def compute_partial_hash(filepath, file_size):
    """
    Compute hash of first 64 KB and last 64 KB.
    Extremely fast for rejecting non-duplicates of identical size.
    """
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            # First 64KB
            chunk = f.read(PARTIAL_HASH_CHUNK)
            hasher.update(chunk)
            
            # Last 64KB if file is larger than 64KB
            if file_size > PARTIAL_HASH_CHUNK:
                seek_pos = max(0, file_size - PARTIAL_HASH_CHUNK)
                f.seek(seek_pos)
                tail_chunk = f.read(PARTIAL_HASH_CHUNK)
                hasher.update(tail_chunk)
        return hasher.hexdigest()
    except (OSError, PermissionError):
        return None

def compute_full_hash(filepath):
    """
    Compute full SHA-256 hash in 64KB streaming chunks.
    """
    hasher = hashlib.sha256()
    try:
        with open(filepath, 'rb') as f:
            while True:
                chunk = f.read(64 * 1024)
                if not chunk:
                    break
                hasher.update(chunk)
        return hasher.hexdigest()
    except (OSError, PermissionError):
        return None

def choose_suggested_keeper(copies):
    """
    Determine the suggested keeper from a set of duplicate copies:
    1. Location preference: Documents, Projects, Pictures > Desktop > Downloads, Temp
    2. Cleaner filename (without ' (1)', 'copy', etc.)
    3. Oldest modified/created date
    """
    if not copies:
        return None

    def score_copy(item):
        path = item.get('path', '').lower()
        filename = item.get('filename', '').lower()
        score = 0

        # Preferred folders
        if 'documents' in path or 'projects' in path:
            score += 50
        elif 'pictures' in path or 'photos' in path or 'music' in path:
            score += 40
        elif 'desktop' in path:
            score += 20
        elif 'downloads' in path:
            score -= 20
        elif 'temp' in path or 'tmp' in path or 'cache' in path:
            score -= 50

        # Filename penalty for obvious copies
        if ' (1)' in filename or ' (2)' in filename or ' - copy' in filename or 'copy of' in filename:
            score -= 30
        
        # Prefer shorter paths slightly
        score -= min(len(path) // 10, 10)

        # Earlier modification time gets small bonus
        mtime = item.get('mtime', 0)
        # Invert mtime slightly (older = higher priority for original)
        return (score, -mtime)

    sorted_copies = sorted(copies, key=score_copy, reverse=True)
    return sorted_copies[0]['id']

def detect_duplicates(scanned_files):
    """
    Run 3-stage duplicate detection pipeline on scanned files list.
    scanned_files is a list of dicts with at least:
    id, path, filename, size, mtime, category
    """
    # Step 1: Group by size
    size_groups = defaultdict(list)
    for f in scanned_files:
        size = f.get('size', 0)
        # Skip 0-byte files for duplicate reclaim calculation (they take 0 space)
        if size > 0:
            size_groups[size].append(f)

    # Filter to sizes with >= 2 files
    candidate_size_groups = {sz: files for sz, files in size_groups.items() if len(files) >= 2}

    # Step 2: Partial hash grouping
    partial_groups = defaultdict(list)
    for size, files in candidate_size_groups.items():
        for file_info in files:
            p_hash = compute_partial_hash(file_info['path'], size)
            if p_hash:
                partial_groups[(size, p_hash)].append(file_info)

    candidate_partial_groups = {k: files for k, files in partial_groups.items() if len(files) >= 2}

    # Step 3: Full SHA-256 hash
    full_groups = defaultdict(list)
    for (size, _), files in candidate_partial_groups.items():
        for file_info in files:
            f_hash = compute_full_hash(file_info['path'])
            if f_hash:
                file_info['sha256'] = f_hash
                full_groups[f_hash].append(file_info)

    # Build duplicate groups result
    duplicate_groups = []
    total_reclaimable_bytes = 0
    total_duplicate_files = 0

    group_idx = 1
    for f_hash, copies in full_groups.items():
        if len(copies) >= 2:
            file_size = copies[0]['size']
            suggested_keeper_id = choose_suggested_keeper(copies)
            reclaimable_for_group = file_size * (len(copies) - 1)
            total_reclaimable_bytes += reclaimable_for_group
            total_duplicate_files += (len(copies) - 1)

            duplicate_groups.append({
                "group_id": f"dup-group-{group_idx}",
                "hash": f_hash,
                "file_size": file_size,
                "file_size_formatted": format_size(file_size),
                "reclaimable_bytes": reclaimable_for_group,
                "reclaimable_formatted": format_size(reclaimable_for_group),
                "suggested_keeper_id": suggested_keeper_id,
                "copies_count": len(copies),
                "copies": copies
            })
            group_idx += 1

    # Sort groups by reclaimable space descending
    duplicate_groups.sort(key=lambda g: g['reclaimable_bytes'], reverse=True)

    return {
        "groups": duplicate_groups,
        "total_groups": len(duplicate_groups),
        "total_duplicate_files": total_duplicate_files,
        "total_reclaimable_bytes": total_reclaimable_bytes,
        "total_reclaimable_formatted": format_size(total_reclaimable_bytes)
    }
