import path from 'path';
import os from 'os';
import { ScannedFile, OrganizationRecommendation } from './types';
import { safeDestinationFilename } from './safePath';

export interface DestinationSuggestion {
  is_misplaced: boolean;
  suggested_folder_name: string;
  suggested_folder_path: string;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export function getSuggestedDestination(
  fileInfo: ScannedFile,
  rootScope?: string | null
): DestinationSuggestion | null {
  const filePath = fileInfo.path || '';
  const filename = fileInfo.filename || '';
  const category = fileInfo.category || 'Other / Unknown';
  const parentDir = path.dirname(filePath);
  const parentName = path.basename(parentDir).toLowerCase();

  const baseDir = rootScope || os.homedir();

  // Rule 1: Images on Desktop or Downloads -> Pictures
  if (category === 'Images') {
    if (['desktop', 'downloads', 'temp', 'tmp'].includes(parentName)) {
      const destDir = path.join(baseDir, 'Pictures');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Pictures',
        suggested_folder_path: destDir,
        reason: `Image file '${filename}' is currently located in ${capitalize(parentName)}. Moving it to Pictures keeps your photo library organized.`,
        confidence: 'HIGH',
      };
    }
  }

  // Rule 2: Documents on Desktop or Downloads -> Documents
  else if (category === 'Documents') {
    if (['desktop', 'downloads', 'temp', 'tmp'].includes(parentName)) {
      const destDir = path.join(baseDir, 'Documents');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Documents',
        suggested_folder_path: destDir,
        reason: `Document '${filename}' is sitting in ${capitalize(parentName)}. Moving it to Documents centralizes your papers and projects.`,
        confidence: 'HIGH',
      };
    }
  }

  // Rule 3: Videos in Downloads or Desktop -> Videos
  else if (category === 'Videos') {
    if (['desktop', 'downloads', 'temp'].includes(parentName)) {
      const destDir = path.join(baseDir, 'Videos');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Videos',
        suggested_folder_path: destDir,
        reason: `Video file '${filename}' was found in ${capitalize(parentName)}. Videos should typically live in your Videos library.`,
        confidence: 'HIGH',
      };
    }
  }

  // Rule 4: Audio outside Music -> Music
  else if (category === 'Audio') {
    if (!['music', 'audio', 'tracks', 'songs'].includes(parentName)) {
      const destDir = path.join(baseDir, 'Music');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Music',
        suggested_folder_path: destDir,
        reason: `Audio file '${filename}' is outside your dedicated Music collection.`,
        confidence: 'MEDIUM',
      };
    }
  }

  // Rule 5: Code in Downloads -> Projects
  else if (category === 'Code') {
    if (['downloads', 'temp'].includes(parentName)) {
      const destDir = path.join(baseDir, 'Projects');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Projects',
        suggested_folder_path: destDir,
        reason: `Source code file '${filename}' is resting in Downloads instead of a designated project directory.`,
        confidence: 'MEDIUM',
      };
    }
  }

  // Rule 6: Archives on Desktop -> Archives
  else if (category === 'Archives') {
    if (parentName === 'desktop') {
      const destDir = path.join(baseDir, 'Archives');
      return {
        is_misplaced: true,
        suggested_folder_name: 'Archives',
        suggested_folder_path: destDir,
        reason: `Compressed archive '${filename}' is cluttering your Desktop.`,
        confidence: 'MEDIUM',
      };
    }
  }

  return null;
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateOrganizationRecommendations(
  scannedFiles: ScannedFile[],
  rootScope?: string | null
): OrganizationRecommendation[] {
  const recommendations: OrganizationRecommendation[] = [];

  for (const f of scannedFiles) {
    const suggestion = getSuggestedDestination(f, rootScope);
    if (suggestion) {
      const destFolder = suggestion.suggested_folder_path;
      const [proposedPath, collisionName] = safeDestinationFilename(destFolder, f.filename);
      const hasCollision = collisionName !== f.filename;

      recommendations.push({
        file_id: f.id,
        filename: f.filename,
        current_path: f.path,
        current_folder: path.basename(path.dirname(f.path)),
        suggested_folder: suggestion.suggested_folder_name,
        suggested_folder_path: destFolder,
        proposed_target_path: proposedPath,
        has_collision: hasCollision,
        collision_preview_name: collisionName,
        category: f.category,
        size: f.size,
        size_formatted: f.size_formatted,
        importance_score: f.importance_score ?? 50,
        importance_label: f.importance_label ?? 'MEDIUM',
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        status: 'pending',
      });
    }
  }

  return recommendations;
}
