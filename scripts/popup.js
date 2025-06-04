class RobertPopup {
    constructor() {
        this.apiBaseUrl = 'http://localhost:5000';
        this.isLoggedIn = false;
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuthOnStartup();
        this.testAPIConnection();
    }

    initializeElements() {
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
    }

    attachEventListeners() {
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
            this.accountBtn.addEventListener("click", () => this.showAccountSection());
        }
        if (this.backBtn) {
            this.backBtn.addEventListener("click", () => this.hideAccountSection());
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
    }

    async checkAuthOnStartup() {
        try {
            const result = await chrome.storage.local.get(['authToken']);
            if (result.authToken) {
                await this.verifyCurrentUser();
            } else {
                this.showLoginInterface();
            }
        } catch (error) {
            console.error('Erreur lors de la vérification d\'authentification:', error);
            this.showLoginInterface();
        }
    }

    async verifyCurrentUser() {
        try {
            const result = await chrome.storage.local.get(['authToken']);
            if (!result.authToken) {
                throw new Error('Aucun token disponible');
            }

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
                    await chrome.storage.local.set({
                        isLoggedIn: true,
                        userInfo: {
                            name: user.name || user.username || user.email || 'Utilisateur',
                            email: user.email || 'email@example.com',
                            id: user.id || user._id || user.user_id || 1
                        }
                    });
                    
                    this.isLoggedIn = true;
                    this.showMainInterface();
                    this.updateStatus();
                    return;
                }
            }
            
            throw new Error('Structure de réponse invalide de /auth/me');
        } catch (error) {
            console.error('Erreur de vérification utilisateur:', error);
            await this.clearAuthData();
            this.showLoginInterface();
        }
    }

    showLoginInterface() {
        this.isLoggedIn = false;
        
        // Masquer l'interface principale
        if (this.mainContent) this.mainContent.style.display = 'none';
        if (this.accountSection) this.accountSection.style.display = 'none';
        
        // Afficher uniquement le portail de connexion
        if (this.loginSection) {
            this.loginSection.style.display = 'flex';
        }
        
        this.setStatus("Connexion requise", "error");
        this.clearLoginForm();
    }

    showMainInterface() {
        this.isLoggedIn = true;
        
        // Masquer le portail de connexion
        if (this.loginSection) this.loginSection.style.display = 'none';
        
        // Afficher l'interface principale
        if (this.mainContent) this.mainContent.style.display = 'flex';
        if (this.accountSection) this.accountSection.style.display = 'none';
        
        this.loadUserInfo();
    }

    showAccountSection() {
        if (!this.isLoggedIn) return;
        
        if (this.accountSection && this.mainContent) {
            this.accountSection.style.display = "flex";
            this.mainContent.style.display = "none";
        }
    }

    hideAccountSection() {
        if (!this.isLoggedIn) return;
        
        if (this.accountSection && this.mainContent) {
            this.accountSection.style.display = "none";
            this.mainContent.style.display = "flex";
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
            
            const verificationResult = await this.callVerificationAPI({
                url: tab.url,
                title: tab.title,
                html: htmlContent.substring(0, 5000)
            });
            
            if (verificationResult.error) {
                this.setStatus(verificationResult.error, "error");
            } else {
                this.setStatus(`Score: ${verificationResult.score}/100`, "success");
            }
            
            setTimeout(() => this.updateStatus(), 3000);
        } catch (error) {
            this.setStatus("Erreur de vérification", "error");
            console.error("Erreur:", error);
        }
    }

    async summarizePage() {
        this.setStatus("Résumé en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => document.body.innerText
            });
            
            const textContent = results[0].result;
            
            const summary = await this.callSummaryAPI({
                url: tab.url,
                title: tab.title,
                content: textContent.substring(0, 10000)
            });
            
            if (summary.error) {
                this.setStatus(summary.error, "error");
            } else {
                this.setStatus("Résumé créé", "success");
                console.log("Résumé:", summary.summary);
            }
            
            setTimeout(() => this.updateStatus(), 3000);
        } catch (error) {
            this.setStatus("Erreur de résumé", "error");
            console.error("Erreur:", error);
        }
    }

    async checkEmail() {
        this.setStatus("Vérification email...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    const emailProviders = [
                        { name: 'Gmail', selectors: ['.ii.gt', '[role="main"] [data-message-id]'] },
                        { name: 'Outlook', selectors: ['[role="main"] .allowTextSelection', '.rps_1454'] },
                        { name: 'Yahoo', selectors: ['.msg-body', '[data-test-id="message-view-body"]'] },
                        { 
                            name: 'Zimbra', 
                            selectors: [
                                '.MsgBody',
                                '.ZmMsgBody', 
                                '[id*="zv__MSG"]',
                                '.MsgBody-html',
                                '[class*="MsgBodyContainer"]',
                                '.ZmMailMsgView .MsgBody',
                                '[id^="zv__MSG"][id$="__MSG_body"]'
                            ] 
                        }
                    ];
                    
                    for (const provider of emailProviders) {
                        for (const selector of provider.selectors) {
                            const emailElement = document.querySelector(selector);
                            if (emailElement) {
                                let subject = 'Sujet non trouvé';
                                
                                if (provider.name === 'Zimbra') {
                                    const subjectSelectors = [
                                        '.SubjectCol',
                                        '[id*="zv__MSG"][id*="subject"]',
                                        '.ZmMailMsgView .SubjectCol',
                                        '[class*="MsgHeaderTable"] .SubjectCol',
                                        '.MsgHeaderSubject'
                                    ];
                                    
                                    for (const subjSelector of subjectSelectors) {
                                        const subjElement = document.querySelector(subjSelector);
                                        if (subjElement) {
                                            subject = subjElement.textContent || subjElement.innerText || subject;
                                            break;
                                        }
                                    }
                                } else {
                                    const subjElement = document.querySelector('h2, [data-testid="message-subject"], .hP, .SubjectCol');
                                    if (subjElement) {
                                        subject = subjElement.textContent || subjElement.innerText || subject;
                                    }
                                }
                                
                                return {
                                    isEmail: true,
                                    provider: provider.name,
                                    subject: subject.trim(),
                                    content: emailElement.innerText.substring(0, 5000)
                                };
                            }
                        }
                    }
                    
                    return { isEmail: false };
                }
            });
            
            const emailData = results[0].result;
            
            let result;
            if (!emailData.isEmail) {
                result = {
                    isEmail: false,
                    message: "Vous ne semblez pas être sur un email"
                };
                this.setStatus(result.message, "warning");
            } else {
                result = await this.callPhishingAPI(emailData);
                if (result.error) {
                    this.setStatus(result.error, "error");
                } else {
                    const statusType = result.isDangerous ? "error" : "success";
                    const statusMessage = result.isDangerous ? "Email suspect détecté" : "Email sécurisé";
                    this.setStatus(statusMessage, statusType);
                }
            }
            
            setTimeout(() => this.updateStatus(), 3000);
        } catch (error) {
            this.setStatus("Erreur vérification email", "error");
            console.error("Erreur:", error);
        }
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

        console.log(`Requête authentifiée vers: ${this.apiBaseUrl}${endpoint}`);
        console.log('Token utilisé:', token ? `${token.substring(0, 10)}...` : 'aucun');

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                ...options,
                headers
            });

            console.log(`Réponse de ${endpoint}:`, response.status, response.statusText);

            if (response.status === 401) {
                console.log('Token expiré ou invalide - nettoyage des données d\'auth');
                await this.clearAuthData();
                throw new Error('Session expirée');
            }

            const contentType = response.headers.get('content-type');
            let data;
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                console.log(`Réponse non-JSON de ${endpoint}:`, text);
                throw new Error(`Réponse inattendue du serveur: ${text}`);
            }
            
            console.log(`Données de ${endpoint}:`, data);
            
            if (!response.ok) {
                throw new Error(data.message || data.error || `Erreur HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Connexion impossible à l'API (${this.apiBaseUrl}). Vérifiez que Docker est démarré.`);
            }
            throw error;
        }
    }

    async clearAuthData() {
        await chrome.storage.local.remove(['authToken', 'userInfo', 'isLoggedIn']);
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
                await chrome.storage.local.set({
                    authToken: loginResult.token,
                    isLoggedIn: true,
                    userInfo: {
                        name: loginResult.user.name,
                        email: loginResult.user.email,
                        id: loginResult.user.id
                    }
                });
                
                this.setStatus("Connexion réussie", "success");
                this.isLoggedIn = true;
                this.showMainInterface();
                
                setTimeout(() => {
                    this.updateStatus();
                }, 2000);
                
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
            
            try {
                await this.makeAuthenticatedRequest('/auth/logout', {
                    method: 'POST'
                });
            } catch (error) {
                // Continuer même si la révocation échoue
            }
            
            await this.clearAuthData();
            this.isLoggedIn = false;
            this.showLoginInterface();
            
            // Notifier tous les onglets du changement d'état de connexion
            try {
                const tabs = await chrome.tabs.query({});
                for (const tab of tabs) {
                    if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
                        try {
                            await chrome.tabs.sendMessage(tab.id, {
                                action: "authStateChanged",
                                isLoggedIn: false
                            });
                        } catch (error) {
                            // Ignorer les erreurs si le content script n'est pas présent
                        }
                    }
                }
            } catch (error) {
                console.log('Erreur lors de la notification des onglets:', error);
            }
            
        } catch (error) {
            this.setStatus("Erreur de déconnexion", "error");
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
            if (btnText) btnText.style.display = loading ? 'none' : 'inline';
            if (spinner) spinner.style.display = loading ? 'inline' : 'none';
        }
    }

    showLoginError(message) {
        if (this.loginError) {
            const errorMessage = this.loginError.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
            this.loginError.style.display = 'block';
        }
    }

    hideLoginError() {
        if (this.loginError) {
            this.loginError.style.display = 'none';
        }
    }

    setStatus(text, type = "ready") {
        const statusText = this.statusElement.querySelector(".status-text");
        const statusIndicator = this.statusElement.querySelector(".status-indicator");
        
        statusText.textContent = text;
        
        const colors = {
            ready: "#22c55e",
            loading: "#f97316", 
            success: "#22c55e",
            error: "#ef4444"
        };
        
        statusIndicator.style.backgroundColor = colors[type];
        
        if (type === "loading") {
            statusIndicator.style.animation = "pulse 1s infinite";
        } else {
            statusIndicator.style.animation = "pulse 2s infinite";
        }
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

    // Adapter les API Mock Functions pour le mode test
    async callVerificationAPI(data) {
        try {
            return await this.makeAPIRequest('/analyze/verify-page', data);
        } catch (error) {
            return {
                isTrustworthy: false,
                score: 0,
                reasons: ["Connexion API impossible"],
                error: "API non disponible"
            };
        }
    }

    async callSummaryAPI(data) {
        try {
            return await this.makeAPIRequest('/analyze/summarize-page', data);
        } catch (error) {
            return {
                summary: "Impossible de générer le résumé",
                keyPoints: [],
                error: "API non disponible"
            };
        }
    }

    async callPhishingAPI(emailData) {
        try {
            return await this.makeAPIRequest('/analyze/check-email', emailData);
        } catch (error) {
            return {
                isEmail: true,
                provider: emailData.provider,
                subject: emailData.subject,
                isDangerous: false,
                message: "Impossible d'analyser l'email",
                confidence: 0,
                error: "API non disponible"
            };
        }
    }
}

// Initialiser au chargement
document.addEventListener("DOMContentLoaded", () => {
    console.log('Popup Robert IA chargée');
    new RobertPopup();
});
