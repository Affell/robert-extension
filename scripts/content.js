// Éviter la redéclaration si le script est déjà chargé
if (typeof window.RobertExtension === 'undefined') {
    
    class RobertExtension {
        constructor() {
            this.apiBaseUrl = 'http://localhost:5000';
            this.chatPopup = null;
            this.floatingLogo = null;
            this.isInitialized = false;
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
            // Écouter les changements dans le storage pour détecter connexion/déconnexion
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local') {
                    const authTokenChanged = changes.authToken;
                    const isLoggedInChanged = changes.isLoggedIn;
                    
                    if (authTokenChanged || isLoggedInChanged) {
                        console.log('Changement d\'état de connexion détecté:', {
                            authToken: authTokenChanged,
                            isLoggedIn: isLoggedInChanged
                        });
                        
                        // Revérifier l'affichage du logo
                        this.checkAuthAndUPHF();
                    }
                }
            });
        }

        async checkAuthAndUPHF() {
            // Vérifier d'abord si l'utilisateur est connecté
            try {
                const result = await chrome.storage.local.get(['authToken', 'isLoggedIn']);
                console.log('Vérification auth pour logo flottant:', {
                    hasToken: !!result.authToken,
                    isLoggedIn: result.isLoggedIn
                });
                
                if (!result.authToken || !result.isLoggedIn) {
                    // Pas connecté, masquer/supprimer le logo
                    console.log('Utilisateur non connecté, suppression du logo');
                    this.removeFloatingLogo();
                    return;
                }
            } catch (error) {
                console.error('Erreur vérification auth:', error);
                this.removeFloatingLogo();
                return;
            }
            
            // Si connecté, vérifier si on est sur un site UPHF
            const hostname = window.location.hostname;
            const isUPHFSite = hostname.endsWith('.uphf.fr') || hostname === 'uphf.fr';
            
            console.log('Vérification site UPHF:', {
                hostname: hostname,
                isUPHFSite: isUPHFSite
            });
            
            if (isUPHFSite) {
                console.log('Site UPHF détecté et utilisateur connecté, création du logo flottant');
                await this.createFloatingLogo();
            } else {
                console.log('Pas un site UPHF, suppression du logo');
                this.removeFloatingLogo();
            }
        }

        removeFloatingLogo() {
            if (this.floatingLogo && this.floatingLogo.parentNode) {
                console.log('Suppression du logo flottant');
                this.floatingLogo.remove();
                this.floatingLogo = null;
            }
        }

        async createFloatingLogo() {
            // Si le logo existe déjà, ne pas le recréer
            if (this.floatingLogo && document.body.contains(this.floatingLogo)) {
                console.log('Logo flottant déjà présent');
                return;
            }

            try {
                const logoHtml = await this.loadTemplate('floating-logo.html');
                
                this.floatingLogo = document.createElement('div');
                this.floatingLogo.className = 'robert-floating-logo';
                this.floatingLogo.innerHTML = logoHtml;

                // Définir l'URL de l'image après insertion
                const logoImg = this.floatingLogo.querySelector('#robert-logo-img');
                if (logoImg) {
                    logoImg.src = chrome.runtime.getURL('icons/logo_robert.png');
                }

                this.floatingLogo.addEventListener('click', () => this.openChatWidget());
                document.body.appendChild(this.floatingLogo);
                console.log('Logo flottant créé et ajouté au DOM');
            } catch (error) {
                console.error('Erreur lors de la création du logo flottant:', error);
            }
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                try {
                    switch (request.action) {
                        case "openChat":
                            this.openChatWidget();
                            sendResponse({ success: true });
                            break;
                        case "showVerificationResult":
                            // Plus de notifications - les erreurs sont gérées dans la popup
                            sendResponse({ success: true });
                            break;
                        case "showSummary":
                            // Plus de notifications - les erreurs sont gérées dans la popup
                            sendResponse({ success: true });
                            break;
                        case "showEmailResult":
                            // Plus de notifications - les erreurs sont gérées dans la popup
                            sendResponse({ success: true });
                            break;
                        default:
                            sendResponse({ success: false, error: "Action non reconnue" });
                    }
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                
                return true;
            });
        }

        openChatWidget() {
            console.log("Ouverture du chat");
            
            if (this.chatPopup) {
                this.closeChatWidget();
                return;
            }
            
            this.createChatPopup();
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
            try {
                const templateUrl = chrome.runtime.getURL(`templates/${templateName}`);
                const response = await fetch(templateUrl);
                
                if (!response.ok) {
                    throw new Error(`Erreur de chargement du template: ${response.status}`);
                }
                
                return await response.text();
            } catch (error) {
                console.error(`Erreur lors du chargement du template ${templateName}:`, error);
                throw error;
            }
        }

        async makeAuthenticatedRequest(endpoint, options = {}) {
            try {
                const result = await chrome.storage.local.get(['authToken']);
                const token = result.authToken;

                if (!token) {
                    throw new Error('Utilisateur non connecté');
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Robert-Connect-Token': token,
                    ...options.headers
                };

                const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                    ...options,
                    headers
                });

                if (response.status === 401) {
                    throw new Error('Session expirée');
                }

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || `Erreur HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                throw error;
            }
        }

        handleQuestion(question) {
            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome) welcome.style.display = 'none';

            this.addMessage(question, 'user');
            
            // Envoyer la question à l'API au lieu de simuler
            this.sendQuestionToAPI(question);
        }

        sendMessage() {
            const input = this.chatPopup.querySelector('#robert-chat-input');
            const message = input.value.trim();
            if (!message) return;

            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome && welcome.style.display !== 'none') {
                welcome.style.display = 'none';
            }
            
            this.addMessage(message, 'user');
            input.value = '';
            
            // Envoyer le message à l'API
            this.sendQuestionToAPI(message);
        }

        async sendQuestionToAPI(question) {
            try {
                this.addTypingIndicator();
                
                const response = await this.makeAuthenticatedRequest('/chat/message', {
                    method: 'POST',
                    body: JSON.stringify({
                        message: question,
                        context: {
                            url: window.location.href,
                            title: document.title
                        }
                    })
                });

                this.removeTypingIndicator();
                
                if (response.success && response.message) {
                    this.addMessage(response.message, 'assistant');
                } else {
                    this.addMessage("Je n'ai pas pu traiter votre demande. Veuillez réessayer.", 'assistant');
                }
                
            } catch (error) {
                this.removeTypingIndicator();
                
                if (error.message === 'Utilisateur non connecté') {
                    this.addMessage("Veuillez vous connecter pour utiliser le chat.", 'assistant');
                } else if (error.message === 'Session expirée') {
                    this.addMessage("Votre session a expiré. Veuillez vous reconnecter.", 'assistant');
                } else {
                    this.addMessage("Erreur de connexion. Veuillez réessayer plus tard.", 'assistant');
                }
            }
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
            messageEl.textContent = text;
            
            messagesContainer.appendChild(messageEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        closeChatWidget() {
            if (this.chatPopup) {
                this.chatPopup.remove();
                this.chatPopup = null;
                console.log('Chat fermé');
            }
        }
    }

    window.RobertExtension = RobertExtension;
    window.robertExtensionInstance = new RobertExtension();
    
} else {
    console.log('RobertExtension déjà initialisée');
}
