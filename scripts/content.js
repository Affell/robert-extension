class RobertExtension {
    constructor() {
        this.chatPopup = null;
        this.floatingLogo = null;
        this.isInitialized = false;
        this.predefinedQuestions = [
            "Comment créer un mot de passe sécurisé ?",
            "Comment protéger mes données personnelles en ligne ?",
            "Quels sont les meilleurs outils pour protéger mon réseau ?",
            "Qu'est-ce que l'authentification à deux facteurs (2FA) ?",
        ];
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupMessageListener();
        this.checkForUPHFSites();
        this.isInitialized = true;
        
        console.log("Robert Extension initialisée sur:", window.location.href);
    }

    checkForUPHFSites() {
        const currentUrl = window.location.href;
        const uphfDomains = [
            'https://ent.uphf.fr/',
            'https://mail.uphf.fr/',
            'https://moodle.uphf.fr/'
        ];
        
        const isUPHFSite = uphfDomains.some(domain => currentUrl.startsWith(domain));
        
        if (isUPHFSite) {
            console.log('Site UPHF détecté, affichage du logo flottant');
            this.createFloatingLogo();
        }
    }

    async createFloatingLogo() {
        if (this.floatingLogo) return;

        this.floatingLogo = document.createElement('div');
        this.floatingLogo.className = 'robert-floating-logo';
        
        const logoHTML = await this.loadTemplate('templates/floating-logo.html');
        if (logoHTML) {
            this.floatingLogo.innerHTML = logoHTML;
            
            const logoImg = this.floatingLogo.querySelector('#floating-logo-img');
            if (logoImg) {
                logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
            }
        } else {
            console.error('Impossible de charger le template floating-logo.html');
            return;
        }

        this.floatingLogo.addEventListener('click', () => {
            console.log('Logo Robert cliqué, ouverture du chat');
            this.openChatWidget();
        });

        document.body.appendChild(this.floatingLogo);
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log("Message reçu:", request);
            
            switch (request.action) {
                case "openChat":
                    this.openChatWidget();
                    break;
                case "showVerificationResult":
                    this.showVerificationNotification(request.result);
                    break;
                case "showSummary":
                    this.showSummaryNotification(request.summary);
                    break;
                case "showEmailResult":
                    this.showEmailNotification(request.result);
                    break;
            }
            sendResponse({ success: true });
        });
    }

    async openChatWidget() {
        console.log("Ouverture de la popup de chat");
        
        // Si le popup existe déjà, le fermer
        if (this.chatPopup) {
            this.closeChatWidget();
            return;
        }
        
        // Créer directement le popup sans charger de script externe
        await this.createChatPopup();
    }

    async createChatPopup() {
        try {
            // Créer le container principal
            this.chatPopup = document.createElement('div');
            this.chatPopup.className = 'robert-chat-popup';

            // Charger le template HTML
            const templateHTML = await this.loadTemplate('templates/chat-popup.html');
            if (!templateHTML) {
                console.error('Impossible de charger le template chat-popup.html');
                return;
            }

            this.chatPopup.innerHTML = templateHTML;

            // Mettre à jour l'URL du logo
            const logoImg = this.chatPopup.querySelector('#chat-popup-logo');
            if (logoImg) {
                logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
            }

            // Configurer les event listeners
            this.setupChatEventListeners();

            // Initialiser les questions prédéfinies
            this.initializePredefinedQuestions();

            // Ajouter au DOM
            document.body.appendChild(this.chatPopup);

            console.log('Chat popup créé avec succès');
        } catch (error) {
            console.error('Erreur lors de la création du chat popup:', error);
        }
    }

    setupChatEventListeners() {
        // Bouton fermer
        const closeBtn = this.chatPopup.querySelector('#chat-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChatWidget());
        }

        // Input et bouton envoyer
        const input = this.chatPopup.querySelector('#chat-popup-input');
        const sendBtn = this.chatPopup.querySelector('#chat-popup-send');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendChatMessage());
        }
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendChatMessage();
                }
            });
        }
    }

    initializePredefinedQuestions() {
        const questionsContainer = this.chatPopup.querySelector('#chat-popup-questions');
        if (!questionsContainer) return;
        
        this.predefinedQuestions.forEach(question => {
            const btn = document.createElement('button');
            btn.className = 'question-btn';
            btn.textContent = question;
            btn.addEventListener('click', () => {
                this.handlePredefinedQuestion(question);
            });
            questionsContainer.appendChild(btn);
        });
    }

    handlePredefinedQuestion(question) {
        // Masquer l'écran de bienvenue
        const welcome = this.chatPopup.querySelector('#chat-popup-welcome');
        if (welcome) {
            welcome.style.display = 'none';
        }

        this.addChatMessage(question, 'user');
        
        // Simuler une réponse
        setTimeout(() => {
            this.addChatMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
        }, 1000);
    }

    sendChatMessage() {
        const input = this.chatPopup.querySelector('#chat-popup-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;

        // Masquer l'écran de bienvenue si c'est le premier message
        const welcome = this.chatPopup.querySelector('#chat-popup-welcome');
        if (welcome && welcome.style.display !== 'none') {
            welcome.style.display = 'none';
        }
        
        this.addChatMessage(message, 'user');
        input.value = '';
        
        // Simuler une réponse
        setTimeout(() => {
            this.addChatMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
        }, 1000);
    }

    addChatMessage(text, sender) {
        const messagesContainer = this.chatPopup.querySelector('#chat-popup-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.textContent = text;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    closeChatWidget() {
        if (this.chatPopup) {
            this.chatPopup.remove();
            this.chatPopup = null;
            console.log('Chat popup fermé');
        }
    }

    async loadTemplate(templatePath) {
        try {
            const response = await fetch(chrome.runtime.getURL(templatePath));
            const html = await response.text();
            return html;
        } catch (error) {
            console.error('Erreur lors du chargement du template:', error);
            return null;
        }
    }

    showVerificationNotification(result) {
        this.createNotification(
            result.error ? 'error' : (result.isTrustworthy ? 'success' : 'warning'),
            result.error || `Page ${result.isTrustworthy ? 'fiable' : 'suspecte'} (Score: ${result.score}/100)`
        );
    }

    showSummaryNotification(summary) {
        this.createNotification(
            summary.error ? 'error' : 'success',
            summary.error || summary.summary
        );
    }

    showEmailNotification(result) {
        if (!result.isEmail) {
            this.createNotification('warning', result.message);
            return;
        }
        
        const type = result.error ? 'error' : (result.isDangerous ? 'error' : 'success');
        this.createNotification(type, result.error || result.message);
    }

    createNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `robert-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        return notification;
    }
}

// Initialiser l'extension
new RobertExtension();
