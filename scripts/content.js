// Extension Robert IA - Content Script
if (typeof window.RobertExtension === 'undefined') {
    
    class RobertExtension {
        constructor() {
            this.chatPopup = null;
            this.floatingLogo = null;
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.predefinedQuestions = [
                "Comment créer un mot de passe sécurisé ?",
                "Comment protéger mes données personnelles en ligne ?",
                "Quels sont les meilleurs outils pour protéger mon réseau ?",
                "Qu'est-ce que l'authentification à deux facteurs (2FA) ?"
            ];
            this.init();
        }

        init() {
            if (this.isInitialized) return;
            
            this.setupMessageListener();
            this.setupStorageListener();
            this.checkAuthAndUPHF();
            this.isInitialized = true;
        }

        setupStorageListener() {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && (changes.authToken || changes.isLoggedIn)) {
                    this.checkAuthAndUPHF();
                }
            });
        }

        async checkAuthAndUPHF() {
            try {
                const { authToken, isLoggedIn } = await chrome.storage.local.get(['authToken', 'isLoggedIn']);
                
                // Vérifier l'état d'authentification
                this.isAuthenticated = !!(authToken && isLoggedIn);

                const isUPHFSite = window.location.hostname.endsWith('.uphf.fr') || 
                                  window.location.hostname === 'uphf.fr';
                
                if (isUPHFSite) {
                    // Toujours afficher le logo sur les sites UPHF
                    await this.createFloatingLogo();
                } else {
                    this.removeFloatingLogo();
                }
            } catch (error) {
                console.error('Erreur vérification auth:', error);
                this.isAuthenticated = false;
                // Garder le logo si on est sur UPHF même en cas d'erreur
                const isUPHFSite = window.location.hostname.endsWith('.uphf.fr') || 
                                  window.location.hostname === 'uphf.fr';
                if (isUPHFSite) {
                    await this.createFloatingLogo();
                } else {
                    this.removeFloatingLogo();
                }
            }
        }

        removeFloatingLogo() {
            if (this.floatingLogo?.parentNode) {
                this.floatingLogo.remove();
                this.floatingLogo = null;
            }
        }

        async createFloatingLogo() {
            if (this.floatingLogo && document.body.contains(this.floatingLogo)) {
                return;
            }

            try {
                const logoHtml = await this.loadTemplate('floating-logo.html');
                
                this.floatingLogo = document.createElement('div');
                this.floatingLogo.className = 'robert-floating-logo';
                this.floatingLogo.innerHTML = logoHtml;

                const logoImg = this.floatingLogo.querySelector('#robert-logo-img');
                if (logoImg) {
                    logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
                }

                // Adapter le comportement selon l'état d'authentification
                this.floatingLogo.addEventListener('click', () => {
                    if (this.isAuthenticated) {
                        this.openChatWidget();
                    } else {
                        this.openExtensionPopup();
                    }
                });
                
                document.body.appendChild(this.floatingLogo);
            } catch (error) {
                console.error('Erreur création logo flottant:', error);
            }
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                const actions = {
                    "openChat": () => this.openChatWidget(),
                    "showVerificationResult": () => {},
                    "showSummary": () => {},
                    "showEmailResult": () => {},
                    "authStateChanged": () => this.handleAuthStateChanged(request.isLoggedIn)
                };

                try {
                    if (actions[request.action]) {
                        actions[request.action]();
                        sendResponse({ success: true });
                    } else {
                        sendResponse({ success: false, error: "Action non reconnue" });
                    }
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                
                return true;
            });
        }

        openChatWidget() {
            if (this.chatPopup) {
                this.closeChatWidget();
                return;
            }
            this.createChatPopup();
        }

        openExtensionPopup() {
            console.log('Ouverture de l\'extension popup...');
            // Envoyer un message au background script pour ouvrir l'extension
            chrome.runtime.sendMessage({ action: 'openPopup' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn('Impossible d\'ouvrir le popup:', chrome.runtime.lastError);
                } else {
                    console.log('Extension popup ouverte avec succès');
                }
            });
        }

        async createChatPopup() {
            try {
                const chatHtml = await this.loadTemplate('chat-widget.html');
                
                this.chatPopup = document.createElement('div');
                this.chatPopup.className = 'robert-chat-popup';
                this.chatPopup.innerHTML = chatHtml;

                // Définir l'URL de l'image après insertion
                const chatLogo = this.chatPopup.querySelector('#robert-chat-logo');
                if (chatLogo) {
                    chatLogo.src = chrome.runtime.getURL('icons/logo_robert.png');
                }

                // Event listeners
                this.chatPopup.querySelector('#robert-close-chat').addEventListener('click', () => this.closeChatWidget());
                this.chatPopup.querySelector('#robert-send-btn').addEventListener('click', () => this.sendMessage());
                this.chatPopup.querySelector('#robert-chat-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                });

                // Ajouter les questions prédéfinies
                const questionsContainer = this.chatPopup.querySelector('#robert-questions');
                this.predefinedQuestions.forEach(question => {
                    const btn = document.createElement('button');
                    btn.className = 'robert-question-btn';
                    btn.textContent = question;
                    btn.addEventListener('click', () => this.handleQuestion(question));
                    questionsContainer.appendChild(btn);
                });

                document.body.appendChild(this.chatPopup);
            } catch (error) {
                console.error('Erreur lors de la création du chat:', error);
            }
        }

        async loadTemplate(templateName) {
            const templateUrl = chrome.runtime.getURL(`templates/${templateName}`);
            const response = await fetch(templateUrl);
            
            if (!response.ok) {
                throw new Error(`Erreur de chargement du template: ${response.status}`);
            }
            
            return await response.text();
        }

        async makeAuthenticatedRequest(endpoint, options = {}) {
            console.log('=== DÉBUT REQUÊTE AUTHENTIFIÉE ===');
            console.log('Endpoint:', endpoint);
            console.log('Options:', options);
            
            const { authToken } = await chrome.storage.local.get(['authToken']);
            console.log('Token récupéré:', authToken ? 'OUI' : 'NON');
            
            if (!authToken) {
                console.error('❌ Aucun token d\'authentification trouvé');
                throw new Error('Utilisateur non connecté');
            }

            console.log('Envoi de la requête via background script...');
            
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'makeApiRequest',
                    data: { endpoint, options, authToken }
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ Erreur Chrome Runtime:', chrome.runtime.lastError);
                        reject(new Error('Erreur de communication avec l\'extension'));
                        return;
                    }
                    
                    console.log('Réponse reçue du background:', response);
                    
                    if (!response) {
                        console.error('❌ Aucune réponse du background script');
                        reject(new Error('Aucune réponse du serveur'));
                        return;
                    }

                    if (!response.success) {
                        console.error('❌ Échec de la requête API:', response.error);
                        reject(new Error(response.error || 'Erreur API inconnue'));
                        return;
                    }

                    console.log('✅ Requête API réussie');
                    resolve(response.data);
                });
            });
        }

        handleQuestion(question) {
            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome) welcome.classList.add('hidden');

            this.addMessage(question, 'user');
            this.sendQuestionToAPI(question);
        }

        sendMessage() {
            const input = this.chatPopup.querySelector('#robert-chat-input');
            const message = input.value.trim();
            if (!message) return;

            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome && !welcome.classList.contains('hidden')) {
                welcome.classList.add('hidden');
            }
            
            this.addMessage(message, 'user');
            input.value = '';
            this.sendQuestionToAPI(message);
        }

        async sendQuestionToAPI(question) {
            try {
                console.log('=== ENVOI QUESTION À L\'API ===');
                console.log('Question:', question);
                
                this.addTypingIndicator();
                
                const response = await this.makeAuthenticatedRequest('/chat/query', {
                    method: 'POST',
                    body: JSON.stringify({
                        context: "extension",
                        query: question
                    })
                });

                console.log('Réponse API reçue:', response);
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
                console.error('=== ERREUR ENVOI QUESTION ===');
                console.error('Type:', error.name);
                console.error('Message:', error.message);
                console.error('Stack:', error.stack);
                
                this.removeTypingIndicator();
                this.handleApiError(error);
            }
        }

        handleApiError(error) {
            console.log('Gestion de l\'erreur API:', error.message);
            
            const errorMessages = {
                'Utilisateur non connecté': "🔒 Veuillez vous connecter pour utiliser le chat.",
                'Session expirée': "⏰ Votre session a expiré. Veuillez vous reconnecter.",
                'Erreur de communication avec l\'extension': "🔧 Erreur d'extension. Rechargez la page.",
                'Connexion impossible à l\'API. Vérifiez que Docker est démarré.': "🐳 API non disponible. Vérifiez que Docker est démarré."
            };
            
            const message = errorMessages[error.message] || `❌ Erreur: ${error.message}`;
            this.addMessage(message, 'assistant');
        }

        addTypingIndicator() {
            const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
            
            const typingEl = document.createElement('div');
            typingEl.className = 'robert-message robert-message-assistant robert-typing';
            typingEl.id = 'robert-typing-indicator';
            typingEl.innerHTML = '⚡ Robert réfléchit...';
            
            messagesContainer.appendChild(typingEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        removeTypingIndicator() {
            const typingIndicator = this.chatPopup?.querySelector('#robert-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        addMessage(text, sender) {
            const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
            
            const messageEl = document.createElement('div');
            messageEl.className = `robert-message robert-message-${sender}`;
            
            if (sender === 'assistant') {
                // Parser le markdown pour les réponses de l'assistant
                messageEl.innerHTML = this.parseMarkdown(text);
            } else {
                messageEl.textContent = text;
            }
            
            messagesContainer.appendChild(messageEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        parseMarkdown(text) {
            // Convertir les sauts de ligne
            let html = text.replace(/\n/g, '<br>');
            
            // Gras (**texte** ou __texte__)
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
            
            // Italique (*texte* ou _texte_)
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html = html.replace(/_(.*?)_/g, '<em>$1</em>');
            
            // Code inline (`code`)
            html = html.replace(/`(.*?)`/g, '<code class="robert-markdown-code">$1</code>');
            
            // Listes non ordonnées (- item ou * item)
            html = html.replace(/^[-*]\s(.+)/gm, '<li class="robert-markdown-li">$1</li>');
            
            // Titres (# Titre)
            html = html.replace(/^### (.*)/gm, '<h3 class="robert-markdown-h3">$1</h3>');
            html = html.replace(/^## (.*)/gm, '<h2 class="robert-markdown-h2">$1</h2>');
            html = html.replace(/^# (.*)/gm, '<h1 class="robert-markdown-h1">$1</h1>');
            
            // Liens [texte](url) - convertis en boutons
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
                return `<button onclick="window.open('${url}', '_blank')" class="robert-link-btn">
                    🔗 ${text}
                </button>`;
            });
            
            // URLs simples (http/https) - convertis en boutons
            html = html.replace(/(https?:\/\/[^\s<>"]+)/gi, (url) => {
                const displayText = url.length > 30 ? url.substring(0, 30) + '...' : url;
                return `<button onclick="window.open('${url}', '_blank')" class="robert-url-btn">
                    🌐 ${displayText}
                </button>`;
            });
            
            return html;
        }

        closeChatWidget() {
            if (this.chatPopup) {
                this.chatPopup.remove();
                this.chatPopup = null;
            }
        }

        handleAuthStateChanged(isLoggedIn) {
            console.log('État d\'authentification changé:', isLoggedIn);
            
            this.isAuthenticated = isLoggedIn;
            
            if (!isLoggedIn) {
                // L'utilisateur s'est déconnecté - fermer le chat mais garder le logo
                this.closeChatWidget();
            }
            
            // Le logo reste affiché sur les sites UPHF dans tous les cas
            const isUPHFSite = window.location.hostname.endsWith('.uphf.fr') || 
                              window.location.hostname === 'uphf.fr';
            if (isUPHFSite && !this.floatingLogo) {
                this.createFloatingLogo();
            }
        }
    }

    window.RobertExtension = RobertExtension;
    window.robertExtensionInstance = new RobertExtension();
    
} else {
    console.log('RobertExtension déjà initialisée');
}
