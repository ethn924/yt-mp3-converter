const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { convertToMp3 } = require('../services/downloader');
const { validateYouTubeUrl } = require('../middleware/validateUrl');
const { conversionLimiter } = require('../middleware/rateLimiter');
const config = require('../config');
const logger = require('../utils/logger');

router.post('/convert', conversionLimiter, validateYouTubeUrl, async (req, res, next) => {
  try {
    const { canonicalUrl, videoId } = req.sanitized;
    const result = await convertToMp3(canonicalUrl, videoId);
    res.json({
      success: true, videoId, fileName: result.fileName,
      fileSize: result.fileSize, downloadUrl: `/api/download/${result.fileName}`,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/download/:fileName', (req, res) => {
  const { fileName } = req.params;
  const sanitizedName = path.basename(fileName);

  if (sanitizedName !== fileName || !fileName.endsWith('.mp3')) {
    return res.status(400).json({ error: 'Nom de fichier invalide.' });
  }

  const filePath = path.join(__dirname, '..', 'downloads', sanitizedName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier introuvable ou expiré.' });
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg', 'Content-Length': stat.size,
    'Content-Disposition': `attachment; filename="${sanitizedName}"`,
    'Cache-Control': 'no-store',
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    logger.error('Erreur streaming', { fileName, error: err.message });
    if (!res.headersSent) res.status(500).json({ error: 'Erreur envoi fichier.' });
  });
});

module.exports = router;
