const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let cachedPath = null;

/**
 * Trouve le chemin vers yt-dlp.exe.
 * Priorité : ./bin/yt-dlp.exe (portable local) → PATH système.
 */
function findYtDlpPath() {
  if (cachedPath) return cachedPath;

  // 1. Dossier bin/ local du projet (prioritaire)
  const localPath = path.join(__dirname, '..', 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localPath)) {
    cachedPath = localPath;
    return cachedPath;
  }

  // 2. PATH système via where.exe
  try {
    const output = execSync('where.exe yt-dlp', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.toLowerCase().endsWith('yt-dlp.exe') && fs.existsSync(line)) {
        cachedPath = line;
        return cachedPath;
      }
    }
  } catch (_) { /* pas trouvé */ }

  return null;
}

module.exports = { findYtDlpPath };
