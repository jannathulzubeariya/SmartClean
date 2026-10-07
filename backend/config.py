import os
import sys
import platform

import tempfile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Support serverless / read-only deployment environments (Vercel, AWS Lambda, Cloud Run)
is_serverless = (
    os.environ.get('VERCEL') == '1' or
    os.environ.get('AWS_LAMBDA_FUNCTION_NAME') is not None or
    os.environ.get('SERVERLESS') == '1'
)

if is_serverless:
    DATA_DIR = os.environ.get('DATA_DIR', os.path.join(tempfile.gettempdir(), 'smartclean_data'))
else:
    DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'data'))

QUARANTINE_DIR = os.path.join(DATA_DIR, 'quarantine')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')
SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
MANIFEST_FILE = os.path.join(QUARANTINE_DIR, 'manifest.json')

try:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
except OSError:
    # Fallback to temp directory if deployment bundle directory is read-only
    DATA_DIR = os.path.join(tempfile.gettempdir(), 'smartclean_data')
    QUARANTINE_DIR = os.path.join(DATA_DIR, 'quarantine')
    HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')
    SETTINGS_FILE = os.path.join(DATA_DIR, 'settings.json')
    MANIFEST_FILE = os.path.join(QUARANTINE_DIR, 'manifest.json')
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(QUARANTINE_DIR, exist_ok=True)

IS_WINDOWS = platform.system() == 'Windows'

# System and protected paths that SmartClean refuses to delete or quarantine
PROTECTED_PATHS = [
    # Windows
    r"C:\Windows",
    r"C:\Program Files",
    r"C:\Program Files (x86)",
    r"C:\ProgramData",
    r"AppData\Local\Microsoft",
    r"System Volume Information",
    r"$Recycle.Bin",
    r"pagefile.sys",
    r"hiberfil.sys",
    r"swapfile.sys",
    # Unix / Linux / macOS
    "/bin",
    "/sbin",
    "/usr/bin",
    "/usr/sbin",
    "/usr/lib",
    "/lib",
    "/lib64",
    "/etc",
    "/proc",
    "/sys",
    "/dev",
    "/boot",
    "/System",
    "/Library",
]

DEFAULT_SETTINGS = {
    "collision_policy": "rename",  # "rename", "skip"
    "duplicate_partial_kb": 64,
    "max_history_entries": 500,
    "auto_quarantine_before_delete": True,
    "protected_extensions": [".sys", ".dll", ".so", ".dylib", ".ini", ".inf"],
    "importance_weights": {
        "modified_recent_30d": 15,
        "accessed_recent": 8,
        "located_user_folder": 15,
        "document_type": 12,
        "meaningful_terms": 10,
        "sole_copy": 15,
        "related_files_dense": 10,
        "referenced_detectable": 8,
        "large_for_type": 7,
        "old_installer_duplicate_penalty": -15
    }
}
