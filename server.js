const express = require('express');
const path = require('path');
const morgan = require('morgan');
const { execSync } = require('child_process');
const config = require('./config');
const logger = require('./utils/logger');
const { applySecurity } = require('./middleware/security');
const { globalLimiter } = require('./middleware/rateLimiter');
const convertRoutes = require('./routes/convert');
const { findFfmpegPath } = require('./utils/findFfmpeg');
const { findYtDlpPath } = require('./utils/findYtDlp');

const app = express();
app.set('trust proxy', 1);
applySecurity(app);
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use('/api', globalLimiter);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', convertRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  const ffmpeg = findFfmpegPath();
  const ytDlp = findYtDlpPath();
  res.json({
    status: ffmpeg && ytDlp ? 'ok' : 'degraded',
    ffmpeg: ffmpeg || 'NON TROUVÉ',
    ytDlp: ytDlp || 'NON TROUVÉ',
    uptime: Math.floor(process.uptime()),
  });
});

app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  logger.error('Erreur non gérée', {
    statusCode, message: err.message, path: req.path, method: req.method,
    details: err.details,
  });
  res.status(statusCode).json({
    error: err.message || 'Erreur interne.',
    details: config.nodeEnv !== 'production' ? err.details : undefined,
  });
});

process.on('SIGTERM', () => { logger.info('Arrêt serveur...'); process.exit(0); });

function preflightCheck() {
  const errors = [];
  if (!findFfmpegPath()) errors.push('FFmpeg introuvable dans bin/ffmpeg/bin/');
  if (!findYtDlpPath()) errors.push('yt-dlp introuvable dans bin/');

  if (errors.length > 0) {
    console.error('\nERREUR : Outils requis manquants :');
    errors.forEach((e) => console.error('  • ' + e));
    console.error('\nRelancez Lancer.bat pour les télécharger.\n');
    process.exit(1);
  }
}

if (require.main === module) {
  preflightCheck();
  app.listen(config.port, () => {
    logger.info(`Serveur démarré sur http://localhost:${config.port}`, { env: config.nodeEnv });
    console.log('\n🎵 YT-MP3 Converter → http://localhost:3000\n');
  });
}

module.exports = app;
