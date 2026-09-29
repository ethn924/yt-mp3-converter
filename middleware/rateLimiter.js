const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Veuillez réessayer dans une minute.', retryAfter: 60 },
  keyGenerator: (req) => req.ip,
});

const conversionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de conversions atteinte. Veuillez patienter.', retryAfter: 60 },
});

module.exports = { globalLimiter, conversionLimiter };
