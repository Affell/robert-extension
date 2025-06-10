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
            console.log('=== CHAT POPUP - ENVOI QUESTION ===');
            console.log('Question:', question);
            
            this.addTypingIndicator();
            
            const response = await this.makeAuthenticatedRequest('/chat/query', {
                method: 'POST',
                body: JSON.stringify({
                    context: "extension",
                    query: question
                })
            });

            console.log('Réponse chat popup API:', response);
            this.removeTypingIndicator();
            
            if (response?.response) {
                this.addMessage(response.response, 'assistant');
            } else if (response?.data?.response) {
                this.addMessage(response.data.response, 'assistant');
            } else {
                console.warn('Format de réponse inattendu:', response);
                this.addMessage("Je n'ai pas pu traiter votre demande. Veuillez réessayer.", 'assistant');
            }
            
        } catch (error) {
            console.error('=== ERREUR CHAT POPUP ===');
            console.error('Error:', error);
            
            this.removeTypingIndicator();
            this.handleApiError(error);
        }
    }

    handleApiError(error) {
        console.log('Gestion erreur chat popup:', error.message);
        
        const errorMessages = {
            'Utilisateur non connecté': "🔒 Veuillez vous connecter pour utiliser le chat.",
            'Session expirée': "⏰ Votre session a expiré. Veuillez vous reconnecter.",
            'Erreur de communication avec l\'extension': "🔧 Erreur d'extension. Rechargez la page.",
            'Connexion impossible à l\'API. Vérifiez que Docker est démarré.': "🐳 API non disponible. Vérifiez que Docker est démarré."
        };
        
        const message = errorMessages[error.message] || `❌ Erreur: ${error.message}`;
        this.addMessage(message, 'assistant');
    }    async makeAuthenticatedRequest(endpoint, options = {}) {
        console.log('=== DÉBUT REQUÊTE CHAT POPUP ===');
        console.log('Endpoint:', endpoint);
        
        const { authToken } = await chrome.storage.local.get(['authToken']);
        console.log('Token disponible:', authToken ? 'OUI' : 'NON');

        if (!authToken) {
            console.error('❌ Pas de token dans chat popup');
            throw new Error('Utilisateur non connecté');
        }

        console.log('Envoi via background script...');
        
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'makeApiRequest',
                data: { endpoint, options, authToken }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Chrome Runtime Error:', chrome.runtime.lastError);
                    reject(new Error('Erreur de communication avec l\'extension'));
                    return;
                }

                console.log('Réponse chat popup:', response);

                if (!response) {
                    reject(new Error('Aucune réponse du serveur'));
                    return;
                }

                if (!response.success) {
                    reject(new Error(response.error || 'Erreur API inconnue'));
                    return;
                }

                resolve(response.data);
            });
        });
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
        console.log('🔍 Parsing markdown (popup):', text.substring(0, 100) + '...');
        
        // Nettoyer le texte d'entrée
        let html = text.trim();
        
        // 1. PROTECTION DES BLOCS DE CODE AVANT TOUT TRAITEMENT
        const codeBlocks = [];
        const inlineCode = [];
        
        // Protéger les blocs de code ```
        html = html.replace(/```([^`]+)```/g, (match, code) => {
            codeBlocks.push(code);
            return `__CODEBLOCK_${codeBlocks.length - 1}__`;
        });
        
        // Protéger le code inline `
        html = html.replace(/`([^`]+)`/g, (match, code) => {
            inlineCode.push(code);
            return `__INLINECODE_${inlineCode.length - 1}__`;
        });
        
        // 2. TRAITEMENT DES LIENS MARKDOWN
        html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi, (match, linkText, url) => {
            const cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
            const cleanText = linkText.trim();
            
            let icon = '🌐';
            if (url.includes('github')) icon = '🔗';
            else if (url.includes('doc') || cleanText.toLowerCase().includes('doc')) icon = '📖';
            else if (cleanText.includes('🌐')) icon = '🌐';
            
            const safeUrl = cleanUrl.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
            const safeText = cleanText.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
            
            return `<button onclick="window.open('${safeUrl}', '_blank')" class="link-btn" title="Ouvrir : ${safeText}">
                ${icon} ${cleanText}
            </button>`;
        });
        
        // 3. TRAITEMENT DES URLs SIMPLES
        html = html.replace(/(?<!<button[^>]*)(https?:\/\/[^\s<>\[\]"'()]+)/gi, (url) => {
            const cleanUrl = url.replace(/[.,;!?]+$/, '');
            const displayText = cleanUrl.length > 50 ? cleanUrl.substring(0, 50) + '...' : cleanUrl;
            const safeUrl = cleanUrl.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
            
            return `<button onclick="window.open('${safeUrl}', '_blank')" class="url-btn" title="Ouvrir : ${cleanUrl}">
                🌐 ${displayText}
            </button>`;
        });
        
        // 4. ÉCHAPPER LES CARACTÈRES HTML RESTANTS
        html = html.replace(/&(?!amp;|lt;|gt;|apos;|quot;)/g, '&amp;');
        
        // 5. FORMATAGE DE TEXTE AMÉLIORÉ - ORDRE IMPORTANT
        html = html.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+?)_/g, '<em>$1</em>');
        
        // 6. TITRES, LISTES, CITATIONS
        html = html.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>');
        html = html.replace(/^(\d+)\.\s(.+)$/gm, '<li class="markdown-oli">$2</li>');
        html = html.replace(/^[-*+]\s(.+)$/gm, '<li class="markdown-li">$2</li>');
        html = html.replace(/(<li class="markdown-oli">[^<]*<\/li>\s*)+/g, '<ol class="markdown-ol">$&</ol>');
        html = html.replace(/(<li class="markdown-li">[^<]*<\/li>\s*)+/g, '<ul class="markdown-ul">$&</ul>');
        html = html.replace(/^>\s(.+)$/gm, '<blockquote class="markdown-quote">$1</blockquote>');
        
        // 7. REMETTRE LES BLOCS DE CODE
        html = html.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
            return `<pre class="markdown-codeblock">${codeBlocks[index]}</pre>`;
        });
        
        html = html.replace(/__INLINECODE_(\d+)__/g, (match, index) => {
            return `<code class="markdown-code">${inlineCode[index]}</code>`;
        });
        
        // 8. GESTION AMÉLIORÉE DES SAUTS DE LIGNE ET PARAGRAPHES
        html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        html = html.replace(/\n\n+/g, '\n\n__PARAGRAPH_BREAK__\n\n');
        
        const paragraphs = html.split('__PARAGRAPH_BREAK__')
            .map(p => p.trim())
            .filter(p => p.length > 0);
        
        const processedParagraphs = paragraphs.map(paragraph => {
            let processed = paragraph.replace(/\n(?![#\-\*\+\d])/g, ' ');
            processed = processed.replace(/  \s*\n/g, '<br>');
            processed = processed.replace(/\s+/g, ' ').trim();
            return processed;
        });
        
        html = processedParagraphs
            .map(p => `<p class="markdown-p">${p}</p>`)
            .join('');
        
        // 9. NETTOYAGE FINAL
        html = html.replace(/[A-Z]+LINK[A-Z]*URL[^A-Z]*TEXT[^A-Z]*ICON[^A-Z]*END[^A-Z]*/gi, '');
        html = html.replace(/\$\d+/g, '');
        html = html.replace(/<p class="markdown-p">\s*<\/p>/g, '');
        
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
