const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

function applySecurity(app) {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin && config.nodeEnv !== 'production') return callback(null, true);
        if (config.allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origine non autorisée : ${origin}`));
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-API-Key'],
      maxAge: 86400,
    })
  );

  app.use(require('express').json({ limit: '10kb' }));
}

module.exports = { applySecurity };
