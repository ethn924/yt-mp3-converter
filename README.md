# YT-MP3 Converter

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white) ![yt-dlp](https://img.shields.io/badge/yt--dlp-FF0000) ![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white) ![Windows](https://img.shields.io/badge/Windows-10%2F11-0078D6?logo=windows&logoColor=white)

Convertisseur YouTube → MP3, local et autonome. Aucune inscription, aucune donnée envoyée à un tiers autre que YouTube.

## Utilisation

1. Double-cliquez sur `Lancer.bat`.
2. Au premier lancement, le script télécharge automatiquement Node.js, yt-dlp et FFmpeg (~130 Mo, connexion Internet requise). Cela prend 1 à 2 minutes.
3. Votre navigateur s'ouvre sur `http://localhost:3000`.
4. Collez un lien YouTube, cliquez sur **Convertir**.
5. Téléchargez le MP3 généré dans votre dossier Téléchargements.

Les lancements suivants sont quasi instantanés (les outils sont déjà présents dans `bin/`).

## Prérequis

- Windows 10 ou 11.
- Connexion Internet **au premier lancement uniquement** (et à chaque conversion, pour accéder à YouTube).
- Aucun logiciel à installer manuellement.

## Avertissement antivirus (faux positif connu)

Certains antivirus, dont Windows Defender, peuvent signaler `yt-dlp.exe` comme suspect. **C'est un faux positif documenté**, lié à la façon dont l'exécutable est packagé (PyInstaller), pas à un comportement malveillant réel.

Référence officielle : https://github.com/yt-dlp/yt-dlp/issues/8938

Si le téléchargement ou l'exécution est bloqué, ajoutez une exception pour le dossier du projet dans votre antivirus, en connaissance de cause.

## Mentions légales

Cet outil est destiné à un usage strictement personnel. Le téléchargement de contenus protégés par le droit d'auteur sans autorisation peut constituer une violation des conditions d'utilisation de YouTube et, selon votre juridiction, de la loi. L'utilisateur est seul responsable de l'usage qu'il fait de cet outil.

## Mise à jour de yt-dlp

YouTube modifie régulièrement ses protections. Si les conversions échouent après un certain temps, mettez à jour yt-dlp :

1. Supprimez `bin\yt-dlp.exe`.
2. Relancez `Lancer.bat` — la dernière version sera retéléchargée automatiquement.

## Fichiers générés

Les MP3 sont stockés temporairement dans `downloads/` et **supprimés automatiquement après 5 minutes**. Téléchargez votre fichier rapidement après la conversion.

## Structure du projet

```text
server.js        serveur Express
config/          configuration (.env)
routes/          route de conversion
services/        appel à yt-dlp + FFmpeg
middleware/      sécurité (helmet), limite de requêtes, validation d'URL
utils/           logs, détection de yt-dlp et FFmpeg
public/          interface web
Lancer.bat       lancement en un double-clic (via bootstrap.ps1)
```
## Licence

MIT.

---

Réalisé par **Ethan Lalienne** · [GitHub](https://github.com/ethn924) · [Portfolio](https://ethn924.github.io/Portfolio/)
