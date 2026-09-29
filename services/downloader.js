// services/downloader.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { getFfmpegLocation } = require('../utils/findFfmpeg');
const { findYtDlpPath } = require('../utils/findYtDlp');

const ROOT = path.join(__dirname, '..');
// Chemin ABSOLU : ne dÃ©pend plus du dossier de lancement.
const DOWNLOAD_DIR = path.resolve(ROOT, config.downloadDir);
// Limite de durÃ©e (secondes) Ã  la place de --max-filesize.
const MAX_DURATION_S = 3600;
const ATTEMPT_TIMEOUT_MS = 300000;
// MÃªmes clients que le test manuel rÃ©ussi (sans "ios").
const PLAYER_CLIENTS = 'youtube:player_client=tv,mweb,web_safari';

// Formats essayÃ©s dans l'ordre. Passe Ã  la suivante si aucun MP3 n'est produit.
const ATTEMPTS = [
  { name: 'format18', format: '18/best' },
  { name: 'bestaudio', format: 'bestaudio/best' },
];

let activeDownloads = 0;

function generateBaseName(videoId) {
  return `${videoId}-${crypto.randomBytes(8).toString('hex')}`;
}

function scheduleCleanup(filePath, delayMs = 5 * 60 * 1000) {
  setTimeout(() => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') logger.warn('Ã‰chec suppression', { filePath });
    });
  }, delayMs);
}

// Supprime tous les fichiers (.part, .mp4, ...) liÃ©s Ã  cette conversion.
function cleanPartials(baseName) {
  try {
    fs.readdirSync(DOWNLOAD_DIR)
      .filter((f) => f.startsWith(baseName))
      .forEach((f) => fs.unlinkSync(path.join(DOWNLOAD_DIR, f)));
  } catch (_) {}
}

// Env enfant : gÃ¨re la casse "Path" de Windows et Ã©vite un doublon PATH/Path.
function buildEnv(extraDirs) {
  const env = { ...process.env };
  const keys = Object.keys(env).filter((k) => k.toLowerCase() === 'path');
  const pathKey = keys[0] || 'Path';
  const current = keys.map((k) => env[k]).find(Boolean) || '';
  keys.forEach((k) => delete env[k]);
  env[pathKey] = [...extraDirs, current].join(path.delimiter);
  return env;
}

function buildArgs(url, outputTemplate, ffmpegLocation, nodePath, format) {
  return [
    url,
    '-x', '--audio-format', 'mp3', '--audio-quality', '0',
    '--format', format,
    '--no-playlist', '--no-keep-video',
    // "?" : n'Ã©choue pas si la durÃ©e est inconnue.
    '--match-filter', `!is_live & duration<=?${MAX_DURATION_S}`,
    '--retries', '3',
    '--socket-timeout', '15',
    '--ffmpeg-location', ffmpegLocation,
    '--js-runtimes', `node:${nodePath}`,
    '--extractor-args', PLAYER_CLIENTS,
    '--output', outputTemplate,
  ];
}

// Ne rejette jamais sur code != 0 : l'appelant dÃ©cide (fallback).
function runYtDlp(ytDlpPath, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytDlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env,
      cwd: ROOT,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, ATTEMPT_TIMEOUT_MS);

    const logLines = (chunk, level, label) =>
      chunk.split(/\r?\n/).forEach((l) => {
        if (l.trim()) logger[level](label, { out: l.trim().slice(0, 250) });
      });

    proc.stdout.on('data', (d) => { const c = d.toString(); stdout += c; logLines(c, 'info', 'yt-dlp'); });
    proc.stderr.on('data', (d) => { const c = d.toString(); stderr += c; logLines(c, 'warn', 'yt-dlp err'); });

    proc.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout, stderr, timedOut }); });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function friendlyMessage(text) {
  if (/does not pass filter/i.test(text)) return `VidÃ©o trop longue (max ${MAX_DURATION_S / 60} min) ou en direct.`;
  if (/HTTP Error 403/.test(text)) return 'YouTube a bloquÃ© le tÃ©lÃ©chargement (HTTP 403).';
  if (/Sign in to confirm|not a bot/i.test(text)) return 'YouTube demande une vÃ©rification anti-bot.';
  if (/Video unavailable|Private video|removed/i.test(text)) return 'VidÃ©o indisponible.';
  return 'La conversion MP3 a Ã©chouÃ©.';
}

