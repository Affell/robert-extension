// Définir la classe ChatPopup globalement
window.ChatPopup = class ChatPopup {
    constructor(predefinedQuestions) {
        this.popup = null;
        this.predefinedQuestions = predefinedQuestions || [];
    }

    async create() {
        if (this.popup) {
            this.popup.remove();
        }

        // Créer le container principal
        this.popup = document.createElement('div');
        this.popup.className = 'robert-chat-popup';

        // Charger le template HTML
        const templateHTML = await this.loadTemplate('templates/chat-popup.html');
        if (!templateHTML) {
            console.error('Impossible de charger le template chat-popup.html');
            return null;
        }

        this.popup.innerHTML = templateHTML;

        // Injecter les styles CSS
        await this.loadStyles();

        // Mettre à jour l'URL du logo
        const logoImg = this.popup.querySelector('#chat-popup-logo');
        if (logoImg) {
            logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
        }

        // Configurer les event listeners
        this.setupEventListeners();

        // Initialiser les questions prédéfinies
        this.initializePredefinedQuestions();

        // Ajouter au DOM
        document.body.appendChild(this.popup);

        return this.popup;
    }

    async loadTemplate(templatePath) {
        try {
            const response = await fetch(chrome.runtime.getURL(templatePath));
            return await response.text();
        } catch (error) {
            console.error('Erreur lors du chargement du template:', error);
            return null;
        }
    }

    async loadStyles() {
        // Vérifier si les styles sont déjà chargés
        if (document.querySelector('link[href*="chat-popup.css"]')) {
            return;
        }

        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = chrome.runtime.getURL('styles/chat-popup.css');
        document.head.appendChild(styleLink);

        // Attendre que les styles se chargent
        return new Promise(resolve => {
            styleLink.onload = resolve;
            setTimeout(resolve, 300); // Fallback timeout
        });
    }

    setupEventListeners() {
        // Bouton fermer
        const closeBtn = this.popup.querySelector('#chat-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Input et bouton envoyer
        const input = this.popup.querySelector('#chat-popup-input');
        const sendBtn = this.popup.querySelector('#chat-popup-send');

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }
    }

    initializePredefinedQuestions() {
        const questionsContainer = this.popup.querySelector('#chat-popup-questions');
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
        const welcome = this.popup.querySelector('#chat-popup-welcome');
        if (welcome) {
            welcome.style.display = 'none';
        }

        this.addMessage(question, 'user');
        
        // Simuler une réponse
        setTimeout(() => {
            this.addMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
        }, 1000);
    }

    sendMessage() {
        const input = this.popup.querySelector('#chat-popup-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;

        // Masquer l'écran de bienvenue si c'est le premier message
        const welcome = this.popup.querySelector('#chat-popup-welcome');
        if (welcome && welcome.style.display !== 'none') {
            welcome.style.display = 'none';
        }
        
        this.addMessage(message, 'user');
        input.value = '';
        
        // Simuler une réponse
        setTimeout(() => {
            this.addMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
        }, 1000);
    }

    addMessage(text, sender) {
        const messagesContainer = this.popup.querySelector('#chat-popup-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        messageElement.textContent = text;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    close() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
    }

    isOpen() {
        return this.popup && document.body.contains(this.popup);
    }
};

console.log('ChatPopup class loaded and available globally');
