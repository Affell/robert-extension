// Éviter la redéclaration si le script est déjà chargé
if (typeof window.RobertExtension === 'undefined') {
    
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
            const hostname = window.location.hostname;
            const isUPHFSite = hostname.endsWith('.uphf.fr') || hostname === 'uphf.fr';
            
            if (isUPHFSite) {
                console.log('Site UPHF détecté:', hostname);
                this.createFloatingLogo();
            }
        }

        createFloatingLogo() {
            if (this.floatingLogo) return;

            this.floatingLogo = document.createElement('div');
            this.floatingLogo.className = 'robert-floating-logo';
            
            this.floatingLogo.innerHTML = `
                <img src="${chrome.runtime.getURL('icons/logo_robert.png')}" 
                     alt="Robert IA" 
                     class="robert-logo-img">
                <div class="robert-logo-tooltip">Discuter avec Robert IA</div>
            `;

            this.floatingLogo.addEventListener('click', () => {
                console.log('Logo Robert cliqué');
                this.openChatWidget();
            });

            document.body.appendChild(this.floatingLogo);
        }

        setupMessageListener() {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                console.log("Message reçu:", request);
                
                try {
                    switch (request.action) {
                        case "openChat":
                            this.openChatWidget();
                            sendResponse({ success: true });
                            break;
                        case "showVerificationResult":
                            this.showNotification(
                                request.result.error ? 'error' : (request.result.isTrustworthy ? 'success' : 'warning'),
                                request.result.error || `Page ${request.result.isTrustworthy ? 'fiable' : 'suspecte'} (Score: ${request.result.score}/100)`
                            );
                            sendResponse({ success: true });
                            break;
                        case "showSummary":
                            this.showNotification(
                                request.summary.error ? 'error' : 'success',
                                request.summary.error || request.summary.summary
                            );
                            sendResponse({ success: true });
                            break;
                        case "showEmailResult":
                            const result = request.result;
                            if (!result.isEmail) {
                                this.showNotification('warning', result.message);
                            } else {
                                const type = result.error ? 'error' : (result.isDangerous ? 'error' : 'success');
                                this.showNotification(type, result.error || result.message);
                            }
                            sendResponse({ success: true });
                            break;
                        default:
                            sendResponse({ success: false, error: "Action non reconnue" });
                    }
                } catch (error) {
                    console.error("Erreur:", error);
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

        createChatPopup() {
            this.chatPopup = document.createElement('div');
            this.chatPopup.className = 'robert-chat-popup';
            
            this.chatPopup.innerHTML = `
                <div class="robert-chat-container">
                    <div class="robert-chat-header">
                        <div class="robert-header-content">
                            <img src="${chrome.runtime.getURL('icons/logo_robert.png')}" alt="Robert IA" class="robert-chat-logo">
                            <div class="robert-header-text">
                                <h1>Robert IA</h1>
                                <p>Assistant intelligent</p>
                            </div>
                        </div>
                        <button class="robert-close-btn" id="robert-close-chat">×</button>
                    </div>
                    
                    <div class="robert-chat-content" id="robert-chat-messages">
                        <div class="robert-chat-welcome" id="robert-chat-welcome">
                            <h3>Bonjour ! 👋</h3>
                            <p>Je suis Robert, votre assistant IA spécialisé en cybersécurité. Comment puis-je vous aider ?</p>
                            <div class="robert-questions-container" id="robert-questions"></div>
                        </div>
                    </div>
                    
                    <div class="robert-chat-input-area">
                        <input type="text" 
                               class="robert-chat-input" 
                               id="robert-chat-input" 
                               placeholder="Tapez votre message...">
                        <button class="robert-send-btn" id="robert-send-btn">Envoyer</button>
                    </div>
                </div>
            `;

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
            console.log('Chat créé avec succès');
        }

        handleQuestion(question) {
            const welcome = this.chatPopup.querySelector('#robert-chat-welcome');
            if (welcome) welcome.style.display = 'none';

            this.addMessage(question, 'user');
            setTimeout(() => {
                this.addMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
            }, 1000);
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
            
            setTimeout(() => {
                this.addMessage("Problème API - Cette fonctionnalité sera disponible prochainement.", 'assistant');
            }, 1000);
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

        showNotification(type, message) {
            const notification = document.createElement('div');
            notification.className = `robert-notification robert-notification-${type}`;
            notification.textContent = message;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }
    }

    window.RobertExtension = RobertExtension;
    window.robertExtensionInstance = new RobertExtension();
    
} else {
    console.log('RobertExtension déjà initialisée');
}
