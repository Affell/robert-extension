# Extension Robert IA

Extension Chrome pour interagir avec l'IA Robert depuis n'importe quelle page web.

## 🚀 Installation et Test en Mode Développeur

### Prérequis
- Google Chrome ou Chromium
- Fichiers de l'extension dans ce dossier

### Étapes pour tester l'extension

1. **Ouvrir Chrome et aller aux extensions**
   ```
   chrome://extensions/
   ```

2. **Activer le mode développeur**
   - Cliquer sur le bouton "Mode développeur" en haut à droite
   - Il doit être activé (bleu)

3. **Charger l'extension**
   - Cliquer sur "Charger l'extension non empaquetée"
   - Sélectionner le dossier `robert-extension`
   - L'extension apparaît dans la liste

4. **Épingler l'extension**
   - Cliquer sur l'icône puzzle dans la barre d'outils Chrome
   - Cliquer sur l'épingle à côté de "Extension Robert IA"

## ⌨️ Raccourci Clavier

L'extension propose un raccourci clavier pour un accès rapide :

### Windows/Linux
- **Ctrl+Shift+E** : Ouvrir la popup principale

### macOS
- **Cmd+Shift+E** : Ouvrir la popup principale

### Personnaliser le raccourci
1. Aller à `chrome://extensions/shortcuts`
2. Trouver "Extension Robert IA"
3. Modifier la combinaison selon vos préférences

## 🎯 Fonctionnalités Spéciales UPHF

L'extension détecte automatiquement les sites UPHF et affiche des fonctionnalités supplémentaires :

### Sites supportés
- **https://ent.uphf.fr/** - ENT UPHF
- **https://mail.uphf.fr/** - Messagerie UPHF  
- **https://moodle.uphf.fr/** - Moodle UPHF

### Logo flottant
Sur ces sites, un logo Robert IA apparaît en bas à droite de la page :
- 🔥 **Animation flottante** pour attirer l'attention  
- 💬 **Clic direct** pour ouvrir le chat avec Robert
- 🎯 **Tooltip informatif** au survol
- ✨ **Design discret** qui s'intègre naturellement

**Note** : Pour accéder à toutes les fonctionnalités (Vérifier, Résumer, Email), utilisez l'icône d'extension dans la barre d'outils Chrome ou le raccourci **Ctrl+Shift+E**.

## 📧 **EMAIL**
- **Détecte** automatiquement si vous êtes sur Gmail/Outlook/Yahoo/Zimbra
- **Extrait** le contenu et sujet de l'email ouvert
- **Analyse** les risques de phishing
- **Alerte** si l'email semble dangereux

#### Providers d'email supportés :
- **Gmail** - Interface web standard
- **Outlook** - Outlook Web App
- **Yahoo Mail** - Interface web
- **Zimbra** - Serveur de messagerie UPHF et entreprises

## 🔧 Structure du Projet

```
robert-extension/
├── manifest.json              # Configuration de l'extension
├── scripts/
│   ├── popup.js              # Logique du popup principal
│   ├── content.js            # Script injecté + détection UPHF
│   └── background.js         # Service worker
├── styles/
│   ├── popup.css             # Styles du popup principal
│   └── content.css           # Styles du chat widget + logo flottant
├── templates/
│   ├── popup.html            # Interface du popup principal
│   ├── chat-widget.html      # Template HTML du chat widget
│   ├── chat-welcome.html     # Template HTML du message de bienvenue
│   └── floating-logo.html    # Template HTML du logo flottant
├── icons/
│   └── logo_robert.png       # Logo de l'extension
└── README.md                 # Documentation
```

### 🐛 Débogage

**Méthode Rapide : Section "Erreurs"**
1. Aller à `chrome://extensions/`
2. Cliquer sur **"Erreurs"** (bouton rouge s'il y a des erreurs)
3. Voir toutes les erreurs centralisées avec stack trace complète

**Autres Consoles de Débogage**
- **Console du Background Script** : `chrome://extensions/` → "Inspecter les vues : service worker"
- **Console du Popup** : Ouvrir popup → Clic droit → "Inspecter l'élément"
- **Console de la Page Web** : F12 pour voir les logs du content script

### 🔄 Rechargement après Modifications

Après chaque modification du code :
1. Aller à `chrome://extensions/`
2. Cliquer sur l'icône de rechargement ↻ de l'extension
3. Ou utiliser Ctrl+R sur la page des extensions

### 💡 Accès aux Fonctionnalités

**🎯 Logo flottant UPHF** : Accès direct au chat avec Robert
**🔧 Popup d'extension** : Accès complet à toutes les fonctionnalités
**⌨️ Raccourci clavier** : Ctrl+Shift+E pour ouvrir la popup
**👤 Mon Compte** : Redirection vers ENT UPHF pour connexion (temporaire)

### 🔐 Système de Connexion

L'extension propose une section "Mon Compte" qui :
- **Affiche** l'état de connexion (connecté/non connecté)
- **Redirige** vers le site externe pour l'authentification
- **Stocke** les informations de session localement
- **Permet** la déconnexion depuis l'extension

**Note** : Actuellement configuré pour rediriger vers l'ENT UPHF en attendant l'intégration du site Robert IA.

### 💡 Architecture

L'extension suit maintenant une architecture propre avec séparation des préoccupations :
- **HTML** : Templates dans le dossier `templates/`
- **CSS** : Styles dans le dossier `styles/`
- **JavaScript** : Logique dans le dossier `scripts/`

Cette séparation améliore la maintenabilité et suit les bonnes pratiques de développement.

