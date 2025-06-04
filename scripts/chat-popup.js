// Extension Robert IA - Chat Popup Class
window.ChatPopup = class ChatPopup {
    constructor(predefinedQuestions = []) {
        this.popup = null;
        this.predefinedQuestions = predefinedQuestions;
    }    async create() {
        if (this.popup) {
            this.popup.remove();
        }

        this.popup = document.createElement('div');
        this.popup.className = 'robert-chat-popup';

        const templateHTML = await this.loadTemplate('templates/chat-popup.html');
        if (!templateHTML) {
            console.error('Impossible de charger le template chat-popup.html');
            return null;
        }

        this.popup.innerHTML = templateHTML;
        await this.loadStyles();

        const logoImg = this.popup.querySelector('#chat-popup-logo');
        if (logoImg) {
            logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
        }

        this.setupEventListeners();
        this.initializePredefinedQuestions();
        document.body.appendChild(this.popup);

        return this.popup;
    }    async loadTemplate(templatePath) {
        const response = await fetch(chrome.runtime.getURL(templatePath));
        return await response.text();
    }    async loadStyles() {
        if (document.querySelector('link[href*="chat-popup.css"]')) {
            return;
        }

        const styleLink = document.createElement('link');
        styleLink.rel = 'stylesheet';
        styleLink.href = chrome.runtime.getURL('styles/chat-popup.css');
        document.head.appendChild(styleLink);

        return new Promise(resolve => {
            styleLink.onload = resolve;
            setTimeout(resolve, 300);
        });
    }    setupEventListeners() {
        const closeBtn = this.popup.querySelector('#chat-popup-close');
        const input = this.popup.querySelector('#chat-popup-input');
        const sendBtn = this.popup.querySelector('#chat-popup-send');

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
    }    initializePredefinedQuestions() {
        const questionsContainer = this.popup.querySelector('#chat-popup-questions');
        if (!questionsContainer) return;
        
        this.predefinedQuestions.forEach(question => {
            const btn = document.createElement('button');
            btn.className = 'question-btn';
            btn.textContent = question;
            btn.addEventListener('click', () => this.handlePredefinedQuestion(question));
            questionsContainer.appendChild(btn);
        });
    }    handlePredefinedQuestion(question) {
        const welcome = this.popup.querySelector('#chat-popup-welcome');
        if (welcome) welcome.classList.add('hidden');

        this.addMessage(question, 'user');
        this.sendQuestionToAPI(question);
    }    sendMessage() {
        const input = this.popup.querySelector('#chat-popup-input');
        if (!input) return;
        
        const message = input.value.trim();
        if (!message) return;

        const welcome = this.popup.querySelector('#chat-popup-welcome');
        if (welcome && !welcome.classList.contains('hidden')) {
            welcome.classList.add('hidden');
        }
          
        this.addMessage(message, 'user');
        input.value = '';
        this.sendQuestionToAPI(message);
    }async sendQuestionToAPI(question) {
        try {
            this.addTypingIndicator();
            
            const response = await this.makeAuthenticatedRequest('/chat/query', {
                method: 'POST',
                body: JSON.stringify({
                    context: "extension",
                    query: question
                })
            });

            this.removeTypingIndicator();
            
            if (response?.response) {
                this.addMessage(response.response, 'assistant');
            } else {
                this.addMessage("Je n'ai pas pu traiter votre demande. Veuillez réessayer.", 'assistant');
            }
            
        } catch (error) {
            this.removeTypingIndicator();
            this.handleApiError(error);
        }
    }

    handleApiError(error) {
        const errorMessages = {
            'Utilisateur non connecté': "Veuillez vous connecter pour utiliser le chat.",
            'Session expirée': "Votre session a expiré. Veuillez vous reconnecter."
        };
        
        const message = errorMessages[error.message] || "Erreur de connexion. Veuillez réessayer plus tard.";
        this.addMessage(message, 'assistant');
    }    async makeAuthenticatedRequest(endpoint, options = {}) {
        const { authToken } = await chrome.storage.local.get(['authToken']);

        if (!authToken) {
            throw new Error('Utilisateur non connecté');
        }

        const response = await chrome.runtime.sendMessage({
            action: 'makeApiRequest',
            data: { endpoint, options, authToken }
        });

        if (!response.success) {
            throw new Error(response.error);
        }

        return response.data;
    }

    addTypingIndicator() {
        const messagesContainer = this.popup.querySelector('#chat-popup-messages');
        
        const typingEl = document.createElement('div');
        typingEl.className = 'chat-message assistant typing-indicator';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = '⚡ Robert réfléchit...';
        
        messagesContainer.appendChild(typingEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }    removeTypingIndicator() {
        const typingIndicator = this.popup?.querySelector('#typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }    addMessage(text, sender) {
        const messagesContainer = this.popup.querySelector('#chat-popup-messages');
        if (!messagesContainer) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${sender}`;
        
        if (sender === 'assistant') {
            messageElement.innerHTML = this.parseMarkdown(text);
        } else {
            messageElement.textContent = text;
        }
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }    parseMarkdown(text) {
        let html = text.replace(/\n/g, '<br>');
        
        // Formatage de texte
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code class="markdown-code">$1</code>');
        
        // Listes et titres
        html = html.replace(/^[-*]\s(.+)/gm, '<li class="markdown-li">$1</li>');
        html = html.replace(/^### (.*)/gm, '<h3 class="markdown-h3">$1</h3>');
        html = html.replace(/^## (.*)/gm, '<h2 class="markdown-h2">$1</h2>');
        html = html.replace(/^# (.*)/gm, '<h1 class="markdown-h1">$1</h1>');
        
        // Boutons pour liens
        html = this.convertLinksToButtons(html);
        
        return html;
    }    convertLinksToButtons(html) {
        // Liens markdown [texte](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            return `<button onclick="window.open('${url}', '_blank')" class="link-btn">
                🔗 ${text}
            </button>`;
        });
        
        // URLs directes
        html = html.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
            const displayText = url.length > 30 ? url.substring(0, 30) + '...' : url;
            return `<button onclick="window.open('${url}', '_blank')" class="url-btn">
                🌐 ${displayText}
            </button>`;
        });
        
        return html;
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
