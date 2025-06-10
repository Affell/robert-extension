class RobertPopup {    constructor() {
        console.log('=== Initialisation de RobertPopup ===');
        this.apiBaseUrl = 'http://localhost:5000';
        this.isLoggedIn = false;
        
        // Utiliser setTimeout pour s'assurer que le DOM est complètement chargé
        setTimeout(() => {
            this.initializeElements();
            this.attachEventListeners();
            this.checkAuthOnStartup();
            this.testAPIConnection();
        }, 100);
    }    initializeElements() {
        console.log('Initialisation des éléments DOM...');
        
        // Éléments principaux
        this.statusElement = document.getElementById("status");
        this.mainContent = document.querySelector(".popup-content");
        this.accountSection = document.getElementById("account-section");
        this.loginSection = document.getElementById("login-section");
        
        // Éléments de fonctionnalités (uniquement pour utilisateurs connectés)
        this.chatBtn = document.getElementById("chat-btn");
        this.verifyBtn = document.getElementById("verify-btn");
        this.summarizeBtn = document.getElementById("summarize-btn");
        this.emailBtn = document.getElementById("email-btn");
        
        // Éléments du compte
        this.accountBtn = document.getElementById("account-btn");
        this.backBtn = document.getElementById("back-btn");
        this.logoutBtn = document.getElementById("logout-btn");
        this.helpBtnLogged = document.getElementById("help-btn-logged");
        
        // Éléments de connexion
        this.loginForm = document.getElementById("login-form");
        this.loginSubmitBtn = document.getElementById("login-submit");
        this.forgotPasswordBtn = document.getElementById("forgot-password-btn");
        this.createAccountBtn = document.getElementById("create-account-btn");
        this.loginError = document.getElementById("login-error");
        
        // Debug: vérifier que les éléments critiques sont trouvés
        console.log('Éléments DOM trouvés:', {
            statusElement: !!this.statusElement,
            mainContent: !!this.mainContent,
            accountSection: !!this.accountSection,
            loginSection: !!this.loginSection,
            backBtn: !!this.backBtn,
            loginForm: !!this.loginForm
        });
    }attachEventListeners() {
        console.log('Attachement des event listeners...');
        
        // Fonctionnalités principales (uniquement si connecté)
        if (this.chatBtn) {
            this.chatBtn.addEventListener("click", () => this.openChat());
        }
        if (this.verifyBtn) {
            this.verifyBtn.addEventListener("click", () => this.verifyPage());
        }
        if (this.summarizeBtn) {
            this.summarizeBtn.addEventListener("click", () => this.summarizePage());
        }
        if (this.emailBtn) {
            this.emailBtn.addEventListener("click", () => this.checkEmail());
        }
        
        // Navigation du compte
        if (this.accountBtn) {
            this.accountBtn.addEventListener("click", () => {
                console.log('Bouton Mon Compte cliqué');
                this.showAccountSection();
            });
        }
        if (this.backBtn) {
            console.log('Attachement du listener pour le bouton retour');
            this.backBtn.addEventListener("click", (e) => {
                console.log('Bouton retour cliqué');
                e.preventDefault();
                e.stopPropagation();
                this.hideAccountSection();
            });
        } else {
            console.error('Bouton retour non trouvé dans le DOM');
        }
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener("click", () => this.handleLogout());
        }
        if (this.helpBtnLogged) {
            this.helpBtnLogged.addEventListener("click", () => this.openHelp());
        }
        
        // Connexion
        if (this.loginForm) {
            this.loginForm.addEventListener("submit", (e) => this.handleLoginSubmit(e));
        }
        if (this.forgotPasswordBtn) {
            this.forgotPasswordBtn.addEventListener("click", () => this.handleForgotPassword());
        }
        if (this.createAccountBtn) {
            this.createAccountBtn.addEventListener("click", () => this.createAccount());
        }        
        console.log('Event listeners attachés avec succès');
    }

    async checkAuthOnStartup() {
        try {
            console.log('Vérification de l\'état d\'authentification au démarrage...');
            const result = await chrome.storage.local.get(['authToken', 'isLoggedIn', 'userInfo']);
            
            console.log('Données stockées:', {
                hasToken: !!result.authToken,
                isLoggedIn: result.isLoggedIn,
                hasUserInfo: !!result.userInfo
            });
            
            if (result.authToken && result.isLoggedIn && result.userInfo) {
                console.log('Token et données utilisateur trouvés, vérification de la validité...');
                // Tenter de vérifier la validité du token
                await this.verifyCurrentUser();
            } else if (result.authToken && result.isLoggedIn) {
                console.log('Token trouvé mais données utilisateur manquantes, re-vérification...');
                await this.verifyCurrentUser();
            } else {
                console.log('Aucune session valide trouvée, affichage de l\'interface de connexion');
                await this.clearAuthData(); // Nettoyer les données incomplètes
                this.showLoginInterface();
            }
        } catch (error) {
            console.error('Erreur lors de la vérification d\'authentification:', error);
            await this.clearAuthData(); // Nettoyer en cas d'erreur
            this.showLoginInterface();
        }
    }

    async verifyCurrentUser() {
        try {
            const result = await chrome.storage.local.get(['authToken']);
            if (!result.authToken) {
                throw new Error('Aucun token disponible');
            }

            console.log('Vérification du token auprès du serveur...');
            const response = await this.makeAuthenticatedRequest('/auth/me', {
                method: 'GET'
            });

            if (response) {
                let user = null;
                
                if (response.user) {
                    user = response.user;
                } else if (response.data && response.data.user) {
                    user = response.data.user;
                } else if (response.data) {
                    user = response.data;
                } else if (response.success !== false) {
                    user = response;
                }

                if (user) {
                    const userInfo = {
                        name: user.name || user.username || user.email || 'Utilisateur',
                        email: user.email || 'email@example.com',
                        id: user.id || user._id || user.user_id || 1
                    };
                    
                    await chrome.storage.local.set({
                        isLoggedIn: true,
                        userInfo: userInfo
                    });
                    
                    console.log('Utilisateur vérifié avec succès:', user.email);
                    this.isLoggedIn = true;
                    
                    // S'assurer que l'interface est mise à jour correctement
                    setTimeout(() => {
                        this.showMainInterface();
                        this.updateStatus();
                    }, 100);
                    
                    return;
                }
            }
            
            throw new Error('Structure de réponse invalide de /auth/me');
        } catch (error) {
            console.error('Erreur de vérification utilisateur (token probablement expiré):', error);
            await this.clearAuthData();
            this.showLoginInterface();
        }
    }

    showLoginInterface() {
        this.isLoggedIn = false;
        
        // Masquer l'interface principale
        if (this.mainContent) this.mainContent.classList.add('hidden');
        if (this.accountSection) this.accountSection.classList.add('hidden');
        
        // Afficher uniquement le portail de connexion
        if (this.loginSection) {
            this.loginSection.classList.remove('hidden');
            this.loginSection.classList.add('flex');
        }
        
        this.setStatus("Connexion requise", "error");
        this.clearLoginForm();
    }    showMainInterface() {
        console.log('Affichage de l\'interface principale');
        this.isLoggedIn = true;
        
        // Masquer le portail de connexion
        if (this.loginSection) {
            this.loginSection.classList.add('hidden');
            this.loginSection.classList.remove('flex');
            this.loginSection.style.display = 'none';
        }
        
        // Masquer la section compte si elle était ouverte
        if (this.accountSection) {
            this.accountSection.classList.add('hidden');
            this.accountSection.classList.remove('flex');
            this.accountSection.style.display = 'none';
        }
        
        // Afficher l'interface principale
        if (this.mainContent) {
            this.mainContent.classList.remove('hidden');
            this.mainContent.classList.add('flex');
            this.mainContent.style.display = 'flex';
        }
        
        // Charger les informations utilisateur
        this.loadUserInfo();
        
        console.log('Interface principale affichée avec succès');
    }

    showAccountSection() {
        if (!this.isLoggedIn) {
            console.warn('Tentative d\'affichage de la section compte sans être connecté');
            return;
        }
        
        console.log('Affichage de la section Mon Compte');
        
        if (this.accountSection && this.mainContent) {
            // Masquer l'interface principale
            this.mainContent.classList.add('hidden');
            this.mainContent.classList.remove('flex');
            
            // Afficher la section compte
            this.accountSection.classList.remove('hidden');
            this.accountSection.classList.add('flex');
            this.accountSection.style.display = 'flex';
            
            // S'assurer que les informations utilisateur sont à jour
            this.loadUserInfo();
        } else {
            console.error('Éléments DOM account-section ou main-content non trouvés');
        }
    }

    hideAccountSection() {
        if (!this.isLoggedIn) {
            console.warn('Tentative de masquage de la section compte sans être connecté');
            return;
        }
        
        console.log('Masquage de la section Mon Compte');
        
        if (this.accountSection && this.mainContent) {
            // Masquer la section compte
            this.accountSection.classList.add('hidden');
            this.accountSection.classList.remove('flex');
            this.accountSection.style.display = 'none';
            
            // Afficher l'interface principale
            this.mainContent.classList.remove('hidden');
            this.mainContent.classList.add('flex');
        } else {
            console.error('Éléments DOM account-section ou main-content non trouvés');
        }
    }

    async loadUserInfo() {
        if (!this.isLoggedIn) return;
        
        try {
            const result = await chrome.storage.local.get(['userInfo', 'isLoggedIn', 'authToken']);
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            
            if (result.isLoggedIn && result.userInfo && result.authToken) {
                if (userNameEl) userNameEl.textContent = result.userInfo.name || 'Utilisateur';
                if (userEmailEl) userEmailEl.textContent = result.userInfo.email || 'Non connecté';
            }
        } catch (error) {
            console.error('Erreur lors du chargement des infos utilisateur:', error);
        }
    }

    async openChat() {
        this.setStatus("Ouverture du chat...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log("Onglet actif:", tab.url);
            
            // Vérifier si le contexte de l'extension est valide
            if (!chrome.runtime?.id) {
                throw new Error('Extension context invalidated - recharger l\'extension');
            }
            
            // Injecter le content script
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['scripts/content.js']
                });
                console.log("Content script injecté");
            } catch (error) {
                console.log("Content script déjà présent:", error);
            }
            
            // Attendre et envoyer le message
            setTimeout(async () => {
                try {
                    console.log("Envoi du message openChat");
                    await chrome.tabs.sendMessage(tab.id, {
                        action: "openChat",
                        mode: "conversation"
                    });
                    
                    console.log("Message envoyé avec succès");
                    this.setStatus("Chat ouvert", "success");
                    
                    // Fermer le popup
                    setTimeout(() => {
                        window.close();
                    }, 500);
                    
                } catch (messageError) {
                    console.error("Erreur lors de l'envoi du message:", messageError);
                    this.setStatus("Recharger l'extension", "error");
                }
            }, 1000);
            
        } catch (error) {
            this.setStatus("Erreur: recharger extension", "error");
            console.error("Erreur:", error);
        }
    }

    async verifyPage() {
        this.setStatus("Vérification en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => document.documentElement.outerHTML
            });
            
            const htmlContent = results[0].result;
            
            // Préparer le contenu de la page pour l'analyse - limité à 8000 chars pour laisser de la place au prompt
            const pageContent = `
Titre: ${tab.title}

Contenu HTML:
${htmlContent.substring(0, 8000)}
            `.trim();
            
            // Vérifier que le contenu total ne dépasse pas 10000 caractères
            const prompt = `Analyse cette page web et donne-moi un score de confiance de 0 à 100 ainsi qu'une évaluation de sa fiabilité:

`;
            const maxContentLength = 10000 - prompt.length - tab.title.length - 20; // 20 pour les labels
            
            const finalContent = pageContent.length > maxContentLength 
                ? pageContent.substring(0, maxContentLength) 
                : pageContent;
            
            // Préparer les données à envoyer avec URL séparée
            const dataToSend = {
                url: tab.url,
                body: prompt + finalContent
            };
            
            const verificationResult = await this.callPageAnalysisAPI(dataToSend);
            
            if (verificationResult.error) {
                this.setStatus(verificationResult.error, "error");
                this.hideAnalysisResult();
            } else if (verificationResult.response) {
                // Essayer d'extraire un score de la réponse
                const scoreMatch = verificationResult.response.match(/(\d+)\/100|score[:\s]*(\d+)|(\d+)\s*%/i);
                let score = null;
                
                if (scoreMatch) {
                    score = scoreMatch[1] || scoreMatch[2] || scoreMatch[3];
                }
                
                // Afficher la réponse complète dans l'interface
                this.showAnalysisResult(verificationResult.response, score, tab.url);
                this.setStatus("Analyse terminée", "success");
            } else {
                this.setStatus("Réponse vide de l'API", "error");
                this.hideAnalysisResult();
            }
            
        } catch (error) {
            this.setStatus("Erreur de vérification", "error");
            this.hideAnalysisResult();
        }
    }

    async summarizePage() {
        this.setStatus("Résumé en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => document.documentElement.outerHTML
            });
            
            const htmlContent = results[0].result;
            
            // Préparer le contenu de la page pour le résumé - limité pour ne pas dépasser 10000 chars
            const prompt = `Résume cette page web de manière concise et structurée:

`;
            const maxContentLength = 10000 - prompt.length - tab.title.length - 20; // 20 pour les labels
            
            const pageContent = `
Titre: ${tab.title}

Contenu HTML:
${htmlContent.substring(0, Math.min(htmlContent.length, maxContentLength - 100))}
            `.trim();
            
            // Préparer les données à envoyer
            const dataToSend = {
                url: tab.url,
                body: prompt + pageContent
            };
            
            const summaryResult = await this.callPageResumeAPI(dataToSend);
            
            if (summaryResult.error) {
                this.setStatus(summaryResult.error, "error");
                this.hideAnalysisResult();
            } else if (summaryResult.response) {
                // Afficher le résumé dans l'interface
                this.showSummaryResult(summaryResult.response, tab.url);
                this.setStatus("Résumé créé", "success");
            } else {
                this.setStatus("Réponse vide de l'API", "error");
                this.hideAnalysisResult();
            }
            
        } catch (error) {
            this.setStatus("Erreur de résumé", "error");
            this.hideAnalysisResult();
        }
    }

    showAnalysisResult(response, score, url) {
        // Créer ou mettre à jour la section des résultats
        let resultSection = document.getElementById('analysis-result');
        if (!resultSection) {
            resultSection = document.createElement('div');
            resultSection.id = 'analysis-result';
            resultSection.className = 'analysis-result';
            
            // Insérer après la section principale ou avant la section compte
            const mainContent = this.mainContent;
            if (mainContent) {
                mainContent.appendChild(resultSection);
                // Ajouter la classe pour ajuster l'espacement
                mainContent.classList.add('with-analysis');
            }
        }
        
        // Agrandir la popup de manière contrôlée
        this.expandPopupSafely();
        
        // Extraire le domaine de l'URL
        let domain = 'Page analysée';
        try {
            domain = new URL(url).hostname;
        } catch (e) {
            console.log('Impossible d\'extraire le domaine:', e);
        }
        
        // Déterminer la couleur du score
        let scoreColor = '#ef4444'; // rouge par défaut
        let scoreStatus = 'Risqué';
        
        if (score) {
            const numScore = parseInt(score);
            if (numScore >= 80) {
                scoreColor = '#22c55e'; // vert
                scoreStatus = 'Fiable';
            } else if (numScore >= 60) {
                scoreColor = '#f59e0b'; // orange
                scoreStatus = 'Modéré';
            }
        }
        
        resultSection.innerHTML = `
            <div class="analysis-header">
                <div class="analysis-domain">
                    <h3>🔍 Analyse de sécurité</h3>
                    <p class="domain-name">${domain}</p>
                </div>
                <button class="close-analysis-btn" id="close-analysis">×</button>
            </div>
            
            ${score ? `
            <div class="score-section">
                <div class="score-circle" style="border-color: ${scoreColor};">
                    <span class="score-number" style="color: ${scoreColor};">${score}</span>
                    <span class="score-total">/100</span>
                </div>
                <div class="score-status" style="color: ${scoreColor};">
                    ${scoreStatus}
                </div>
            </div>
            ` : ''}
            
            <div class="analysis-content">
                <h4>📋 Rapport d'analyse</h4>
                <div class="analysis-text">${this.formatAnalysisText(response)}</div>
            </div>
            
            <div class="analysis-actions">
                <button class="action-btn secondary" id="copy-analysis">
                    📋 Copier le rapport
                </button>
                <button class="action-btn primary" id="new-analysis">
                    🔄 Nouvelle analyse
                </button>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        resultSection.classList.add('visible');
        
        // Attacher les event listeners
        const closeBtn = document.getElementById('close-analysis');
        const copyBtn = document.getElementById('copy-analysis');
        const newAnalysisBtn = document.getElementById('new-analysis');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideAnalysisResult());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(response).then(() => {
                    copyBtn.textContent = '✅ Copié !';
                    setTimeout(() => {
                        copyBtn.innerHTML = '📋 Copier le rapport';
                    }, 2000);
                });
            });
        }
        
        if (newAnalysisBtn) {
            newAnalysisBtn.addEventListener('click', () => {
                this.hideAnalysisResult();
                this.verifyPage();
            });
        }
    }
    
    showSummaryResult(response, url) {
        // Créer ou mettre à jour la section des résultats
        let resultSection = document.getElementById('analysis-result');
        if (!resultSection) {
            resultSection = document.createElement('div');
            resultSection.id = 'analysis-result';
            resultSection.className = 'analysis-result';
            
            // Insérer après la section principale
            const mainContent = this.mainContent;
            if (mainContent) {
                mainContent.appendChild(resultSection);
                // Ajouter la classe pour ajuster l'espacement
                mainContent.classList.add('with-analysis');
            }
        }
        
        // Agrandir la popup de manière contrôlée
        this.expandPopupSafely();
        
        // Extraire le domaine de l'URL
        let domain = 'Page résumée';
        try {
            domain = new URL(url).hostname;
        } catch (e) {
            // Fallback silencieux
        }
        
        resultSection.innerHTML = `
            <div class="analysis-header">
                <div class="analysis-domain">
                    <h3>📄 Résumé de page</h3>
                    <p class="domain-name">${domain}</p>
                </div>
                <button class="close-analysis-btn" id="close-analysis">×</button>
            </div>
            
            <div class="analysis-content">
                <h4>📋 Résumé du contenu</h4>
                <div class="analysis-text">${this.formatAnalysisText(response)}</div>
            </div>
            
            <div class="analysis-actions">
                <button class="action-btn secondary" id="copy-analysis">
                    📋 Copier le résumé
                </button>
                <button class="action-btn primary" id="new-summary">
                    🔄 Nouveau résumé
                </button>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        resultSection.classList.add('visible');
        
        // Attacher les event listeners
        const closeBtn = document.getElementById('close-analysis');
        const copyBtn = document.getElementById('copy-analysis');
        const newSummaryBtn = document.getElementById('new-summary');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideAnalysisResult());
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(response).then(() => {
                    copyBtn.textContent = '✅ Copié !';
                    setTimeout(() => {
                        copyBtn.innerHTML = '📋 Copier le résumé';
                    }, 2000);
                });
            });
        }
        
        if (newSummaryBtn) {
            newSummaryBtn.addEventListener('click', () => {
                this.hideAnalysisResult();
                this.summarizePage();
            });
        }
    }
    
    hideAnalysisResult() {
        const resultSection = document.getElementById('analysis-result');
        if (resultSection) {
            resultSection.classList.add('hidden');
            resultSection.classList.remove('visible');
        }
        
        // Retirer la classe d'analyse du contenu
        if (this.mainContent) {
            this.mainContent.classList.remove('with-analysis');
        }
        
        // Réduire la popup de manière contrôlée
        this.contractPopupSafely();
    }
    
    // Méthode simplifiée pour agrandir la popup
    expandPopupSafely() {
        console.log('Expansion de la popup pour l\'analyse');
        
        const body = document.body;
        const container = document.querySelector('.popup-container');
        
        // Application directe des styles d'expansion
        body.classList.add('expanded-popup');
        
        if (container) {
            container.classList.add('analyzing');
        }
        
        console.log('Popup étendue à 700px de hauteur fixe');
    }
    
    // Méthode simplifiée pour réduire la popup
    contractPopupSafely() {
        console.log('Réduction de la popup à la taille standard');
        
        const body = document.body;
        const container = document.querySelector('.popup-container');
        
        // Retour à la taille standard avec transition
        setTimeout(() => {
            body.classList.remove('expanded-popup');
            
            if (container) {
                container.classList.remove('analyzing');
            }
            
            console.log('Popup réduite à 600px de hauteur fixe');
        }, 100);
    }

    formatAnalysisText(text) {
        // Convertir le texte brut en HTML formaté avec optimisation pour espace restreint
        let formatted = text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            .replace(/- (.+?)(<br>|<\/p>)/g, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        // Optimiser l'affichage pour l'espace restreint
        formatted = formatted
            .replace(/<p><\/p>/g, '') // Supprimer les paragraphes vides
            .replace(/<br><br>/g, '<br>') // Réduire les doubles sauts de ligne
            .replace(/(<p>.*?<\/p>)\s*(<p>.*?<\/p>)/g, '$1$2'); // Réduire l'espacement entre paragraphes
        
        return formatted;
    }

    async testAPIConnection() {
        try {
            console.log('Test de connexion à l\'API...');
            
            // Test avec timeout plus explicite
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes
            
            const response = await fetch(`${this.apiBaseUrl}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.log('Statut API:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Réponse API:', data);
                
                if (data.status === "Healthy !") {
                    console.log('API connectée et fonctionnelle');
                    this.setStatus("API connectée", "success");
                } else {
                    console.warn('API répond mais état inconnu:', data);
                    this.setStatus("API état inconnu", "error");
                }
                
                setTimeout(() => {
                    this.updateStatus();
                }, 2000);
            } else {
                console.warn('API répond mais avec erreur:', response.status);
                this.setStatus("API en erreur", "error");
            }
        } catch (error) {
            console.error('Erreur de connexion API:', error);
            if (error.name === 'AbortError') {
                this.setStatus("API timeout", "error");
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.setStatus("Docker non démarré?", "error");
            } else {
                this.setStatus("API non disponible", "error");
            }
        }
    }

    async makeAuthenticatedRequest(endpoint, options = {}) {
        const result = await chrome.storage.local.get(['authToken']);
        const token = result.authToken;

        if (!token) {
            throw new Error('Aucun token d\'authentification');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Robert-Connect-Token': token,
            ...options.headers
        };

        console.log(`=== REQUÊTE AUTHENTIFIÉE VERS ${endpoint} ===`);
        console.log(`URL complète: ${this.apiBaseUrl}${endpoint}`);
        console.log(`Méthode: ${options.method || 'GET'}`);
        console.log('Headers envoyés:', headers);
        console.log('Token utilisé:', token ? `${token.substring(0, 10)}...` : 'aucun');
        
        if (options.body) {
            console.log('Body (taille):', options.body.length, 'caractères');
            console.log('Body (aperçu):', options.body.substring(0, 500));
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                ...options,
                headers
            });

            console.log(`=== RÉPONSE HTTP ${endpoint} ===`);
            console.log('Status:', response.status, response.statusText);
            console.log('Headers de réponse:');
            response.headers.forEach((value, key) => {
                console.log(`  ${key}: ${value}`);
            });

            if (response.status === 401) {
                console.log('❌ TOKEN EXPIRÉ OU INVALIDE - nettoyage des données d\'auth');
                await this.clearAuthData();
                throw new Error('Session expirée');
            }

            const contentType = response.headers.get('content-type');
            console.log('Content-Type reçu:', contentType);
            
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                const rawText = await response.text();
                console.log('=== RÉPONSE BRUTE (TEXT) ===');
                console.log('Taille:', rawText.length, 'caractères');
                console.log('Contenu brut:', rawText);
                
                try {
                    data = JSON.parse(rawText);
                    console.log('=== RÉPONSE PARSÉE (JSON) ===');
                    console.log('Type:', typeof data);
                    console.log('Contenu:', data);
                } catch (parseError) {
                    console.error('❌ ERREUR DE PARSING JSON:', parseError);
                    console.log('Texte qui a causé l\'erreur:', rawText);
                    throw new Error(`Erreur de parsing JSON: ${parseError.message}`);
                }
            } else {
                const text = await response.text();
                console.log(`❌ RÉPONSE NON-JSON de ${endpoint}:`, text);
                throw new Error(`Réponse inattendue du serveur: ${text}`);
            }
            
            console.log(`=== DONNÉES FINALES ${endpoint} ===`);
            console.log('Data finale:', JSON.stringify(data, null, 2));
            
            if (!response.ok) {
                console.error('❌ RÉPONSE HTTP NON-OK:', response.status, data);
                throw new Error(data.message || data.error || `Erreur HTTP ${response.status}`);
            }

            console.log('✅ SUCCÈS - Retour des données');
            return data;
        } catch (error) {
            console.error(`=== ERREUR FETCH ${endpoint} ===`);
            console.error('Type:', error.name);
            console.error('Message:', error.message);
            console.error('Stack:', error.stack);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Connexion impossible à l'API (${this.apiBaseUrl}). Vérifiez que Docker est démarré.`);
            }
            throw error;
        }
    }

    async clearAuthData() {
        // Nettoyer tout le storage lié à l'authentification
        await chrome.storage.local.remove(['authToken', 'userInfo', 'isLoggedIn']);
        
        // Aussi nettoyer les cookies si nécessaire
        try {
            await chrome.cookies.removeAll({
                domain: 'localhost'
            });
        } catch (error) {
            console.log('Nettoyage des cookies échoué (normal):', error);
        }
        
        console.log('Données d\'authentification entièrement nettoyées');
    }

    async handleLoginSubmit(event) {
        event.preventDefault();
        
        // Essayer d'abord avec les nouveaux IDs, puis les anciens
        let emailField = document.getElementById('email') || document.getElementById('username');
        let passwordField = document.getElementById('password');
        
        if (!emailField || !passwordField) {
            this.showLoginError('Erreur: formulaire de connexion non trouvé');
            return;
        }
        
        const email = emailField.value?.trim();
        const password = passwordField.value?.trim();
        
        if (!email || email.length < 2) {
            this.showLoginError('Veuillez saisir un email valide');
            emailField.focus();
            return;
        }
        
        if (!password || password.length < 3) {
            this.showLoginError('Veuillez saisir un mot de passe valide');
            passwordField.focus();
            return;
        }
        
        this.setLoginLoading(true);
        this.hideLoginError();
          try {
            const loginResult = await this.authenticateUser(email, password);
            
            if (loginResult.success) {
                console.log('Connexion réussie, mise à jour des données...');
                
                // Sauvegarder les données d'authentification
                await chrome.storage.local.set({
                    authToken: loginResult.token,
                    isLoggedIn: true,
                    userInfo: {
                        name: loginResult.user.name,
                        email: loginResult.user.email,
                        id: loginResult.user.id
                    }
                });
                
                console.log('Données d\'authentification sauvegardées');
                
                // Mettre à jour l'état local immédiatement
                this.isLoggedIn = true;
                
                // Afficher l'interface principale immédiatement
                this.showMainInterface();
                this.setStatus("Connexion réussie", "success");
                
                // Charger les informations utilisateur
                await this.loadUserInfo();
                
                // Mettre à jour le statut après un court délai
                setTimeout(() => {
                    this.updateStatus();
                }, 1000);
                
                // Notifier les content scripts du changement d'état
                this.notifyAuthStateChange(true);
                
                console.log('Interface mise à jour - connexion terminée');
                
            } else {
                this.showLoginError(loginResult.error || 'Identifiants incorrects');
            }
            
        } catch (error) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.showLoginError('Erreur de connexion. Vérifiez que Docker est démarré.');
            } else {
                this.showLoginError(error.message || 'Erreur de connexion. Veuillez réessayer.');
            }
        } finally {
            this.setLoginLoading(false);
        }
    }

    async authenticateUser(email, password) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                return {
                    success: false,
                    error: `Erreur serveur: réponse inattendue (${response.status})`
                };
            }

            if (response.ok) {
                let token = data.token || data.access_token || data.authToken || (data.data && data.data.token);
                let user = data.user || (data.data && data.data.user) || data.data;
                
                if (token) {
                    return {
                        success: true,
                        token: token,
                        user: {
                            name: user?.name || user?.username || user?.email || 'Utilisateur',
                            email: user?.email || email || 'email@example.com',
                            id: user?.id || user?._id || user?.user_id || 1
                        }
                    };
                } else {
                    return {
                        success: false,
                        error: 'Aucun token d\'authentification reçu'
                    };
                }
            } else {
                return {
                    success: false,
                    error: data.message || data.error || `Erreur ${response.status}: ${response.statusText}`
                };
            }
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return {
                    success: false,
                    error: `Impossible de se connecter à l'API Docker.`
                };
            }
            
            return {
                success: false,
                error: `Erreur de connexion: ${error.message}`
            };
        }
    }

    async handleLogout() {
        try {
            this.setStatus("Déconnexion...", "loading");
            
            // Essayer de se déconnecter du serveur
            try {
                await this.makeAuthenticatedRequest('/auth/logout', {
                    method: 'POST'
                });
                console.log('Déconnexion serveur réussie');
            } catch (error) {
                console.log('Déconnexion serveur échouée, nettoyage local forcé:', error);
                // Continuer même si la révocation échoue
            }
            
            // Nettoyer les données locales
            await this.clearAuthData();
            this.isLoggedIn = false;
            
            // Mettre à jour l'interface
            this.showLoginInterface();
            this.setStatus("Déconnecté", "ready");
            
            // Notifier tous les onglets du changement d'état de connexion
            try {
                const tabs = await chrome.tabs.query({});
                const promises = [];
                
                for (const tab of tabs) {
                    if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                        promises.push(
                            chrome.tabs.sendMessage(tab.id, {
                                action: "authStateChanged",
                                isLoggedIn: false
                            }).catch(error => {
                                // Ignorer les erreurs si le content script n'est pas présent
                                console.log(`Impossible de notifier l'onglet ${tab.id}:`, error);
                            })
                        );
                    }
                }
                
                // Attendre que toutes les notifications soient envoyées
                await Promise.allSettled(promises);
                console.log('Notification de déconnexion envoyée à tous les onglets');
                
            } catch (error) {
                console.log('Erreur lors de la notification des onglets:', error);
            }
            
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            this.setStatus("Erreur de déconnexion", "error");
            
            // Forcer le nettoyage même en cas d'erreur
            await this.clearAuthData();
            this.isLoggedIn = false;
            this.showLoginInterface();
        }
    }

    async handleForgotPassword() {
        // Essayer d'abord avec les nouveaux IDs, puis les anciens
        const emailField = document.getElementById('email') || document.getElementById('username');
        
        if (!emailField) {
            this.showLoginError('Erreur: champ email non trouvé');
            return;
        }
        
        const email = emailField.value?.trim();
        
        if (!email || email.length === 0) {
            this.showLoginError('Veuillez saisir votre email avant de cliquer sur "Mot de passe oublié"');
            emailField.focus();
            return;
        }

        this.setStatus("Envoi email...", "loading");
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/auth/password-reset-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (response.ok) {
                this.setStatus("Email envoyé", "success");
                this.showLoginError('Un email de récupération a été envoyé.');
                
                setTimeout(() => {
                    chrome.tabs.create({ url: `${this.apiBaseUrl}/password-reset-sent` });
                    window.close();
                }, 2000);
            } else {
                this.showLoginError(data.message || data.error || 'Erreur lors de l\'envoi');
                this.setStatus("Connexion requise", "error");
            }
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.showLoginError(`Impossible de se connecter à l'API.`);
            } else {
                this.showLoginError(`Erreur: ${error.message}`);
            }
            this.setStatus("Connexion requise", "error");
        }
    }

    clearLoginForm() {
        if (this.loginForm) {
            this.loginForm.reset();
            
            // Essayer avec les deux IDs possibles
            const emailField = document.getElementById('email') || document.getElementById('username');
            const passwordField = document.getElementById('password');
            
            if (emailField) emailField.value = '';
            if (passwordField) passwordField.value = '';
        }
        this.hideLoginError();
    }

    createAccount() {
        this.setStatus("Redirection...", "loading");
        chrome.tabs.create({ url: `${this.apiBaseUrl}/register` });
        setTimeout(() => window.close(), 500);
    }

    openHelp() {
        this.setStatus("Ouverture aide...", "loading");
        chrome.tabs.create({ url: `${this.apiBaseUrl}/help` });
        setTimeout(() => this.setStatus("Prêt à vous aider", "ready"), 1000);
    }

    setLoginLoading(loading) {
        const submitBtn = this.loginSubmitBtn;
        const btnText = submitBtn?.querySelector('.login-btn-text');
        const spinner = submitBtn?.querySelector('.login-spinner');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            if (btnText) {
                btnText.classList.toggle('hidden', loading);
                btnText.classList.toggle('inline', !loading);
            }
            if (spinner) {
                spinner.classList.toggle('hidden', !loading);
                spinner.classList.toggle('inline', loading);
            }
        }
    }

    showLoginError(message) {
        if (this.loginError) {
            const errorMessage = this.loginError.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            this.loginError.classList.remove('hidden');
            this.loginError.classList.add('block');
        }
    }

    hideLoginError() {
        if (this.loginError) {
            this.loginError.classList.add('hidden');
        }
    }

    setStatus(text, type = "ready") {
        const statusText = this.statusElement.querySelector(".status-text");
        const statusIndicator = this.statusElement.querySelector(".status-indicator");
        
        statusText.textContent = text;
        
        // Retirer toutes les classes de statut existantes
        statusIndicator.classList.remove('status-ready', 'status-loading', 'status-success', 'status-error');
        
        // Ajouter la nouvelle classe de statut
        statusIndicator.classList.add(`status-${type}`);
    }

    async updateStatus() {
        if (!this.isLoggedIn) {
            this.setStatus("Connexion requise", "error");
            return;
        }
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const hostname = new URL(tab.url).hostname;
            
            const shortHostname = hostname.length > 15 ? hostname.substring(0, 15) + '...' : hostname;
            this.setStatus(`${shortHostname}`, "ready");
        } catch (error) {
            this.setStatus("Déconnecté", "error");
        }
    }

    // Méthode utilitaire pour faire des requêtes aux autres fonctionnalités
    async makeAPIRequest(endpoint, data = {}) {
        try {
            return await this.makeAuthenticatedRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error(`Erreur API ${endpoint}:`, error);
            throw error;
        }
    }

    // Nouvelle méthode pour appeler l'API /chat/page/analyze
    async callPageAnalysisAPI(data) {
        try {
            const result = await this.makeAPIRequest('/chat/page/analyze', data);
            return result;
        } catch (error) {
            return {
                error: `API non disponible: ${error.message}`,
                response: null
            };
        }
    }

    // Nouvelle méthode pour appeler l'API /chat/page/resume
    async callPageResumeAPI(data) {
        try {
            const result = await this.makeAPIRequest('/chat/page/resume', data);
            return result;
        } catch (error) {
            return {
                error: `API non disponible: ${error.message}`,
                response: null
            };
        }
    }

    // Adapter les API Mock Functions pour le mode test
    async callVerificationAPI(data) {
        try {
            // Convertir l'ancien format vers le nouveau avec URL séparée et limitation de taille
            const prompt = `Analyse cette page web et donne-moi un score de confiance de 0 à 100:

Titre: ${data.title}

Contenu HTML:
`;
            const maxHtmlLength = 10000 - prompt.length;
            const truncatedHtml = data.html.substring(0, maxHtmlLength);
            
            const pageAnalysisData = {
                url: data.url,
                body: prompt + truncatedHtml
            };
            
            return await this.callPageAnalysisAPI(pageAnalysisData);
        } catch (error) {
            return {
                isTrustworthy: false,
                score: 0,
                reasons: ["Connexion API impossible"],
                error: "API non disponible"
            };
        }
    }

    // Ancienne méthode de résumé pour compatibilité
    async callSummaryAPI(data) {
        try {
            // Convertir vers le nouveau format avec limitation de taille
            const prompt = `Résume cette page web:

Titre: ${data.title}

Contenu:
`;
            const maxContentLength = 10000 - prompt.length;
            const truncatedContent = data.content.substring(0, maxContentLength);
            
            const pageResumeData = {
                url: data.url,
                body: prompt + truncatedContent
            };
            
            return await this.callPageResumeAPI(pageResumeData);
        } catch (error) {
            return {
                error: `API non disponible: ${error.message}`,
                summary: null
            };
        }
    }

    // Méthode utilitaire pour forcer un nettoyage complet (debug)
    async forceCompleteLogout() {
        console.log('Forçage d\'un nettoyage complet...');
        
        // Nettoyer le storage
        await chrome.storage.local.clear();
        
        // Nettoyer les cookies
        try {
            const cookies = await chrome.cookies.getAll({ domain: 'localhost' });
            for (const cookie of cookies) {
                await chrome.cookies.remove({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                });
            }
        } catch (error) {
            console.log('Nettoyage des cookies échoué:', error);
        }
        
        // Réinitialiser l'état
        this.isLoggedIn = false;
        this.showLoginInterface();
        this.setStatus("Nettoyage complet effectué", "ready");
        
        console.log('Nettoyage complet terminé');
    }

    // Méthode pour notifier les content scripts du changement d'état d'authentification
    async notifyAuthStateChange(isLoggedIn) {
        try {
            console.log(`Notification du changement d'état d'authentification: ${isLoggedIn}`);
            const tabs = await chrome.tabs.query({});
            const promises = [];
            
            for (const tab of tabs) {
                if (tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
                    promises.push(
                        chrome.tabs.sendMessage(tab.id, {
                            action: "authStateChanged",
                            isLoggedIn: isLoggedIn
                        }).catch(error => {
                            // Ignorer les erreurs si le content script n'est pas présent
                            console.log(`Impossible de notifier l'onglet ${tab.id}:`, error);
                        })
                    );
                }
            }
            
            // Attendre que toutes les notifications soient envoyées
            await Promise.allSettled(promises);
            console.log('Notification d\'état d\'authentification envoyée à tous les onglets');
            
        } catch (error) {
            console.log('Erreur lors de la notification des onglets:', error);
        }
    }
}

// Initialiser au chargement
document.addEventListener("DOMContentLoaded", () => {
    console.log('Popup Robert IA chargée');
    new RobertPopup();
});
