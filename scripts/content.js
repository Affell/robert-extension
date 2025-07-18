// Extension Robert IA - Content Script
if (typeof window.RobertExtension === 'undefined') {
    
    class RobertExtension {        constructor() {
            this.chatPopup = null;
            this.floatingLogo = null;
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.chatHistory = []; // Historique des messages
            this.isRestoringHistory = false; // Flag pour éviter les animations pendant la restauration
            this.predefinedQuestions = [
                "Comment créer un mot de passe sécurisé ?",
                "Comment protéger mes données personnelles en ligne ?",
                "Quels sont les meilleurs outils pour protéger mon réseau ?",
                "Qu'est-ce que l'authentification à deux facteurs (2FA) ?"
            ];
            this.init();
        }init() {
            if (this.isInitialized) return;
            
            this.setupMessageListener();
            this.setupStorageListener();
            this.loadChatHistory(); // Charger l'historique au démarrage
            this.checkAuthAndUPHF();
            this.isInitialized = true;
        }        setupStorageListener() {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName === 'local' && (changes.authToken || changes.isLoggedIn)) {
                    this.checkAuthAndUPHF();
                }
            });
        }

        // Charger l'historique des conversations depuis le stockage
        async loadChatHistory() {
            try {
                const { chatHistory } = await chrome.storage.local.get(['chatHistory']);
                this.chatHistory = chatHistory || [];
                console.log('Historique de chat chargé:', this.chatHistory.length, 'messages');
            } catch (error) {
                console.error('Erreur lors du chargement de l\'historique:', error);
                this.chatHistory = [];
            }
        }

        // Sauvegarder l'historique des conversations
        async saveChatHistory() {
            try {
                await chrome.storage.local.set({ chatHistory: this.chatHistory });
                console.log('Historique de chat sauvegardé:', this.chatHistory.length, 'messages');
            } catch (error) {
                console.error('Erreur lors de la sauvegarde de l\'historique:', error);
            }
        }        // Ajouter un message à l'historique
        addToHistory(text, sender) {
            const message = {
                text: text,
                sender: sender,
                timestamp: Date.now()
            };
            this.chatHistory.push(message);
            
            // Limiter l'historique à 100 messages pour éviter une surcharge
            if (this.chatHistory.length > 100) {
                this.chatHistory = this.chatHistory.slice(-100);
            }
            
            this.saveChatHistory();
        }

        // Effacer l'historique des conversations
        async clearChatHistory() {
            this.chatHistory = [];
            await this.saveChatHistory();
            console.log('Historique de chat effacé');
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

                // Toujours ouvrir l'extension popup, peu importe l'état d'authentification
                this.floatingLogo.addEventListener('click', () => {
                    this.openExtensionPopup();
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
                }                // Event listeners
                this.chatPopup.querySelector('#robert-close-chat').addEventListener('click', () => this.closeChatWidget());
                this.chatPopup.querySelector('#robert-clear-chat').addEventListener('click', () => this.clearChatAndHistory());
                this.chatPopup.querySelector('#robert-send-btn').addEventListener('click', () => this.sendMessage());
                this.chatPopup.querySelector('#robert-chat-input').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                });// Ajouter les questions prédéfinies
                const questionsContainer = this.chatPopup.querySelector('#robert-questions');
                this.predefinedQuestions.forEach(question => {
                    const btn = document.createElement('button');
                    btn.className = 'robert-question-btn';
                    btn.textContent = question;
                    btn.addEventListener('click', () => this.handleQuestion(question));
                    questionsContainer.appendChild(btn);
                });

                // Restaurer l'historique des conversations
                this.restoreChatHistory();

                document.body.appendChild(this.chatPopup);            } catch (error) {
                console.error('Erreur lors de la création du chat:', error);
            }
        }        // Restaurer l'historique des conversations dans le chat
        restoreChatHistory() {
            if (!this.chatPopup || this.chatHistory.length === 0) return;

            console.log('Restauration de l\'historique:', this.chatHistory.length, 'messages');

            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome && this.chatHistory.length > 0) {
                welcome.classList.add('hidden');
            }

            // Marquer qu'on est en train de restaurer l'historique
            this.isRestoringHistory = true;

            // Afficher tous les messages de l'historique
            this.chatHistory.forEach(message => {
                this.addMessageToUI(message.text, message.sender);
            });

            // Fin de la restauration
            this.isRestoringHistory = false;

            // Scroller vers le bas pour afficher les derniers messages
            setTimeout(() => {
                const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
                if (messagesContainer) {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    console.log('Chat scrollé vers le bas après restauration de l\'historique');
                }
            }, 100);
        }

        // Effacer le chat et l'historique
        async clearChatAndHistory() {
            if (!this.chatPopup) return;

            // Demander confirmation
            if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique de conversation ?')) {
                // Effacer l'historique stocké
                await this.clearChatHistory();
                
                // Effacer l'interface du chat
                const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="robert-chat-welcome" id="robert-chat-welcome">
                            <h3>Bonjour ! 👋</h3>
                            <p>Je suis Robert, votre assistant IA spécialisé en cybersécurité. Comment puis-je vous aider ?</p>
                            <div class="robert-questions-container" id="robert-questions"></div>
                        </div>
                    `;
                    
                    // Remettre les questions prédéfinies
                    const questionsContainer = this.chatPopup.querySelector('#robert-questions');
                    this.predefinedQuestions.forEach(question => {
                        const btn = document.createElement('button');
                        btn.className = 'robert-question-btn';
                        btn.textContent = question;
                        btn.addEventListener('click', () => this.handleQuestion(question));
                        questionsContainer.appendChild(btn);
                    });
                }
                
                console.log('Chat et historique effacés');
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
        }        addTypingIndicator() {
            const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
            
            // Supprimer l'indicateur existant s'il y en a un
            const existingIndicator = messagesContainer.querySelector('#robert-typing-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
              const typingEl = document.createElement('div');
            typingEl.className = 'robert-message robert-message-assistant robert-typing';
            typingEl.id = 'robert-typing-indicator';
            typingEl.innerHTML = '<div style="display: flex; align-items: center; gap: 0.5rem;"><div style="width: 8px; height: 8px; background: #f97316; border-radius: 50%; animation: typing-pulse 1.5s infinite;"></div><div style="width: 8px; height: 8px; background: #f97316; border-radius: 50%; animation: typing-pulse 1.5s infinite 0.2s;"></div><div style="width: 8px; height: 8px; background: #f97316; border-radius: 50%; animation: typing-pulse 1.5s infinite 0.4s;"></div><span style="margin-left: 0.5rem; color: #ffffff !important;">Robert réfléchit...</span></div>';
            
            // Ajouter l'animation CSS si elle n'existe pas
            if (!document.getElementById('typing-animation-styles')) {
                const style = document.createElement('style');
                style.id = 'typing-animation-styles';
                style.textContent = `
                    @keyframes typing-pulse {
                        0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                        30% { opacity: 1; transform: scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            messagesContainer.appendChild(typingEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        removeTypingIndicator() {
            const typingIndicator = this.chatPopup?.querySelector('#robert-typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }        addMessage(text, sender) {
            // Ajouter à l'historique
            this.addToHistory(text, sender);
            
            // Ajouter à l'interface utilisateur
            this.addMessageToUI(text, sender);
        }        addMessageToUI(text, sender) {
            if (!this.chatPopup) return;
            
            const messagesContainer = this.chatPopup.querySelector('#robert-chat-messages');
            
            const messageEl = document.createElement('div');
            messageEl.className = `robert-message robert-message-${sender}`;
            
            if (sender === 'assistant') {
                // Parser le markdown pour les réponses de l'assistant
                console.log('🎨 Rendu du markdown pour le message assistant');
                const parsedHtml = this.parseMarkdown(text);
                console.log('📝 HTML généré:', parsedHtml.substring(0, 300) + '...');
                messageEl.innerHTML = parsedHtml;
                  // Ajouter des styles pour les boutons après insertion
                setTimeout(() => {
                    const buttons = messageEl.querySelectorAll('button[onclick]');
                    buttons.forEach(button => {
                        // S'assurer que les boutons sont cliquables (styles seulement)
                        button.style.pointerEvents = 'auto';
                        button.style.cursor = 'pointer';
                        button.style.position = 'relative';
                        button.style.zIndex = '1000';
                    });
                }, 100);} else {
                // Pour les messages utilisateur, traiter les sauts de ligne
                // Échapper le HTML et préserver les sauts de ligne
                const escapedText = text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
                
                // Convertir les sauts de ligne en <br> et préserver les espaces
                const htmlText = escapedText
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/\n/g, '<br>')
                    .replace(/  /g, '&nbsp;&nbsp;'); // Préserver les espaces multiples
                
                messageEl.innerHTML = htmlText;
            }
            
            messagesContainer.appendChild(messageEl);
            
            // Toujours scroller vers le bas après ajout d'un message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Animation d'apparition seulement pour les nouveaux messages (pas pour la restauration)
            if (!this.isRestoringHistory) {
                messageEl.style.opacity = '0';
                messageEl.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    messageEl.style.transition = 'all 0.3s ease';
                    messageEl.style.opacity = '1';
                    messageEl.style.transform = 'translateY(0)';
                }, 50);
            }
        }parseMarkdown(text) {
    console.log('🔍 Parsing markdown:', text.substring(0, 100) + '...');
    
    // Nettoyer le texte d'entrée
    let html = text.trim();
    
    // 1. PROTECTION DES BLOCS DE CODE AVANT TOUT TRAITEMENT
    const codeBlocks = [];
    const inlineCode = [];
    
    // Protéger les blocs de code avec langage ```lang
    html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        codeBlocks.push({
            code: code.trim(),
            language: lang || 'text'
        });
        return `__CODEBLOCK_${codeBlocks.length - 1}__`;
    });
    
    // Protéger le code inline `
    html = html.replace(/`([^`\n]+)`/g, (match, code) => {
        inlineCode.push(code);
        return `__INLINECODE_${inlineCode.length - 1}__`;
    });
    
    // 2. TRAITEMENT DES LIENS MARKDOWN - REGEX AMÉLIORÉE
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/gi, (match, linkText, url) => {
        console.log('🔗 Lien markdown trouvé:', linkText, '->', url);
        
        const cleanUrl = url.trim().replace(/[.,;!?]+$/, '');
        const cleanText = linkText.trim();
        
        // Déterminer l'icône
        let icon = '🌐';
        if (url.includes('github.com')) icon = '📚';
        else if (url.includes('doc') || cleanText.toLowerCase().includes('doc')) icon = '📖';
        else if (url.includes('youtube.com') || url.includes('youtu.be')) icon = '🎥';
        else if (url.includes('wikipedia')) icon = '📚';
                  // Créer le bouton avec événement sécurisé
                const safeUrl = cleanUrl.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
                const safeText = cleanText.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
                
                // Limiter la longueur du texte affiché
                const maxLength = 25;
                const displayText = cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
                
                return `<button onclick="this.blur(); window.open('${safeUrl}', '_blank')" class="robert-link-btn" title="Ouvrir : ${safeText}" type="button">
                    ${icon} ${displayText}
                </button>`;
            });
            
            // 3. TRAITEMENT DES URLs SIMPLES (amélioré)
            html = html.replace(/(?<!<button[^>]*?)(?<!href=["'])(https?:\/\/[^\s<>\[\]"'()]+)/gi, (url) => {
                console.log('🌐 URL simple trouvée:', url);
                  const cleanUrl = url.replace(/[.,;!?]+$/, '');
                let displayText = cleanUrl;
                
                // Raccourcir les URLs très longues - amélioration
                if (cleanUrl.length > 35) {
                    try {
                        const urlObj = new URL(cleanUrl);
                        const hostname = urlObj.hostname;
                        const path = urlObj.pathname;
                        if (path.length > 15) {
                            displayText = hostname + path.substring(0, 15) + '...';
                        } else {
                            displayText = hostname + path;
                        }
                    } catch (e) {
                        // Si l'URL n'est pas valide, tronquer simplement
                        displayText = cleanUrl.substring(0, 35) + '...';
                    }
                }
                
                const safeUrl = cleanUrl.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
                
                return `<button onclick="this.blur(); window.open('${safeUrl}', '_blank')" class="robert-url-btn" title="Ouvrir : ${cleanUrl}" type="button">
                    🌐 ${displayText}
                </button>`;
            });
              // 4. TITRES (traiter avant le formatage et les listes)
            html = html.replace(/^####\s+(.+)$/gm, '<h4 class="robert-markdown-h4">$1</h4>');
            html = html.replace(/^###\s+(.+)$/gm, '<h3 class="robert-markdown-h3">$1</h3>');
            html = html.replace(/^##\s+(.+)$/gm, '<h2 class="robert-markdown-h2">$1</h2>');
            html = html.replace(/^#\s+(.+)$/gm, '<h1 class="robert-markdown-h1">$1</h1>');
            
            // 5. LISTES IMBRIQUÉES (traiter avant le formatage de texte pour éviter les conflits)
            const lines = html.split('\n');
            const processedLines = [];
            const listStack = []; // Stack pour gérer les niveaux d'imbrication
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmedLine = line.trim();
                
                // Détecter le niveau d'indentation (espaces ou tabs au début)
                const indentMatch = line.match(/^(\s*)/);
                const indentLevel = indentMatch ? Math.floor(indentMatch[1].length / 2) : 0; // 2 espaces = 1 niveau
                
                // Liste ordonnée avec indentation
                if (/^\d+\.\s+/.test(trimmedLine)) {
                    const content = trimmedLine.replace(/^\d+\.\s+/, '');
                    
                    // Fermer les listes plus profondes
                    while (listStack.length > indentLevel) {
                        const closedList = listStack.pop();
                        processedLines.push(`</${closedList.type}>`);
                    }
                    
                    // Ouvrir une nouvelle liste si nécessaire
                    if (listStack.length === indentLevel) {
                        processedLines.push('<ol class="robert-markdown-ol">');
                        listStack.push({ type: 'ol', level: indentLevel });
                    }
                    
                    processedLines.push(`<li class="robert-markdown-oli">${content}</li>`);
                }
                // Liste non ordonnée avec indentation (supporter •, -, *, +)
                else if (/^[•\-*+]\s+/.test(trimmedLine)) {
                    const content = trimmedLine.replace(/^[•\-*+]\s+/, '');
                    
                    // Fermer les listes plus profondes
                    while (listStack.length > indentLevel) {
                        const closedList = listStack.pop();
                        processedLines.push(`</${closedList.type}>`);
                    }
                    
                    // Ouvrir une nouvelle liste si nécessaire
                    if (listStack.length === indentLevel) {
                        processedLines.push('<ul class="robert-markdown-ul">');
                        listStack.push({ type: 'ul', level: indentLevel });
                    }
                    
                    processedLines.push(`<li class="robert-markdown-li">${content}</li>`);
                }
                // Ligne normale - fermer toutes les listes ouvertes
                else if (trimmedLine && !trimmedLine.startsWith('<')) {
                    // Fermer toutes les listes ouvertes
                    while (listStack.length > 0) {
                        const closedList = listStack.pop();
                        processedLines.push(`</${closedList.type}>`);
                    }
                    processedLines.push(line);
                }
                // Ligne vide ou HTML - garder tel quel
                else {
                    processedLines.push(line);
                }
            }
            
            // Fermer toutes les listes restantes à la fin
            while (listStack.length > 0) {
                const closedList = listStack.pop();
                processedLines.push(`</${closedList.type}>`);
            }
            
            html = processedLines.join('\n');
            
            // 6. FORMATAGE DE TEXTE AMÉLIORÉ - APRÈS les listes
            // D'abord échapper les caractères HTML (sauf ceux déjà protégés)
            html = html.replace(/&(?!amp;|lt;|gt;|#39;|quot;)/g, '&amp;');
            html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            // Puis rétablir nos boutons et éléments HTML
            html = html.replace(/&lt;button/g, '<button').replace(/&lt;\/button&gt;/g, '</button>');
            html = html.replace(/&lt;(\/?(ul|ol|li|h[1-6]))/g, '<$1').replace(/&gt;/g, '>');
            html = html.replace(/onclick=&quot;/g, 'onclick="').replace(/&quot;&gt;/g, '">');
            html = html.replace(/class=&quot;/g, 'class="');
            
            // Traiter les combinaisons de formatage
            html = html.replace(/\*\*\*([^*\n]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
            html = html.replace(/___([^_\n]+?)___/g, '<strong><em>$1</em></strong>');
              // Gras
            html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/__([^_\n]+?)__/g, '<strong>$1</strong>');
            
            // Italique
            html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
            html = html.replace(/_([^_\n]+?)_/g, '<em>$1</em>');
            
            // 7. CITATIONS
            html = html.replace(/^>\s*(.+)$/gm, '<blockquote class="robert-markdown-quote">$1</blockquote>');
            
            // 8. REMETTRE LES BLOCS DE CODE
            html = html.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
                const block = codeBlocks[index];
                return `<pre class="robert-markdown-codeblock"><code class="language-${block.language}">${block.code}</code></pre>`;
            });
            
            html = html.replace(/__INLINECODE_(\d+)__/g, (match, index) => {
                return `<code class="robert-markdown-code">${inlineCode[index]}</code>`;
            });            // 9. GESTION OPTIMISÉE DES SAUTS DE LIGNE
            // Normaliser les fins de ligne
            html = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            
            // Traiter les sauts de ligne forcés en markdown (deux espaces + \n = <br>)
            html = html.replace(/  \n/g, '<br>\n');
            
            // Si c'est du texte simple sans structure HTML
            if (!html.includes('<h') && !html.includes('<ul') && !html.includes('<ol') && 
                !html.includes('<blockquote') && !html.includes('<pre')) {
                
                // C'est du texte simple, convertir les sauts de ligne en <br>
                html = html.replace(/\n+/g, '<br>');
                html = html.replace(/(<br>\s*){3,}/g, '<br><br>');            } else {
                // C'est du HTML structuré, nettoyer seulement les sauts de ligne inutiles
                
                // Supprimer les sauts de ligne autour des éléments de liste
                html = html.replace(/\n+(<\/li>)/g, '$1');
                html = html.replace(/(<li[^>]*>)\n+/g, '$1');
                html = html.replace(/\n+(<\/ul>)/g, '$1');
                html = html.replace(/\n+(<\/ol>)/g, '$1');
                html = html.replace(/(<ul[^>]*>)\n+/g, '$1');
                html = html.replace(/(<ol[^>]*>)\n+/g, '$1');
                
                // Supprimer les sauts de ligne entre les éléments de listes adjacents
                html = html.replace(/(<\/li>)\s*(<li)/g, '$1$2');
                html = html.replace(/(<\/ol>)\s*(<ul)/g, '$1 $2');
                html = html.replace(/(<\/ul>)\s*(<ol)/g, '$1 $2');
                
                // Supprimer les sauts de ligne autour des titres
                html = html.replace(/\n+(<h[1-6][^>]*>)/g, '\n$1');
                html = html.replace(/(<\/h[1-6]>)\n+/g, '$1\n');
                  // Traiter les paragraphes de texte normal entre les éléments structurés
                const lines = html.split(/(?<=<\/(?:ul|ol|li|h[1-6]|blockquote|pre)>)|(?=<(?:ul|ol|li|h[1-6]|blockquote|pre))/);
                const processedLines = [];
                
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    
                    // Si c'est une ligne vide, ignorer
                    if (!line) continue;
                    
                    // Si c'est un élément HTML structurel, garder tel quel
                    if (line.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|div|button)/)) {
                        processedLines.push(line);
                    }
                    // Si c'est du texte normal, le traiter
                    else {
                        // Ajouter un petit espacement uniquement si nécessaire
                        processedLines.push(line);
                    }
                }
                
                html = processedLines.join('');
            }
              // 10. NETTOYAGE FINAL AMÉLIORÉ
            // Supprimer les sauts de ligne excessifs
            html = html.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 sauts de ligne consécutifs
            html = html.replace(/<br>\s*<br>\s*<br>/g, '<br><br>'); // Max 2 br consécutifs
            html = html.replace(/^\s*<br>|<br>\s*$/g, ''); // Supprimer les br en début/fin
            html = html.replace(/\n\s*$/g, ''); // Supprimer les espaces/sauts en fin
            
            // Nettoyer les espaces autour des listes
            html = html.replace(/(<\/ul>)\s*(<ul)/g, '$1$2');
            html = html.replace(/(<\/ol>)\s*(<ol)/g, '$1$2');
            html = html.replace(/(<\/li>)\s*(<li)/g, '$1$2');
            
            console.log('✅ Markdown parsé (final):', html.substring(0, 200) + '...');
            return html.trim();
        }

        closeChatWidget() {
            if (this.chatPopup) {
                this.chatPopup.remove();
                this.chatPopup = null;
            }
        }        handleAuthStateChanged(isLoggedIn) {
            console.log('État d\'authentification changé:', isLoggedIn);
            
            this.isAuthenticated = isLoggedIn;
            
            if (!isLoggedIn) {
                // L'utilisateur s'est déconnecté - fermer le chat mais garder le logo
                this.closeChatWidget();
            } else {
                // L'utilisateur s'est reconnecté - recharger l'historique
                this.loadChatHistory();
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
