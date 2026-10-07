import os
import time

MEANINGFUL_TERMS = [
    "report", "final", "thesis", "invoice", "project", "assignment",
    "certificate", "resume", "important", "tax", "statement", "contract",
    "agreement", "budget", "plan", "presentation", "paper", "notes",
    "client", "draft", "master"
]

def analyze_importance(file_info, folder_file_counts=None, duplicate_hashes=None):
    """
    Transparent, rule-based 0-100 importance analyzer.
    Never claims certainty: uses 'Potentially important', 'Likely important', 'Recommended to keep'.
    Returns:
    {
        "score": int (0-100),
        "label": "HIGH" | "MEDIUM" | "LOW",
        "guidance": str,
        "recommendation": str,
        "can_permanently_delete": bool,
        "reasons": [str]
    }
    """
    score = 0
    reasons = []
    
    path = file_info.get('path', '')
    filename = file_info.get('filename', '')
    lower_name = filename.lower()
    lower_path = path.lower()
    category = file_info.get('category', 'Other / Unknown')
    mtime = file_info.get('mtime', 0)
    atime = file_info.get('atime', 0)
    size = file_info.get('size', 0)
    now = time.time()
    
    # 1. Modified in last 30 days (+15)
    thirty_days_sec = 30 * 24 * 3600
    if now - mtime <= thirty_days_sec:
        score += 15
        reasons.append("Modified in the last 30 days (+15)")
        
    # 2. Accessed recently where OS reports it (+8)
    if atime and (now - atime <= 14 * 24 * 3600) and atime > mtime:
        score += 8
        reasons.append("Recently accessed by user or application (+8)")
        
    # 3. Located in Documents, Desktop, or project folder (+15)
    in_user_location = False
    for loc in ["documents", "projects", "desktop", "my documents", "workspace"]:
        if loc in lower_path:
            in_user_location = True
            break
    if in_user_location:
        score += 15
        reasons.append("Located in user workspace or document directory (+15)")
        
    # 4. Document / project file type (+12)
    if category in ["Documents", "Code"]:
        score += 12
        reasons.append(f"{category} file type (+12)")
    elif category == "Images" and "pictures" in lower_path:
        score += 8
        reasons.append("Image in dedicated photo library (+8)")

    # 5. Meaningful filename terms (+10)
    found_terms = [t for t in MEANINGFUL_TERMS if t in lower_name]
    if found_terms:
        score += 10
        terms_str = ", ".join(found_terms[:3])
        reasons.append(f"Filename contains meaningful term: '{terms_str}' (+10)")

    # 6. Sole copy detected (no duplicate found) (+15)
    sha256 = file_info.get('sha256')
    is_in_dup_group = file_info.get('is_duplicate_copy', False)
    if duplicate_hashes and sha256 and duplicate_hashes.get(sha256, 0) > 1:
        # Penalty if it's an installer/temp with duplicates
        if category in ["Installers", "Temporary"]:
            score -= 15
            reasons.append("Replaceable installer/temp file with existing duplicate (-15)")
        else:
            reasons.append("Duplicate copies detected on disk")
    else:
        score += 15
        reasons.append("Unique file; no duplicate copies detected (+15)")

    # 7. Sits in a folder with related files (+10)
    folder_path = os.path.dirname(path)
    if folder_file_counts and folder_file_counts.get(folder_path, 0) >= 3:
        score += 10
        reasons.append(f"Surrounded by {folder_file_counts.get(folder_path)} files in folder (+10)")

    # 8. Unusually large size for its type (+7)
    if category == "Documents" and size > 15 * 1024 * 1024:
        score += 7
        reasons.append("Substantial document content size (+7)")
    elif category == "Images" and size > 25 * 1024 * 1024:
        score += 7
        reasons.append("High resolution original image (+7)")

    # 9. Penalties for clearly temporary, cache, or crash dumps
    if category == "Temporary":
        score -= 25
        reasons.append("Temporary file format (-25)")
    elif category == "Logs" and (now - mtime > 14 * 24 * 3600):
        score -= 15
        reasons.append("Historical log file over two weeks old (-15)")
    elif category == "Installers" and (now - mtime > 60 * 24 * 3600):
        score -= 20
        reasons.append("Old installer package over two months old (-20)")

    # Clamp score to 0 - 100
    score = max(0, min(100, score))

    if score >= 70:
        label = "HIGH"
        guidance = "Potentially important"
        recommendation = "Recommended to keep; permanent deletion disabled"
        can_permanently_delete = False
    elif score >= 40:
        label = "MEDIUM"
        guidance = "Likely important"
        recommendation = "Review recommended; quarantine only"
        can_permanently_delete = False
    else:
        label = "LOW"
        guidance = "Low importance candidate"
        recommendation = "Review candidate for safe cleanup"
        can_permanently_delete = True

    return {
        "score": score,
        "label": label,
        "guidance": guidance,
        "recommendation": recommendation,
        "can_permanently_delete": can_permanently_delete,
        "reasons": reasons
    }