async function convertToMp3(canonicalUrl, videoId) {
  if (activeDownloads >= config.maxConcurrentDownloads) {
    throw Object.assign(new Error(`Maximum ${config.maxConcurrentDownloads} conversions.`), { statusCode: 503 });
  }

  const ffmpegLocation = getFfmpegLocation();
  const ytDlpPath = findYtDlpPath();
  const nodePath = path.join(ROOT, 'bin', 'node', 'node.exe');

  if (!ffmpegLocation) throw Object.assign(new Error('FFmpeg introuvable.'), { statusCode: 500 });
  if (!ytDlpPath) throw Object.assign(new Error('yt-dlp introuvable.'), { statusCode: 500 });
  if (!fs.existsSync(nodePath)) throw Object.assign(new Error('Node portable introuvable.'), { statusCode: 500 });

  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  activeDownloads++;
  const baseName = generateBaseName(videoId);
  const outputTemplate = path.join(DOWNLOAD_DIR, `${baseName}.%(ext)s`);
  const finalPath = path.join(DOWNLOAD_DIR, `${baseName}.mp3`);
  const env = buildEnv([path.dirname(nodePath), path.dirname(ytDlpPath), ffmpegLocation]);

  try {
    let lastText = '';

    for (const attempt of ATTEMPTS) {
      cleanPartials(baseName);
      const args = buildArgs(canonicalUrl, outputTemplate, ffmpegLocation, nodePath, attempt.format);
      logger.info('Tentative', { attempt: attempt.name, cmd: `${ytDlpPath} ${args.join(' ')}` });

      let res;
      try {
        res = await runYtDlp(ytDlpPath, args, env);
      } catch (err) {
        logger.error('Lancement yt-dlp impossible', { message: err.message });
        throw Object.assign(new Error('Erreur interne : yt-dlp indisponible.'), { statusCode: 500 });
      }

      lastText = `${res.stdout}\n${res.stderr}`;
const mp3Exists = fs.existsSync(finalPath);
      logger.info('Fin tentative', {
        attempt: attempt.name,
        code: res.code,
        timedOut: res.timedOut,
        mp3: mp3Exists,
        sizeMB: mp3Exists ? +(fs.statSync(finalPath).size / 1024 / 1024).toFixed(1) : null,
      });

      if (fs.existsSync(finalPath)) break;
      // Erreurs inutiles Ã  retenter avec un autre format.
      if (/does not pass filter|Video unavailable|Private video/i.test(lastText)) break;
    }

    if (!fs.existsSync(finalPath)) {
      throw Object.assign(new Error(friendlyMessage(lastText)), {
        statusCode: 422,
        details: lastText.slice(-800),
      });
    }

    const stats = fs.statSync(finalPath);
    const fileSizeMB = stats.size / (1024 * 1024);
    if (fileSizeMB > config.maxFileSizeMB) {
      fs.unlinkSync(finalPath);
      throw Object.assign(new Error(`Fichier trop volumineux (${fileSizeMB.toFixed(1)} Mo).`), { statusCode: 413 });
    }

    // Supprime d'Ã©ventuels rÃ©sidus, garde uniquement le MP3.
    fs.readdirSync(DOWNLOAD_DIR)
      .filter((f) => f.startsWith(baseName) && f !== `${baseName}.mp3`)
      .forEach((f) => fs.unlinkSync(path.join(DOWNLOAD_DIR, f)));

    scheduleCleanup(finalPath);
    return { filePath: finalPath, fileName: `${baseName}.mp3`, fileSize: stats.size };
  } catch (err) {
    cleanPartials(baseName);
    throw err;
  } finally {
    activeDownloads--;
  }
}

module.exports = { convertToMp3 };