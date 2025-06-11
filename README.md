# Extension Robert IA

Cette extension Chrome permet de discuter avec l'assistant **Robert IA** et d'analyser le contenu des pages ou emails visités. Le code s'appuie sur un service API local (`http://localhost:5000`) pour toutes les fonctionnalités d'IA.

## 🚀 Installation en mode développeur

1. Ouvrir la page `chrome://extensions/` dans Chrome.
2. Activer le **Mode développeur** en haut à droite.
3. Cliquer sur **Charger l'extension non empaquetée** puis sélectionner le dossier `robert-extension`.
4. Facultatif : épingler l'extension via l'icône puzzle pour un accès rapide.

## ⌨️ Raccourci clavier

Par défaut l'ouverture de la popup principale se fait avec :
- **Ctrl+Shift+E** sur Windows/Linux
- **Cmd+Shift+E** sur macOS

La combinaison peut être modifiée dans `chrome://extensions/shortcuts`.

## Fonctionnalités principales

- **Chat IA** : conversation instantanée avec Robert depuis la popup ou le widget intégré aux pages.
- **Vérifier** : analyse de fiabilité de la page courante via l'API `/chat/page/analyze`.
- **Résumer** : résumé automatique du texte principal de la page avec `/chat/page/resume`.
- **Email** : extraction et analyse d'un email ouvert pour détecter le phishing (`/chat/mail`).

Sur les domaines de l'UPHF (`ent.uphf.fr`, `mail.uphf.fr`, `moodle.uphf.fr`), un logo flottant apparaît pour ouvrir directement le chat.

## Architecture des fichiers

```
robert-extension/
├── manifest.json              # Déclaration de l'extension
├── scripts/                   # Logique JavaScript
│   ├── background.js          # Service worker (API, ouverture de popup)
│   ├── content.js             # Injecté dans toutes les pages (logo flottant, widget)
│   ├── chat-popup.js          # Fenêtre de chat utilisée par content.js
│   └── popup.js               # Gestion complète de la popup et de l'authentification
├── templates/                 # Vues HTML réutilisables
│   ├── popup.html
│   ├── chat-widget.html
│   ├── chat-popup.html
│   └── floating-logo.html
├── styles/                    # Feuilles de style CSS
│   ├── popup.css
│   ├── content.css
│   └── chat-popup.css
├── icons/
│   └── logo_Robert.png        # Icône principale
├── build.ps1 / package.bat    # Scripts pour générer une archive ZIP
└── dist/                      # Dossiers de sortie du packaging
    └── robert-extension-*.zip
```

### Composants JavaScript

- **popup.js** gère l'interface principale : connexion de l'utilisateur, boutons d'action (chat, vérification de page, résumé, analyse d'email) et communication avec l'API. Les tokens sont conservés dans `chrome.storage.local`.
- **content.js** est injecté sur toutes les pages. Il affiche le logo flottant sur les sites UPHF et peut créer un widget de chat intégré. L'historique de conversation est stocké côté utilisateur.
- **chat-popup.js** définit la petite fenêtre de chat utilisée quand le widget est ouvert depuis `content.js`.
- **background.js** agit comme service worker : il recharge les content scripts après mise à jour et relaie les requêtes vers l'API locale, évitant ainsi les restrictions CORS.

### Packaging

Le script PowerShell `build.ps1` (ou `package.bat` sous Windows) crée une archive ZIP de l'extension dans le dossier `dist/`. Cette archive peut être envoyée au Chrome Web Store ou installée manuellement via `chrome://extensions`.

## Débogage

- Ouvrir `chrome://extensions/` et cliquer sur **Erreurs** pour afficher toutes les traces de l'extension.
- Inspecter le **Service worker** (background.js) ou la **Popup** via les liens "Inspecter les vues".
- Les logs du script injecté (`content.js`) sont visibles dans la console de la page visitée.

## Système d'authentification

La popup comporte un formulaire de connexion qui envoie les identifiants à l'API `/auth/login`. Après authentification :
1. le token est stocké en local ;
2. l'état connecté est communiqué aux content scripts ;
3. la popup permet la déconnexion via `/auth/logout`.

L'extension se base sur ces informations pour autoriser les appels aux fonctionnalités d'IA.

---

Ce dépôt contient donc l'intégralité des ressources nécessaires pour exécuter et empaqueter l'extension Robert IA.
