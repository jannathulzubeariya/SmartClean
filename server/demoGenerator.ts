import fs from 'fs';
import path from 'path';
import { DEMO_DIR } from './config';

export function createDemoWorkspace(basePath?: string): {
  demo_dir: string;
  files_created: number;
  folders: string[];
} {
  const demoDir = basePath || DEMO_DIR;
  fs.mkdirSync(demoDir, { recursive: true });

  const folders: Record<string, string> = {
    Desktop: path.join(demoDir, 'Desktop'),
    Downloads: path.join(demoDir, 'Downloads'),
    Documents: path.join(demoDir, 'Documents'),
    Pictures: path.join(demoDir, 'Pictures'),
    Temp: path.join(demoDir, 'Temp'),
  };

  for (const f of Object.values(folders)) {
    fs.mkdirSync(f, { recursive: true });
  }

  // File contents
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00]);
  const jpegPayload = Buffer.from('SmartCleanDemoImageData'.repeat(2000));
  const jpegBytes = Buffer.concat([jpegHeader, jpegPayload]);

  const familyJpegPayload = Buffer.from('FamilyPortraitPortraitData'.repeat(3000));
  const familyJpegBytes = Buffer.concat([jpegHeader, familyJpegPayload]);

  const pdfReportBytes = Buffer.from(
    '%PDF-1.5\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      'Annual Quarter Project Report Summary Narrative\n'.repeat(200) +
      '\n%%EOF'
  );

  const pdfAssignmentBytes = Buffer.from(
    '%PDF-1.5\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      'University Semester Assignment Research Paper Draft\n'.repeat(150) +
      '\n%%EOF'
  );

  const pdfInvoiceBytes = Buffer.from(
    '%PDF-1.5\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
      'Client Billing Invoice #2026-0814 Payable Upon Receipt\n'.repeat(120) +
      '\n%%EOF'
  );

  const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);
  const zipBytes = Buffer.concat([zipHeader, Buffer.from('CompressedDemoArchiveContentPayload'.repeat(500))]);
  const docxBytes = Buffer.concat([zipHeader, Buffer.from('WordprocessingMLDocumentContentSample'.repeat(600))]);

  const exeHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00]);
  const exeBytes = Buffer.concat([exeHeader, Buffer.from('InstallerDemoBinaryDataSetupExecutable'.repeat(1000))]);

  const notesBytes = Buffer.from(
    'Team meeting notes:\n- Review SmartClean storage architecture\n- Finalize analog paper design system\n- Prepare safe quarantine testing\n'
  );

  const logBytes = Buffer.from(
    '2026-09-01 10:14:22 [INFO] Worker process initialized\n2026-09-01 10:14:23 [DEBUG] Syncing remote cache partition...\n'.repeat(400)
  );

  const tempBytes = Buffer.from('~TMPCACHE_RANDOM_ALLOC_DATA_BLOCK_BUFFER\n'.repeat(300));
  const crashBytes = Buffer.concat([
    Buffer.from('MDMP\x93\xa7\x00\x00'),
    Buffer.from('CrashMemoryDumpStackFrameTracingPayload'.repeat(400)),
  ]);

  const nowSec = Math.floor(Date.now() / 1000);

  const filesToCreate: Array<[string, Buffer, number]> = [
    // Desktop
    [path.join(folders.Desktop, 'vacation.jpg'), jpegBytes, 0],
    [path.join(folders.Desktop, 'project_report.pdf'), pdfReportBytes, 0],
    [path.join(folders.Desktop, 'notes.txt'), notesBytes, 0],
    [path.join(folders.Desktop, 'quick_notes (1).txt'), notesBytes, 0], // Duplicate of notes.txt

    // Downloads
    [path.join(folders.Downloads, 'photo_copy.jpg'), jpegBytes, 86400], // Duplicate of vacation.jpg
    [path.join(folders.Downloads, 'installer_demo.exe'), exeBytes, 30 * 86400],
    [path.join(folders.Downloads, 'old_log.log'), logBytes, 20 * 86400],
    [path.join(folders.Downloads, 'archive_backup.zip'), zipBytes, 10 * 86400],

    // Documents
    [path.join(folders.Documents, 'final_project.docx'), docxBytes, 0],
    [path.join(folders.Documents, 'assignment.pdf'), pdfAssignmentBytes, 0],
    [path.join(folders.Documents, 'financial_invoice_2026.pdf'), pdfInvoiceBytes, 0],

    // Pictures
    [path.join(folders.Pictures, 'family_portrait.jpg'), familyJpegBytes, 0],

    // Temp
    [path.join(folders.Temp, 'temp_cache_001.tmp'), tempBytes, 0],
    [path.join(folders.Temp, 'crash_demo.dmp'), crashBytes, 5 * 86400],
  ];

  let createdCount = 0;
  for (const [filePath, buffer, ageSeconds] of filesToCreate) {
    fs.writeFileSync(filePath, buffer);
    const modTime = nowSec - ageSeconds;
    try {
      fs.utimesSync(filePath, modTime, modTime);
    } catch {
      // Ignore utimes errors
    }
    createdCount++;
  }

  return {
    demo_dir: demoDir,
    files_created: createdCount,
    folders: Object.keys(folders),
  };
}
