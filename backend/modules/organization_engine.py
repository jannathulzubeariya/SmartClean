import os
from ..utils.safe_path import safe_destination_filename

def get_suggested_destination(file_info, root_scope=None):
    """
    Evaluates misplaced file rules based on file category and current path.
    Returns:
    {
        "is_misplaced": bool,
        "suggested_folder_name": str,
        "suggested_folder_path": str,
        "reason": str,
        "confidence": "HIGH" | "MEDIUM"
    } or None if appropriately placed.
    """
    path = file_info.get('path', '')
    filename = file_info.get('filename', '')
    category = file_info.get('category', 'Other / Unknown')
    parent_dir = os.path.dirname(path)
    parent_name = os.path.basename(parent_dir).lower()

    # Determine base user directory context or root scope
    if root_scope and os.path.isdir(root_scope):
        base_dir = root_scope
    else:
        base_dir = os.path.expanduser("~")

    # Rule 1: Image on Desktop or Downloads -> Pictures
    if category == "Images":
        if parent_name in ["desktop", "downloads", "temp", "tmp"]:
            dest_dir = os.path.join(base_dir, "Pictures")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Pictures",
                "suggested_folder_path": dest_dir,
                "reason": f"Image file '{filename}' is currently located in {parent_name.capitalize()}. Moving it to Pictures keeps your photo library organized.",
                "confidence": "HIGH"
            }

    # Rule 2: Document on Desktop or Downloads -> Documents
    elif category == "Documents":
        if parent_name in ["desktop", "downloads", "temp", "tmp"]:
            dest_dir = os.path.join(base_dir, "Documents")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Documents",
                "suggested_folder_path": dest_dir,
                "reason": f"Document '{filename}' is sitting in {parent_name.capitalize()}. Moving it to Documents centralizes your papers and projects.",
                "confidence": "HIGH"
            }

    # Rule 3: Video in Downloads or Desktop -> Videos
    elif category == "Videos":
        if parent_name in ["desktop", "downloads", "temp"]:
            dest_dir = os.path.join(base_dir, "Videos")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Videos",
                "suggested_folder_path": dest_dir,
                "reason": f"Video file '{filename}' was found in {parent_name.capitalize()}. Videos should typically live in your Videos library.",
                "confidence": "HIGH"
            }

    # Rule 4: Audio outside Music -> Music
    elif category == "Audio":
        if parent_name not in ["music", "audio", "tracks", "songs"]:
            dest_dir = os.path.join(base_dir, "Music")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Music",
                "suggested_folder_path": dest_dir,
                "reason": f"Audio file '{filename}' is outside your dedicated Music collection.",
                "confidence": "MEDIUM"
            }

    # Rule 5: Code in Downloads -> Projects or Documents/Projects
    elif category == "Code":
        if parent_name in ["downloads", "temp"]:
            dest_dir = os.path.join(base_dir, "Projects")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Projects",
                "suggested_folder_path": dest_dir,
                "reason": f"Source code file '{filename}' is resting in Downloads instead of a designated project directory.",
                "confidence": "MEDIUM"
            }

    # Rule 6: Archives in Downloads -> Archives
    elif category == "Archives":
        if parent_name in ["desktop"]:
            dest_dir = os.path.join(base_dir, "Archives")
            return {
                "is_misplaced": True,
                "suggested_folder_name": "Archives",
                "suggested_folder_path": dest_dir,
                "reason": f"Compressed archive '{filename}' is cluttering your Desktop.",
                "confidence": "MEDIUM"
            }

    return None

def generate_organization_recommendations(scanned_files, root_scope=None):
    """
    Scan all files and compile misplaced-file organization recommendations.
    """
    recommendations = []
    
    for f in scanned_files:
        rule_result = get_suggested_destination(f, root_scope)
        if rule_result:
            dest_folder = rule_result["suggested_folder_path"]
            proposed_path, collision_name = safe_destination_filename(dest_folder, f['filename'])
            has_collision = (collision_name != f['filename'])

            recommendations.append({
                "file_id": f['id'],
                "filename": f['filename'],
                "current_path": f['path'],
                "current_folder": os.path.basename(os.path.dirname(f['path'])),
                "suggested_folder": rule_result["suggested_folder_name"],
                "suggested_folder_path": dest_folder,
                "proposed_target_path": proposed_path,
                "has_collision": has_collision,
                "collision_preview_name": collision_name,
                "category": f.get('category'),
                "size": f.get('size'),
                "size_formatted": f.get('size_formatted'),
                "importance_score": f.get('importance_score', 50),
                "importance_label": f.get('importance_label', 'MEDIUM'),
                "reason": rule_result["reason"],
                "confidence": rule_result["confidence"],
                "status": "pending"  # "pending", "moved", "ignored", "kept"
            })

    return recommendations
