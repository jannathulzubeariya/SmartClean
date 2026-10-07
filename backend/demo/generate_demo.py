import os
import time

def create_demo_workspace(base_path=None):
    """
    Creates a safe, realistic SmartClean_Demo workspace containing dummy files
    designed to showcase real scanning, classification, duplicates, misplaced files,
    importance scoring, and safe quarantine.
    """
    if not base_path:
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "SmartClean_Demo"))

    demo_dir = os.path.abspath(base_path)
    os.makedirs(demo_dir, exist_ok=True)

    folders = {
        "Desktop": os.path.join(demo_dir, "Desktop"),
        "Downloads": os.path.join(demo_dir, "Downloads"),
        "Documents": os.path.join(demo_dir, "Documents"),
        "Pictures": os.path.join(demo_dir, "Pictures"),
        "Temp": os.path.join(demo_dir, "Temp")
    }

    for f in folders.values():
        os.makedirs(f, exist_ok=True)

    # Reusable file contents with valid magic bytes
    # Valid JPEG minimal bytes
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00" + (b"SmartCleanDemoImageData" * 2000)
    family_jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00" + (b"FamilyPortraitPortraitData" * 3000)

    # Valid PDF bytes
    pdf_report_bytes = b"%PDF-1.5\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" + (b"Annual Quarter Project Report Summary Narrative\n" * 200) + b"\n%%EOF"
    pdf_assignment_bytes = b"%PDF-1.5\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" + (b"University Semester Assignment Research Paper Draft\n" * 150) + b"\n%%EOF"
    pdf_invoice_bytes = b"%PDF-1.5\n%\xe2\xe3\xcf\xd3\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" + (b"Client Billing Invoice #2026-0814 Payable Upon Receipt\n" * 120) + b"\n%%EOF"

    # Valid ZIP bytes
    zip_bytes = b"PK\x03\x04\x14\x00\x00\x00\x08\x00" + (b"CompressedDemoArchiveContentPayload" * 500)
    docx_bytes = b"PK\x03\x04\x14\x00\x06\x00\x08\x00" + (b"WordprocessingMLDocumentContentSample" * 600)

    # Executable dummy PE header
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00" + (b"InstallerDemoBinaryDataSetupExecutable" * 1000)

    # Text & logs & temp
    notes_bytes = b"Team meeting notes:\n- Review SmartClean storage architecture\n- Finalize analog paper design system\n- Prepare safe quarantine testing\n"
    log_bytes = (b"2026-09-01 10:14:22 [INFO] Worker process initialized\n2026-09-01 10:14:23 [DEBUG] Syncing remote cache partition...\n" * 400)
    temp_bytes = (b"~TMPCACHE_RANDOM_ALLOC_DATA_BLOCK_BUFFER\n" * 300)
    crash_bytes = b"MDMP\x93\xa7\x00\x00" + (b"CrashMemoryDumpStackFrameTracingPayload" * 400)

    files_to_create = [
        # Desktop (misplaced image + important doc + notes)
        (os.path.join(folders["Desktop"], "vacation.jpg"), jpeg_bytes, 0),
        (os.path.join(folders["Desktop"], "project_report.pdf"), pdf_report_bytes, 0),
        (os.path.join(folders["Desktop"], "notes.txt"), notes_bytes, 0),
        (os.path.join(folders["Desktop"], "quick_notes (1).txt"), notes_bytes, 0),  # Duplicate of notes.txt

        # Downloads (misplaced copy of vacation.jpg -> DUPLICATE, installer, old log, zip)
        (os.path.join(folders["Downloads"], "photo_copy.jpg"), jpeg_bytes, 86400), # Duplicate of vacation.jpg
        (os.path.join(folders["Downloads"], "installer_demo.exe"), exe_bytes, 30 * 86400), # Old installer
        (os.path.join(folders["Downloads"], "old_log.log"), log_bytes, 20 * 86400), # Old log
        (os.path.join(folders["Downloads"], "archive_backup.zip"), zip_bytes, 10 * 86400),

        # Documents (important user files)
        (os.path.join(folders["Documents"], "final_project.docx"), docx_bytes, 0),
        (os.path.join(folders["Documents"], "assignment.pdf"), pdf_assignment_bytes, 0),
        (os.path.join(folders["Documents"], "financial_invoice_2026.pdf"), pdf_invoice_bytes, 0),

        # Pictures (properly placed)
        (os.path.join(folders["Pictures"], "family_portrait.jpg"), family_jpeg_bytes, 0),

        # Temp (cleanable)
        (os.path.join(folders["Temp"], "temp_cache_001.tmp"), temp_bytes, 0),
        (os.path.join(folders["Temp"], "crash_demo.dmp"), crash_bytes, 5 * 86400)
    ]

    now = time.time()
    created_count = 0
    for path, data, age_seconds in files_to_create:
        with open(path, "wb") as f:
            f.write(data)
        mod_time = now - age_seconds
        os.utime(path, (mod_time, mod_time))
        created_count += 1

    return {
        "demo_dir": demo_dir,
        "files_created": created_count,
        "folders": list(folders.keys())
    }

if __name__ == "__main__":
    res = create_demo_workspace()
    print(f"Created demo workspace at: {res['demo_dir']} with {res['files_created']} files.")
