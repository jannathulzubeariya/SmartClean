import os

# Signatures for magic bytes verification
MAGIC_SIGNATURES = [
    (b"\x89PNG\r\n\x1a\n", "Images", "image/png"),
    (b"\xff\xd8\xff", "Images", "image/jpeg"),
    (b"GIF87a", "Images", "image/gif"),
    (b"GIF89a", "Images", "image/gif"),
    (b"RIFF", "Images", "image/webp"),  # Check RIFF for WEBP or WAV below
    (b"%PDF", "Documents", "application/pdf"),
    (b"PK\x03\x04", "Archives", "application/zip"),  # ZIP, docx, xlsx, pptx
    (b"MZ", "Executables", "application/x-dosexec"),
    (b"\x7fELF", "Executables", "application/x-executable"),
    (b"Rar!\x1a\x07", "Archives", "application/x-rar"),
    (b"7z\xbc\xaf\x27\x1c", "Archives", "application/x-7z-compressed"),
    (b"\x1f\x8b\x08", "Archives", "application/gzip"),
    (b"ID3", "Audio", "audio/mpeg"),
    (b"\xff\xfb", "Audio", "audio/mpeg"),
    (b"\xff\xf3", "Audio", "audio/mpeg"),
    (b"\xff\xf2", "Audio", "audio/mpeg"),
    (b"OggS", "Audio", "audio/ogg"),
    (b"fLaC", "Audio", "audio/flac"),
]

# Extension map for reliable and extended classification
EXTENSION_CATEGORIES = {
    # Documents
    ".pdf": "Documents",
    ".docx": "Documents",
    ".doc": "Documents",
    ".xlsx": "Documents",
    ".xls": "Documents",
    ".pptx": "Documents",
    ".ppt": "Documents",
    ".txt": "Documents",
    ".rtf": "Documents",
    ".odt": "Documents",
    ".ods": "Documents",
    ".odp": "Documents",
    ".csv": "Documents",
    ".tsv": "Documents",
    ".epub": "Documents",
    ".pages": "Documents",
    ".numbers": "Documents",
    ".key": "Documents",

    # Images
    ".jpg": "Images",
    ".jpeg": "Images",
    ".png": "Images",
    ".gif": "Images",
    ".webp": "Images",
    ".svg": "Images",
    ".bmp": "Images",
    ".ico": "Images",
    ".tiff": "Images",
    ".tif": "Images",
    ".psd": "Images",
    ".ai": "Images",
    ".raw": "Images",
    ".heic": "Images",
    ".avif": "Images",

    # Videos
    ".mp4": "Videos",
    ".mkv": "Videos",
    ".avi": "Videos",
    ".mov": "Videos",
    ".wmv": "Videos",
    ".flv": "Videos",
    ".webm": "Videos",
    ".m4v": "Videos",
    ".3gp": "Videos",

    # Audio
    ".mp3": "Audio",
    ".wav": "Audio",
    ".flac": "Audio",
    ".aac": "Audio",
    ".ogg": "Audio",
    ".m4a": "Audio",
    ".wma": "Audio",
    ".mid": "Audio",
    ".midi": "Audio",

    # Archives
    ".zip": "Archives",
    ".rar": "Archives",
    ".7z": "Archives",
    ".tar": "Archives",
    ".gz": "Archives",
    ".bz2": "Archives",
    ".xz": "Archives",
    ".tgz": "Archives",
    ".iso": "Archives",
    ".dmg": "Archives",

    # Executables & Binaries
    ".exe": "Executables",
    ".bat": "Executables",
    ".cmd": "Executables",
    ".sh": "Executables",
    ".bin": "Executables",
    ".app": "Executables",

    # Installers (subset of executables/packages)
    ".msi": "Installers",
    ".pkg": "Installers",
    ".deb": "Installers",
    ".rpm": "Installers",

    # Code
    ".py": "Code",
    ".js": "Code",
    ".ts": "Code",
    ".jsx": "Code",
    ".tsx": "Code",
    ".html": "Code",
    ".htm": "Code",
    ".css": "Code",
    ".scss": "Code",
    ".sass": "Code",
    ".json": "Code",
    ".xml": "Code",
    ".yaml": "Code",
    ".yml": "Code",
    ".java": "Code",
    ".c": "Code",
    ".cpp": "Code",
    ".h": "Code",
    ".hpp": "Code",
    ".cs": "Code",
    ".go": "Code",
    ".rs": "Code",
    ".php": "Code",
    ".rb": "Code",
    ".swift": "Code",
    ".kt": "Code",
    ".sql": "Code",
    ".sh": "Code",
    ".md": "Code",

    # Temporary
    ".tmp": "Temporary",
    ".temp": "Temporary",
    ".bak": "Temporary",
    ".swp": "Temporary",
    ".dmp": "Temporary",
    ".crdownload": "Temporary",
    ".part": "Temporary",
    ".cache": "Temporary",

    # Logs
    ".log": "Logs",
    ".trace": "Logs",
    ".out": "Logs"
}

def classify_file(file_path, filename=None):
    """
    Classify a file into one of the designated categories using
    extension + magic byte validation when practical.
    """
    if not filename:
        filename = os.path.basename(file_path)

    lower_name = filename.lower()
    _, ext = os.path.splitext(lower_name)

    # Check for installer heuristic in filename
    if ext in [".exe", ".msi"] and any(term in lower_name for term in ["setup", "install", "installer", "update", "patch"]):
        return "Installers", ext

    # Temporary file heuristics
    if lower_name.startswith("~") or lower_name.endswith("~") or ext in [".tmp", ".temp", ".bak", ".swp", ".dmp", ".crdownload", ".part"]:
        return "Temporary", ext

    # Log heuristics
    if ext in [".log", ".trace", ".out"] or ".log." in lower_name:
        return "Logs", ext

    # Category from extension map
    ext_category = EXTENSION_CATEGORIES.get(ext)

    # Magic byte check for non-zero files if path exists and readable
    magic_category = None
    if file_path and os.path.isfile(file_path):
        try:
            with open(file_path, "rb") as f:
                header = f.read(32)
                if header:
                    for sig, cat, _ in MAGIC_SIGNATURES:
                        if header.startswith(sig):
                            magic_category = cat
                            break
        except (OSError, PermissionError):
            pass

    # If extension maps to modern office formats (which are ZIPs), prefer Documents
    if ext in [".docx", ".xlsx", ".pptx", ".odt", ".ods", ".odp"]:
        return "Documents", ext

    # If magic check detected a category and extension was unknown, use magic
    if magic_category and not ext_category:
        return magic_category, ext

    # If extension category matches, return it
    if ext_category:
        return ext_category, ext

    return "Other / Unknown", ext
