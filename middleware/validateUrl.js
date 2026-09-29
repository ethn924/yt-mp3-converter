const { parseYouTubeUrl } = require('youtubewhat');

/**
 * Valide qu'une URL est bien une URL YouTube valide et extrait l'ID vidéo.
 * Utilise la bibliothèque `youtubewhat` pour une compatibilité maximale
 * avec tous les formats d'URL (youtu.be, watch?v=, shorts, etc.)
 * et tous les paramètres de suivi (si=, t=, etc.).
 */
function validateYouTubeUrl(req, res, next) {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      error: 'URL manquante. Collez un lien YouTube dans le champ.',
    });
  }

  const trimmed = url.trim();

  // Limite de sécurité de base
  if (trimmed.length > 500) {
    return res.status(400).json({ error: 'URL trop longue (max 500 caractères).' });
  }

  // Utilisation de la bibliothèque robuste pour parser l'URL
  const info = parseYouTubeUrl(trimmed);

  // On vérifie que le parsing a réussi, que c'est bien une vidéo et qu'un ID a été extrait
  if (!info.isValid || info.type !== 'video' || !info.id) {
    return res.status(400).json({
      error:
        'Lien YouTube invalide. Formats acceptés : youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/...',
    });
  }

  // Vérification finale : l'ID doit faire exactement 11 caractères
  if (!/^[a-zA-Z0-9_-]{11}$/.test(info.id)) {
    return res.status(400).json({
      error: 'ID vidéo YouTube invalide.',
    });
  }

  // Injection sécurisée : on ne passe QUE l'ID à yt-dlp, jamais l'URL brute.
  req.sanitized = {
    videoId: info.id,
    canonicalUrl: `https://www.youtube.com/watch?v=${info.id}`,
  };

  next();
}

module.exports = { validateYouTubeUrl };
