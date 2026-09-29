const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let cachedPath = null;

function findFfmpegPath() {
  if (cachedPath) return cachedPath;

  // 1. Dossier bin/ffmpeg/bin/ local du projet (prioritaire)
  const localPath = path.join(__dirname, '..', 'bin', 'ffmpeg', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(localPath)) {
    cachedPath = localPath;
    return cachedPath;
  }

  // 2. PATH système via where.exe
  try {
    const output = execSync('where.exe ffmpeg', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.toLowerCase().endsWith('ffmpeg.exe') && fs.existsSync(line)) {
        cachedPath = line;
        return cachedPath;
      }
    }
  } catch (_) { /* pas trouvé */ }

  // 3. Emplacements classiques
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) { cachedPath = c; return cachedPath; }
  }

  return null;
}

function getFfmpegLocation() {
  const p = findFfmpegPath();
  return p ? path.dirname(p) : null;
}

module.exports = { findFfmpegPath, getFfmpegLocation };
