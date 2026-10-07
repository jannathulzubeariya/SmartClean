# SMARTCLEAN
### Intelligent Storage, Organization & Safe Cleanup System
> *"The computer cleaner that thinks before it cleans."*

---

## 1. Overview & Purpose
SmartClean is a local, privacy-first digital housekeeping system designed to help users understand, organize, and safely manage computer storage.

Unlike traditional disk cleaners that blindly delete files based on extensions, SmartClean answers four fundamental questions:
1. **WHAT is using my storage?**
2. **WHERE should this file belong?**
3. **IS this file potentially important?**
4. **WHAT can I safely clean?**

### The Core Priority Model
1. **Safety First** — Nothing important or uncertain is ever deleted automatically.
2. **Transparent Explanation** — Every recommendation includes a plain-language reason.
3. **User Control** — The user retains full control over Move, Keep, Ignore, Quarantine, Restore, and Delete.
4. **Safe Cleanup** — Destructive actions default to reversible isolation in Quarantine.

---

## 2. System Architecture

```
React + Vite (Port 3000)
       │
       │ HTTP / JSON (127.0.0.1)
       ▼
Flask API (Port 5000)
       │
       ├─► Scanner (Threaded os.scandir walk with pause/resume/cancel)
       ├─► File Classifier (Magic-byte signatures + extension mapping)
       ├─► Storage Analyzer (shutil.disk_usage & category breakdowns)
       ├─► Duplicate Detector (Size -> 64KB partial hash -> full SHA-256)
       ├─► Importance Analyzer (Transparent 0-100 rule engine)
       ├─► Organization Engine (Misplaced-file recommendations)
       ├─► Cleanup Engine (LOW/MEDIUM/HIGH risk categorization)
       ├─► Quarantine Manager (App-owned vault with manifest)
       └─► History Manager (Append-only action audit log with undo)
       │
       ▼
Local Filesystem + data/*.json
```

- **Persistence**: Local JSON files only (`history.json`, `settings.json`, `quarantine/manifest.json`). No database.
- **Privacy**: 100% local. Zero external cloud APIs, zero tracking, zero external telemetry.
- **Design System**: Warm Analog Craft aesthetic with paper surfaces, editorial serif typography, and calm natural palette.

---

## 3. Quick Start

### Windows (One-Click)
Double-click `start.bat` or run in command prompt:
```bat
start.bat
```
This script will:
1. Verify Python 3.10+ and Node.js / npm.
2. Create and activate a Python virtual environment (`venv`).
3. Install backend and frontend dependencies.
4. Launch the Flask API and Vite frontend.
5. Automatically open `http://localhost:3000` in your default browser.

### Linux / macOS
```bash
chmod +x start.sh
./start.sh
```

### Manual Development Startup
1. **Backend**:
   ```bash
   pip install -r backend/requirements.txt
   python -m backend.app
   ```
2. **Frontend & Full-Stack Proxy**:
   ```bash
   npm install
   npm run dev
   ```
   Navigate to `http://localhost:3000`.

---

## 4. Key Engines & Features

### 1. Transparent Importance Engine (0–100 Score)
Evaluates verifiable filesystem signals:
- **Modified in last 30 days**: +15
- **Accessed recently**: +8
- **Located in Documents/Desktop/Workspace**: +15
- **Document / Source Code format**: +12
- **Meaningful filename terms** (*report, invoice, thesis, project, assignment*): +10
- **Sole copy detected (no duplicate)**: +15
- **Surrounded by related project files**: +10
- **Unusually large for type**: +7
- **Old installer with duplicates**: -15 to -25 penalty

*High Importance (70–100)*: Permanent deletion is hard-disabled to prevent accidental data loss.

### 2. 3-Stage Duplicate Detection Pipeline
- **Step 1**: Group by exact byte size.
- **Step 2**: 64 KB head and tail partial hashing.
- **Step 3**: Streaming full SHA-256 for identical candidates.
- Suggests an original keeper based on location hierarchy (*Documents/Projects > Desktop > Downloads/Temp*).

### 3. Misplaced File Organization
Detects misplaced items (e.g. photos on Desktop or videos in Downloads) and recommends standard target folders with collision-safe renaming (`name (1).ext`).

### 4. Reversible Quarantine Vault
Destructive cleanup moves items to `backend/data/quarantine/` with a detailed manifest. Files can be restored back to their original paths at any time.

### 5. Append-Only History & Undo
Every Move and Quarantine action is recorded in `history.json` and can be undone with a single click.

---

## 5. Security & Safety Model
- **Hard-blocked System Locations**: `C:\Windows`, `Program Files`, `ProgramData`, `AppData\Local\Microsoft`, system volumes, root directories, and Unix `/bin`, `/etc`, `/usr`.
- **Path Traversal Protection**: All paths resolved via `os.path.realpath` and checked against authorized scan scopes.
- **Symlink Protection**: Symbolic links are never traversed to prevent loop attacks or escaping the scan boundary.
- **No Overwriting**: Collisions are resolved through safe renaming (`file (1).ext`).
- **No Silent Deletions**: Every action is confirmed via a Delete Analysis Modal.
