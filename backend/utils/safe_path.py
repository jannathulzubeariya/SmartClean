import os
import sys
import platform
from ..config import PROTECTED_PATHS, IS_WINDOWS
from .errors import AppError

def normalize_path(path):
    """Normalize path handling slashes and case-insensitivity on Windows."""
    if not path:
        return ""
    expanded = os.path.expanduser(path)
    real = os.path.realpath(expanded)
    return real

def is_protected(path):
    """Check if the given path is a protected operating system directory or file."""
    norm_path = normalize_path(path)
    
    # Check against protected paths list
    for prot in PROTECTED_PATHS:
        prot_norm = normalize_path(prot)
        if not prot_norm:
            continue
        # If path equals or is inside protected directory
        if norm_path == prot_norm or norm_path.startswith(prot_norm + os.sep):
            return True, f"Path is in protected system location: {prot}"
        # On Windows case insensitive check
        if IS_WINDOWS:
            if norm_path.lower() == prot_norm.lower() or norm_path.lower().startswith(prot_norm.lower() + os.sep):
                return True, f"Path is in protected system location: {prot}"

    # Also check if it's the root drive or root directory
    if os.path.dirname(norm_path) == norm_path:
        return True, "Path is filesystem root directory"

    return False, ""

def verify_path_in_scope(path, scope_path=None):
    """
    Verify path is valid, real, not outside scope, and not a traversal exploit.
    Raises AppError if invalid.
    """
    if not path or not isinstance(path, str):
        raise AppError("INVALID_PATH", "Path must be a non-empty string", 400)

    # Prevent basic traversal characters before normalization
    if "\0" in path:
        raise AppError("INVALID_PATH", "Null byte in path detected", 400)

    norm_target = normalize_path(path)

    # Check if target is a symlink
    if os.path.islink(path):
        raise AppError("SYMLINK_REJECTED", "Operating on symbolic links is not permitted for safety", 403)

    # Check system protected
    protected, reason = is_protected(norm_target)
    if protected:
        raise AppError("PROTECTED_PATH", reason, 403)

    # Verify inside scope if scope is specified
    if scope_path:
        norm_scope = normalize_path(scope_path)
        # Check that norm_target starts with norm_scope
        try:
            common = os.path.commonpath([norm_scope, norm_target])
            if IS_WINDOWS:
                if common.lower() != norm_scope.lower():
                    raise AppError("OUT_OF_SCOPE", f"Path '{norm_target}' is outside the authorized scope '{norm_scope}'", 403)
            else:
                if common != norm_scope:
                    raise AppError("OUT_OF_SCOPE", f"Path '{norm_target}' is outside the authorized scope '{norm_scope}'", 403)
        except ValueError:
            # Different drives on Windows (e.g., C: vs D:)
            raise AppError("OUT_OF_SCOPE", "Path is on a different drive than the active scope", 403)

    return norm_target

def safe_destination_filename(dest_folder, original_filename):
    """
    Generate a non-colliding destination path by appending (1), (2) etc.
    Never overwrites an existing file.
    """
    dest_folder = normalize_path(dest_folder)
    os.makedirs(dest_folder, exist_ok=True)

    base, ext = os.path.splitext(original_filename)
    candidate_name = original_filename
    candidate_path = os.path.join(dest_folder, candidate_name)

    counter = 1
    while os.path.exists(candidate_path):
        candidate_name = f"{base} ({counter}){ext}"
        candidate_path = os.path.join(dest_folder, candidate_name)
        counter += 1

    return candidate_path, candidate_name
