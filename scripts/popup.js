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
    }    async verifyPage() {
        this.setStatus("Vérification en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Extraire uniquement le contenu texte pertinent de la page
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // Fonction pour extraire le contenu texte principal
                    function extractMainContent() {
                        // Supprimer les éléments non pertinents
                        const elementsToRemove = document.querySelectorAll(
                            'script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ads, .advertisement'
                        );
                        
                        // Créer une copie du document pour ne pas modifier l'original
                        const clone = document.cloneNode(true);
                        
                        // Supprimer les éléments non pertinents de la copie
                        const cloneElementsToRemove = clone.querySelectorAll(
                            'script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ads, .advertisement'
                        );
                        cloneElementsToRemove.forEach(el => el.remove());
                        
                        // Récupérer le contenu principal
                        const mainSelectors = [
                            'main',
                            'article', 
                            '.content',
                            '.main-content',
                            '.post-content',
                            '.entry-content',
                            '#content',
                            '#main',
                            '.container'
                        ];
                        
                        let mainContent = '';
                        
                        // Essayer de trouver le contenu principal
                        for (const selector of mainSelectors) {
                            const element = clone.querySelector(selector);
                            if (element) {
                                mainContent = element.textContent || element.innerText || '';
                                if (mainContent.trim().length > 200) {
                                    break;
                                }
                            }
                        }
                        
                        // Si pas de contenu principal trouvé, prendre le body
                        if (!mainContent || mainContent.trim().length < 200) {
                            mainContent = clone.body ? (clone.body.textContent || clone.body.innerText || '') : '';
                        }
                        
                        // Nettoyer le texte
                        return mainContent
                            .replace(/\s+/g, ' ')  // Remplacer les espaces multiples par un seul
                            .replace(/\n\s*\n/g, '\n')  // Supprimer les lignes vides multiples
                            .trim();
                    }
                    
                    return extractMainContent();
                }
            });
            
            const textContent = results[0].result;
            
            // Préparer le contenu de la page pour l'analyse - limité à 6000 chars pour laisser de la place au prompt
            const prompt = `Analyse cette page web et donne-moi un score de confiance de 0 à 100 ainsi qu'une évaluation de sa fiabilité:

Titre: ${tab.title}

Contenu:
`;
            
            const maxContentLength = 8000 - prompt.length;
            const finalTextContent = textContent.length > maxContentLength 
                ? textContent.substring(0, maxContentLength) + "..."
                : textContent;
            
            // Préparer les données à envoyer avec URL séparée
            const dataToSend = {
                url: tab.url,
                body: prompt + finalTextContent
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
    }    async summarizePage() {
        this.setStatus("Résumé en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Extraire uniquement le contenu texte pertinent de la page
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => {
                    // Fonction pour extraire le contenu texte principal
                    function extractMainContent() {
                        // Supprimer les éléments non pertinents
                        const elementsToRemove = document.querySelectorAll(
                            'script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ads, .advertisement'
                        );
                        
                        // Créer une copie du document pour ne pas modifier l'original
                        const clone = document.cloneNode(true);
                        
                        // Supprimer les éléments non pertinents de la copie
                        const cloneElementsToRemove = clone.querySelectorAll(
                            'script, style, nav, header, footer, aside, .sidebar, .menu, .navigation, .ads, .advertisement'
                        );
                        cloneElementsToRemove.forEach(el => el.remove());
                        
                        // Récupérer le contenu principal
                        const mainSelectors = [
                            'main',
                            'article', 
                            '.content',
                            '.main-content',
                            '.post-content',
                            '.entry-content',
                            '#content',
                            '#main',
                            '.container'
                        ];
                        
                        let mainContent = '';
                        
                        // Essayer de trouver le contenu principal
                        for (const selector of mainSelectors) {
                            const element = clone.querySelector(selector);
                            if (element) {
                                mainContent = element.textContent || element.innerText || '';
                                if (mainContent.trim().length > 200) {
                                    break;
                                }
                            }
                        }
                        
                        // Si pas de contenu principal trouvé, prendre le body
                        if (!mainContent || mainContent.trim().length < 200) {
                            mainContent = clone.body ? (clone.body.textContent || clone.body.innerText || '') : '';
                        }
                        
                        // Nettoyer le texte
                        return mainContent
                            .replace(/\s+/g, ' ')  // Remplacer les espaces multiples par un seul
                            .replace(/\n\s*\n/g, '\n')  // Supprimer les lignes vides multiples
                            .trim();
                    }
                    
                    return extractMainContent();
                }
            });
            
            const textContent = results[0].result;
            
            // Préparer le contenu de la page pour le résumé - limité pour ne pas dépasser 8000 chars
            const prompt = `Résume cette page web de manière concise et structurée:

Titre: ${tab.title}

Contenu:
`;
            
            const maxContentLength = 8000 - prompt.length;
            const finalTextContent = textContent.length > maxContentLength 
                ? textContent.substring(0, maxContentLength) + "..."
                : textContent;
            
            // Préparer les données à envoyer
            const dataToSend = {
                url: tab.url,
                body: prompt + finalTextContent
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
    }async checkEmail() {
        this.setStatus("Analyse email en cours...", "loading");
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Onglet actuel pour analyse email:', tab.url);
            
            // Détecter le provider d'email
            const emailProvider = this.detectEmailProvider(tab.url);
            
            if (!emailProvider) {
                console.error('Provider email non supporté pour:', tab.url);
                this.setStatus("Provider email non supporté", "error");
                this.showEmailResult("❌ Provider d'email non supporté. Assurez-vous d'être sur Gmail, Outlook, Yahoo Mail ou Zimbra.", null, tab.url);
                return;
            }
            
            console.log('Provider email détecté:', emailProvider);
            
            // SUPPRESSION COMPLÈTE de la vérification - FORCER L'ANALYSE DIRECTE
            console.log('🔥 ANALYSE FORCÉE - Extraction de TOUT le contenu disponible');
            
            // Extraire le contenu de l'email selon le provider
            let emailData;
            try {
                console.log('Début extraction FORCÉE du contenu email...');
                emailData = await this.extractEmailContent(tab.id, emailProvider);
                console.log('Données email extraites (FORCÉ):', {
                    provider: emailData.provider,
                    extractionType: emailData.extractionType || 'standard',
                    hasSubject: !!emailData.subject,
                    subjectLength: emailData.subject?.length || 0,
                    hasContent: !!emailData.content,
                    contentLength: emailData.content?.length || 0,
                    hasFrom: !!emailData.from,
                    warning: emailData.warning || 'aucune'
                });
            } catch (extractError) {
                console.error('Erreur extraction email:', extractError);
                this.setStatus("Impossible d'extraire l'email", "error");
                this.showEmailResult(`❌ Impossible d'extraire le contenu de l'email: ${extractError.message}. Assurez-vous qu'un email est ouvert.`, null, tab.url);
                return;
            }
            
            // FORCER L'ANALYSE - Même avec contenu minimal
            console.log('🚀 FORÇAGE de l\'analyse avec TOUT le contenu disponible...');
            
            console.log('Envoi FORCÉ des données à l\'API d\'analyse...');
            
            // Analyser l'email via l'API /chat/mail - TOUJOURS CONTINUER
            const analysisResult = await this.callEmailAnalysisAPI(emailData);
            
            console.log('Résultat analyse API:', analysisResult);
            
            if (analysisResult.error) {
                console.error('Erreur API:', analysisResult.error);
                this.setStatus(analysisResult.error, "error");
                this.showEmailResult(`❌ ${analysisResult.error}`, null, tab.url);
            } else if (analysisResult.response) {
                // Essayer d'extraire un score de risque de la réponse
                const riskMatch = analysisResult.response.match(/risque[:\s]*(\d+)\/100|score[:\s]*(\d+)|danger[:\s]*(\d+)|(\d+)\s*%\s*risque/i);
                let riskScore = null;
                
                if (riskMatch) {
                    riskScore = riskMatch[1] || riskMatch[2] || riskMatch[3] || riskMatch[4];
                    console.log('Score de risque extrait:', riskScore);
                }
                
                // Afficher le résultat avec info sur le type d'extraction
                let resultTitle = '📧 Analyse email - Phishing';
                if (emailData.extractionType === 'full-text-view') {
                    resultTitle += ' ✅ (Analyse complète)';
                } else if (emailData.extractionType === 'interface-limited') {
                    resultTitle += ' 🔥 (Analyse forcée)';
                } else {
                    resultTitle += ' 🛡️ (Analyse disponible)';
                }
                
                this.showEmailResult(analysisResult.response, riskScore, tab.url, emailProvider, emailData.subject, resultTitle);
                this.setStatus("Analyse email terminée", "success");
            } else {
                console.error('Réponse API vide ou invalide:', analysisResult);
                this.setStatus("Réponse vide de l'API", "error");
                this.showEmailResult("❌ Aucune réponse de l'API d'analyse", null, tab.url);
            }
            
        } catch (error) {
            console.error('Erreur générale analyse email:', error);
            this.setStatus("Erreur d'analyse email", "error");
            this.showEmailResult(`❌ Erreur lors de l'analyse: ${error.message}`, null, null);
        }
    }

    detectEmailProvider(url) {
        const hostname = new URL(url).hostname.toLowerCase();
        const fullUrl = url.toLowerCase();
        
        console.log('Détection provider pour:', hostname, 'URL complète:', fullUrl);
        
        // Gmail (interface web et applications)
        if (hostname.includes('mail.google.') || hostname.includes('gmail.') || 
            fullUrl.includes('mail.google.com') || fullUrl.includes('gmail.com')) {
            console.log('Provider détecté: Gmail');
            return 'gmail';
        }
        
        // Outlook (Office 365, Outlook.com, Hotmail)
        if (hostname.includes('outlook.') || hostname.includes('office.') || 
            hostname.includes('hotmail.') || hostname.includes('live.') ||
            fullUrl.includes('outlook.office.com') || fullUrl.includes('outlook.live.com')) {
            console.log('Provider détecté: Outlook');
            return 'outlook';
        }
        
        // Yahoo Mail
        if (hostname.includes('mail.yahoo.') || hostname.includes('yahoo.') ||
            fullUrl.includes('mail.yahoo.com')) {
            console.log('Provider détecté: Yahoo');
            return 'yahoo';
        }
        
        // Zimbra (UPHF et autres entreprises)
        if (hostname.includes('zimbra') || hostname.includes('uphf.fr') || 
            fullUrl.includes('/zimbra/') || fullUrl.includes('zimbramail') ||
            hostname.includes('webmail') || fullUrl.includes('webmail')) {
            console.log('Provider détecté: Zimbra');
            return 'zimbra';
        }
        
        console.log('Aucun provider reconnu pour:', hostname);
        return null;
    }

    async extractEmailContent(tabId, provider) {
        console.log(`🔥 EXTRACTION FORCÉE contenu email pour provider: ${provider}`);
        
        if (!provider) {
            throw new Error(`Provider non spécifié`);
        }

        try {
            let results;
            
            // Exécuter le script spécifique au provider en tant que fonction directe
            if (provider === 'gmail') {
                results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        console.log('Script Gmail - Début extraction');
                        
                        // Gmail - sélecteurs améliorés 2024
                        const subjectSelectors = [
                            '[data-thread-perm-id] h2',
                            '.hP',
                            '.bqe', 
                            '.ams',
                            '.bqm',
                            '.bog',
                            '[data-legacy-thread-id] h2',
                            'h2[data-thread-perm-id]',
                            '.aKs h2',
                            '.zA .y2 .bqm'
                        ];
                        
                        let subject = '';
                        for (const selector of subjectSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent?.trim()) {
                                subject = element.textContent.trim();
                                console.log('Gmail - Sujet trouvé avec:', selector, subject);
                                break;
                            }
                        }

                        // Contenu principal - sélecteurs étendus pour récupérer HTML
                        const contentSelectors = [
                            '.ii.gt .im',
                            '.adP .im', 
                            '.adn .im',
                            '[data-message-id] .im',
                            '.h7 .im',
                            '.ii.gt div[dir="ltr"]',
                            '.ii.gt .a3s',
                            '.aHl .a3s',
                            '.gmail_default',
                            '.ii.gt',
                            '.adP',
                            '.adn',
                            '.h7',
                            'div[data-message-id]',
                            '.kix-lineview-text-block',
                            'div[contenteditable="true"]'
                        ];
                        
                        let content = '';
                        for (const selector of contentSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Récupérer le HTML brut pour conserver les liens
                                content = element.innerHTML?.trim() || element.textContent?.trim() || '';
                                if (content) {
                                    console.log('Gmail - Contenu HTML trouvé avec:', selector, content.substring(0, 100));
                                    break;
                                }
                            }
                        }
                        
                        // Si pas de contenu spécifique, essayer de prendre tout le contenu visible
                        if (!content) {
                            const bodyContent = document.body.innerHTML || document.body.textContent || '';
                            if (bodyContent.includes('@') || bodyContent.length > 100) {
                                content = bodyContent.trim();
                                console.log('Gmail - Contenu HTML fallback:', content.substring(0, 100));
                            }
                        }

                        // Expéditeur - sélecteurs étendus pour récupérer l'email
                        const fromSelectors = [
                            '.gD',
                            '.bqn .go .g2',
                            '[email]',
                            '.qu [email]',
                            '.go .g2',
                            '.yW span[email]',
                            '.yW .go',
                            '.ajy .g2'
                        ];
                        
                        let from = '';
                        for (const selector of fromSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Prioriser l'attribut email
                                const emailAttr = element.getAttribute('email');
                                if (emailAttr && emailAttr.includes('@')) {
                                    from = emailAttr;
                                    console.log('Gmail - Email trouvé via attribut:', selector, from);
                                    break;
                                }
                                
                                // Sinon extraire l'email du texte
                                const textContent = element.textContent?.trim() || '';
                                const emailMatch = textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                if (emailMatch) {
                                    from = emailMatch[0];
                                    console.log('Gmail - Email extrait du texte:', selector, from);
                                    break;
                                }
                                
                                // Fallback sur le contenu textuel s'il contient @
                                if (textContent.includes('@')) {
                                    from = textContent;
                                    console.log('Gmail - Contenu avec @ trouvé:', selector, from);
                                    break;
                                }
                            }
                        }
                        
                        console.log('Gmail - Résultat final:', { subject, content: content.substring(0, 100), from });
                        return { subject, content, from, provider: 'gmail' };
                    }
                });
            } else if (provider === 'outlook') {
                results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        console.log('Script Outlook - Début extraction');
                        
                        // Outlook Web App - sélecteurs améliorés
                        const subjectSelectors = [
                            '[aria-label*="Subject"]',
                            '.rps_cc5e .rps_dc36',
                            'h1[role="heading"]',
                            '[data-testid="message-subject"]',
                            '.allowTextSelection h1',
                            '.rps_dc36',
                            'h1.rps_dc36'
                        ];
                        
                        let subject = '';
                        for (const selector of subjectSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent?.trim()) {
                                subject = element.textContent.trim();
                                console.log('Outlook - Sujet trouvé avec:', selector, subject);
                                break;
                            }
                        }

                        // Contenu de l'email - sélecteurs étendus pour récupérer HTML
                        const contentSelectors = [
                            '[role="document"] .rps_889a',
                            '.rps_889a',
                            '[data-app-section="MailCompose"] .rps_8697',
                            '.allowTextSelection',
                            '[aria-label="Message body"]',
                            '[data-testid="message-body"]',
                            '.rps_8697',
                            '.elementToProof',
                            'div[contenteditable="true"]',
                            '.rps_889a div'
                        ];
                        
                        let content = '';
                        for (const selector of contentSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Récupérer le HTML brut pour conserver les liens
                                content = element.innerHTML?.trim() || element.textContent?.trim() || '';
                                if (content) {
                                    console.log('Outlook - Contenu HTML trouvé avec:', selector, content.substring(0, 100));
                                    break;
                                }
                            }
                        }

                        // Expéditeur - extraire l'adresse email
                        const fromSelectors = [
                            '[aria-label*="From:"]',
                            '.rps_d875',
                            '[data-testid="message-from"]',
                            '.allowTextSelection [email]'
                        ];
                        
                        let from = '';
                        for (const selector of fromSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Prioriser l'attribut email
                                const emailAttr = element.getAttribute('email');
                                if (emailAttr && emailAttr.includes('@')) {
                                    from = emailAttr;
                                    console.log('Outlook - Email trouvé via attribut:', selector, from);
                                    break;
                                }
                                
                                // Sinon extraire l'email du texte
                                const textContent = element.textContent?.trim() || '';
                                const emailMatch = textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                if (emailMatch) {
                                    from = emailMatch[0];
                                    console.log('Outlook - Email extrait du texte:', selector, from);
                                    break;
                                }
                                
                                // Fallback sur le contenu textuel s'il contient @
                                if (textContent.includes('@')) {
                                    from = textContent;
                                    console.log('Outlook - Contenu avec @ trouvé:', selector, from);
                                    break;
                                }
                            }
                        }
                        
                        console.log('Outlook - Résultat final:', { subject, content: content.substring(0, 100), from });
                        return { subject, content, from, provider: 'outlook' };
                    }
                });
            } else if (provider === 'yahoo') {
                results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        console.log('Script Yahoo - Début extraction');
                        
                        // Yahoo Mail - sélecteurs améliorés
                        const subjectSelectors = [
                            '[data-test-id="subject"]',
                            '.D_F',
                            '[aria-label*="Subject"]'
                        ];
                        
                        let subject = '';
                        for (const selector of subjectSelectors) {
                            const element = document.querySelector(selector);
                            if (element && element.textContent?.trim()) {
                                subject = element.textContent.trim();
                                console.log('Yahoo - Sujet trouvé avec:', selector, subject);
                                break;
                            }
                        }

                        // Contenu - récupérer HTML pour conserver les liens
                        const contentSelectors = [
                            '[data-test-id="message-body"]',
                            '.aol_1',
                            '.kf_V',
                            '[aria-label*="Message body"]'
                        ];
                        
                        let content = '';
                        for (const selector of contentSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Récupérer le HTML brut pour conserver les liens
                                content = element.innerHTML?.trim() || element.textContent?.trim() || '';
                                if (content) {
                                    console.log('Yahoo - Contenu HTML trouvé avec:', selector, content.substring(0, 100));
                                    break;
                                }
                            }
                        }

                        // Expéditeur - extraire l'adresse email
                        const fromSelectors = [
                            '[data-test-id="sender-email"]',
                            '.D_F .Q_I',
                            '[aria-label*="From"]'
                        ];
                        
                        let from = '';
                        for (const selector of fromSelectors) {
                            const element = document.querySelector(selector);
                            if (element) {
                                // Prioriser l'attribut email
                                const emailAttr = element.getAttribute('email');
                                if (emailAttr && emailAttr.includes('@')) {
                                    from = emailAttr;
                                    console.log('Yahoo - Email trouvé via attribut:', selector, from);
                                    break;
                                }
                                
                                // Sinon extraire l'email du texte
                                const textContent = element.textContent?.trim() || '';
                                const emailMatch = textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                if (emailMatch) {
                                    from = emailMatch[0];
                                    console.log('Yahoo - Email extrait du texte:', selector, from);
                                    break;
                                }
                                
                                // Fallback sur le contenu textuel s'il contient @
                                if (textContent.includes('@')) {
                                    from = textContent;
                                    console.log('Yahoo - Contenu avec @ trouvé:', selector, from);
                                    break;
                                }
                            }
                        }
                        
                        console.log('Yahoo - Résultat final:', { subject, content: content.substring(0, 100), from });
                        return { subject, content, from, provider: 'yahoo' };
                    }
                });            } else if (provider === 'zimbra') {
                results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        console.log('🔥 Script Zimbra - EXTRACTION ULTRA-AGRESSIVE');
                        
                        // Vérifier d'abord si on est sur une page de vue texte (view=text)
                        const currentUrl = window.location.href;
                        const isTextView = currentUrl.includes('view=text');
                        
                        console.log('Zimbra - URL actuelle:', currentUrl);
                        console.log('Zimbra - Vue texte détectée:', isTextView);
                        
                        if (isTextView) {
                            // EXTRACTION COMPLÈTE DEPUIS VUE TEXTE
                            console.log('Zimbra - Extraction COMPLÈTE depuis vue texte');
                            
                            // Récupérer TOUT le contenu brut de la page
                            const fullContent = document.body.textContent || document.body.innerText || '';
                            
                            console.log('Zimbra - Contenu brut complet (premiers 500 chars):', fullContent.substring(0, 500));
                            
                            // Extraire le sujet depuis les headers
                            let subject = '';
                            const subjectMatch = fullContent.match(/^Objet\s*:\s*(.+)$/m) || 
                                                fullContent.match(/^Subject\s*:\s*(.+)$/m);
                            if (subjectMatch) {
                                subject = subjectMatch[1].trim();
                                console.log('Zimbra - Sujet extrait:', subject);
                            }
                            
                            // Extraire l'expéditeur COMPLET depuis les headers
                            let from = '';
                            // Chercher "De :" ou "From :" dans les headers
                            const fromMatch = fullContent.match(/^De\s*:\s*(.+)$/m) || 
                                            fullContent.match(/^From\s*:\s*(.+)$/m);
                            if (fromMatch) {
                                from = fromMatch[1].trim();
                                console.log('Zimbra - Expéditeur extrait depuis headers:', from);
                            }
                            
                            // NOUVEAU : Extraire le sender depuis Return-Path ou Chemin de retour
                            let actualSender = '';
                            const returnPathMatch = fullContent.match(/(?:Return-Path|Chemin de retour)\s*:\s*([^\s\n]+)/i);
                            if (returnPathMatch) {
                                actualSender = returnPathMatch[1].trim().replace(/[<>]/g, '');
                                console.log('Zimbra - Return-Path trouvé:', actualSender);
                            }
                            
                            // Si pas de Return-Path, essayer d'extraire depuis les headers "Reçu" ou "Received"
                            if (!actualSender) {
                                const receivedMatch = fullContent.match(/(?:Reçu|Received)\s*:\s*de\s+([^\s\(]+)/i);
                                if (receivedMatch) {
                                    actualSender = receivedMatch[1].trim();
                                    console.log('Zimbra - Sender depuis Received:', actualSender);
                                }
                            }
                            
                            // Utiliser le sender détecté ou fallback sur l'expéditeur
                            const finalSender = actualSender || from;
                            
                            // CONTENU COMPLET : Prendre TOUT pour l'analyse (headers + corps)
                            let content = fullContent;
                            
                            // Optionnel : limiter la taille si trop volumineux
                            if (content.length > 15000) {
                                // Prendre les premiers 10000 chars (headers) + derniers 5000 chars (contenu)
                                const headersPart = content.substring(0, 10000);
                                const contentPart = content.substring(content.length - 5000);
                                content = headersPart + "\n\n[...CONTENU TRONQUÉ...]\n\n" + contentPart;
                                console.log('Zimbra - Contenu tronqué pour éviter surcharge');
                            }
                            
                            console.log('Zimbra - Extraction vue texte terminée:', {
                                subject: subject.substring(0, 100),
                                from: from.substring(0, 100), 
                                actualSender: finalSender.substring(0, 100),
                                contentLength: content.length
                            });
                            
                            return { 
                                subject, 
                                content, 
                                from: finalSender, // Utiliser le vrai sender pour l'analyse
                                provider: 'zimbra',
                                extractionType: 'full-text-view',
                                originalFrom: from // Garder l'info du From original
                            };
                        }
                        
                        // 🔥 EXTRACTION ULTRA-AGRESSIVE DEPUIS INTERFACE NORMALE
                        console.log('🔥 Zimbra - EXTRACTION ULTRA-AGRESSIVE depuis interface normale');
                        
                        let subject = '';
                        let from = '';
                        let content = '';
                        
                        // 🔥 RÉCUPÉRER TOUT LE CONTENU DE LA PAGE D'ABORD
                        const allPageContent = document.body.textContent || document.body.innerText || document.body.innerHTML || '';
                        console.log('🔥 Zimbra - TOUT le contenu de la page (premiers 1000 chars):', allPageContent.substring(0, 1000));
                        
                        // EXTRACTION SUPER AGRESSIVE DU SUJET
                        const subjectSelectors = [
                            '.SubjectFragment',
                            '.MsgHdrSubject',
                            '.ZhCallListPrintView .SubjectFragment',
                            '[id*="subject"]',
                            '.ConvListItem .Subject',
                            'td.SubjectCol',
                            '.subject',
                            'h1', 'h2', 'h3', 'h4',
                            '[title*="Subject"]',
                            '[aria-label*="Subject"]',
                            '.ZmMailMsgView h1',
                            '.ZmMailMsgView h2',
                            '.ZmMailMsgView .Subject',
                            '.MsgHdr .Subject',
                            '.MsgHeaderTable .Subject'
                        ];
                        
                        // Essayer tous les sélecteurs possibles
                        for (const selector of subjectSelectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const element of elements) {
                                if (element && element.textContent?.trim()) {
                                    const text = element.textContent.trim();
                                    if (text.length > 3 && !text.toLowerCase().includes('zimbra') && !text.toLowerCase().includes('loading')) {
                                        subject = text;
                                        console.log('🔥 Zimbra - Sujet trouvé avec:', selector, subject);
                                        break;
                                    }
                                }
                            }
                            if (subject) break;
                        }
                        
                        // Fallback: extraire depuis le titre ou le contenu
                        if (!subject) {
                            const title = document.title || '';
                            if (title && !title.includes('Zimbra') && title.length > 5) {
                                subject = title.replace(/^(Re:|Fwd?:|RE:|FW:)\s*/i, '').trim();
                                console.log('🔥 Zimbra - Sujet depuis titre:', subject);
                            }
                        }
                        
                        // Si toujours pas de sujet, chercher dans le contenu de la page
                        if (!subject) {
                            // Chercher des patterns de sujet dans le contenu
                            const subjectPatterns = [
                                /Objet\s*:\s*(.+)/i,
                                /Subject\s*:\s*(.+)/i,
                                /Sujet\s*:\s*(.+)/i
                            ];
                            
                            for (const pattern of subjectPatterns) {
                                const match = allPageContent.match(pattern);
                                if (match && match[1]) {
                                    subject = match[1].trim().split('\n')[0]; // Prendre la première ligne
                                    console.log('🔥 Zimbra - Sujet trouvé dans le contenu:', subject);
                                    break;
                                }
                            }
                        }
                        
                        // 🔥 EXTRACTION ULTRA-AGGRESSIVE DU CONTENU
                        const contentSelectors = [
                            '.MsgBody',
                            '.ZmMailMsgView .MsgBody',
                            '.MsgBody-html',
                            '.MsgBody-text', 
                            '.ConvListItem .Fragment',
                            '.ZhACD',
                            '.MsgBody-original',
                            'iframe[name="iframeBody"]',
                            '.zcs-body',
                            '[id*="msgbody"]',
                            '.msg-body',
                            '.ZmMailMsgView div[id*="body"]',
                            '.ZmMailMsgView .ZmMsgBody',
                            '.ZmMsgBody',
                            '.MsgHeaderTable',
                            '.ZmMailMsgView',
                            '[id*="MSG"]'
                        ];
                        
                        // Essayer d'extraire du contenu depuis tous les sélecteurs
                        for (const selector of contentSelectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const element of elements) {
                                if (element) {
                                    let elementContent = '';
                                    
                                    // Pour les iframes - essayer de récupérer l'URL au moins
                                    if (element.tagName === 'IFRAME') {
                                        const iframeSrc = element.src || element.getAttribute('src') || '';
                                        const iframeTitle = element.title || element.getAttribute('title') || '';
                                        elementContent = `[IFRAME: ${iframeTitle} - ${iframeSrc}]`;
                                        console.log('🔥 Zimbra - Iframe détectée:', elementContent);
                                    } else {
                                        // Récupérer le HTML ET le texte
                                        const htmlContent = element.innerHTML?.trim() || '';
                                        const textContent = element.textContent?.trim() || '';
                                        
                                        // Prioriser le contenu le plus riche
                                        elementContent = htmlContent.length > textContent.length ? htmlContent : textContent;
                                    }
                                    
                                    if (elementContent && elementContent.length > 10) {
                                        content = elementContent;
                                        console.log('🔥 Zimbra - Contenu trouvé avec:', selector, content.substring(0, 200));
                                        break;
                                    }
                                }
                            }
                            if (content) break;
                        }
                        
                        // 🔥 FALLBACK ULTRA-AGRESSIF - PRENDRE TOUT LE CONTENU VISIBLE
                        if (!content || content.length < 50) {
                            console.log('🔥 Zimbra - FALLBACK ULTRA-AGRESSIF: extraction de TOUT');
                            
                            // Prendre TOUT le contenu de la page
                            const bodyHTML = document.body.innerHTML || '';
                            const bodyText = document.body.textContent || document.body.innerText || '';
                            
                            // Essayer de nettoyer intelligemment
                            if (bodyText.length > 100) {
                                // Filtrer le contenu pour garder ce qui semble être du contenu d'email
                                const lines = bodyText.split('\n').filter(line => {
                                    const trimmed = line.trim();
                                    return trimmed.length > 15 && 
                                           !trimmed.includes('Zimbra') &&
                                           !trimmed.includes('Loading') &&
                                           !trimmed.includes('Copyright') &&
                                           !trimmed.includes('Navigation') &&
                                           !trimmed.includes('Menu') &&
                                           !trimmed.includes('javascript:') &&
                                           trimmed.includes(' '); // Au moins un espace (phrase complète)
                                });
                                
                                if (lines.length > 0) {
                                    // Prendre jusqu'à 20 lignes significatives
                                    content = lines.slice(0, 20).join('\n').trim();
                                    console.log('🔥 Zimbra - Contenu filtré depuis body:', content.substring(0, 300));
                                } else {
                                    // Dernier recours - prendre le HTML brut
                                    content = bodyHTML.substring(0, 3000);
                                    console.log('🔥 Zimbra - Contenu HTML brut:', content.substring(0, 300));
                                }
                            } else {
                                content = `[Contenu Zimbra détecté] - URL: ${window.location.href}`;
                            }
                        }
                        
                        // 🔥 EXTRACTION ULTRA-AGGRESSIVE DE L'EXPÉDITEUR
                        const fromSelectors = [
                            '.MsgHdrFrom',
                            '.ZhCalListViewTable .From',
                            '.ConvListItem .From',
                            '[id*="from"]',
                            '.from',
                            '.sender',
                            '.MsgHdrName',
                            '[aria-label*="From"]',
                            '[title*="From"]',
                            '.ZmMailMsgView .From',
                            '.MsgHeaderTable .From',
                            '.MsgHdr .From'
                        ];
                        
                        // Essayer tous les sélecteurs d'expéditeur
                        for (const selector of fromSelectors) {
                            const elements = document.querySelectorAll(selector);
                            for (const element of elements) {
                                if (element) {
                                    const textContent = element.textContent?.trim() || '';
                                    const emailMatch = textContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                                    if (emailMatch) {
                                        from = emailMatch[0];
                                        console.log('🔥 Zimbra - Email extrait:', selector, from);
                                        break;
                                    } else if (textContent.includes('@')) {
                                        from = textContent;
                                        console.log('🔥 Zimbra - Contenu avec @ trouvé:', selector, from);
                                        break;
                                    }
                                }
                            }
                            if (from) break;
                        }
                        
                        // Fallback: chercher un email dans tout le contenu
                        if (!from) {
                            const emailInContent = allPageContent.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                            if (emailInContent) {
                                from = emailInContent[0];
                                console.log('🔥 Zimbra - Email trouvé dans le contenu global:', from);
                            }
                        }
                        
                        // Fallback final pour l'expéditeur
                        if (!from) {
                            from = 'expediteur.zimbra@unknown.com';
                        }
                        
                        // Fallback final pour le sujet si toujours vide
                        if (!subject) {
                            subject = 'Email Zimbra à analyser';
                        }
                        
                        console.log('🔥 Zimbra - Résultat extraction ULTRA-AGRESSIVE:', { 
                            subject: subject.substring(0, 100), 
                            content: content.substring(0, 200), 
                            from,
                            contentLength: content.length,
                            pageContentLength: allPageContent.length
                        });
                        
                        return { 
                            subject: subject || 'Email Zimbra', 
                            content: content || allPageContent.substring(0, 2000), // Fallback sur tout le contenu
                            from: from || 'zimbra@uphf.fr', 
                            provider: 'zimbra',
                            extractionType: 'ultra-aggressive-forced',
                            warning: 'Extraction ultra-agressive de tout le contenu disponible'
                        };
                    }
                });
            } else {
                throw new Error(`Provider ${provider} non supporté`);
            }
            
            const emailData = results[0].result;
            console.log('🔥 Données email extraites (ULTRA-FORCÉ):', emailData);
            
            // TOUJOURS retourner quelque chose
            if (!emailData) {
                console.log('🔥 FALLBACK FINAL - créer des données minimales');
                return {
                    subject: 'Email à analyser (extraction forcée)',
                    content: 'Contenu email extrait de force pour analyse de sécurité',
                    from: 'expediteur@forceextraction.com',
                    provider: 'forced-fallback',
                    extractionType: 'forced-minimal'
                };
            }
            
            return emailData;
            
        } catch (error) {
            console.error('🔥 Erreur lors de l\'extraction ULTRA-FORCÉE:', error);
            // TOUJOURS retourner quelque chose pour permettre l'analyse
            return {
                subject: 'Email en cours d\'analyse (récupération d\'erreur)',
                content: `Analyse de sécurité en cours... Erreur: ${error.message}`,
                from: 'expediteur@recovery.com',
                provider: 'error-recovery',
                extractionType: 'error-recovery-forced',
                warning: `Extraction en mode de récupération forcée: ${error.message}`
            };
        }
    }

    async callEmailAnalysisAPI(emailData) {
        try {
            console.log('Appel API /chat/mail avec:', emailData);
            
            // NOUVEAU : Traitement spécial pour Zimbra avec extraction complète
            if (emailData.extractionType === 'full-text-view') {
                console.log('Utilisation des données complètes Zimbra pour analyse phishing');
                
                // Pour Zimbra vue texte complète, envoyer TOUT le contenu (headers + corps)
                const emailContent = emailData.content; // Contenu complet avec headers
                
                // S'assurer que le sender est correct (Return-Path ou From)
                let senderEmail = emailData.from || 'Expéditeur inconnu';
                
                // Si c'est déjà une adresse email valide, la garder
                if (senderEmail.includes('@')) {
                    // Nettoyer si nécessaire
                    const emailMatch = senderEmail.match(/[\w\.-]+@[\w\.-]+\.\w+/);
                    if (emailMatch) {
                        senderEmail = emailMatch[0];
                    }
                } else {
                    senderEmail = 'unknown@sender.com';
                }
                
                console.log('Sender email final (Zimbra complet):', senderEmail);
                console.log('Contenu email (premiers 500 chars):', emailContent.substring(0, 500));
                
                // Envoyer les données complètes
                const result = await this.makeAPIRequest('/chat/mail', {
                    sender: senderEmail,
                    body: emailContent // Headers complets + contenu
                });
                
                return result;
            }
            
            // EXISTANT : Pour les autres providers ou extraction limitée
            // Préparer uniquement le contenu du mail pour le body
            const emailContent = `${emailData.subject}\n\n${emailData.content}`.substring(0, 8000);
            
            // S'assurer que le sender est une adresse email valide
            let senderEmail = emailData.from || 'Expéditeur inconnu';
            
            // Extraire l'email si c'est un format "Nom <email@domain.com>"
            const emailMatch = senderEmail.match(/[\w\.-]+@[\w\.-]+\.\w+/);
            if (emailMatch) {
                senderEmail = emailMatch[0];
            } else if (!senderEmail.includes('@')) {
                senderEmail = 'unknown@sender.com';
            }
            
            console.log('Sender email final (standard):', senderEmail);
            
            // Utiliser le format correct pour l'API /chat/mail selon la documentation
            const result = await this.makeAPIRequest('/chat/mail', {
                sender: senderEmail,
                body: emailContent
            });
            
            return result;
        } catch (error) {
            console.error('Erreur API /chat/mail:', error);
            return {
                error: `API non disponible: ${error.message}`,
                response: null
            };
        }
    }

    showEmailResult(response, riskScore, url, provider = null, subject = null, title = null) {
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
                mainContent.classList.add('with-analysis');
            }
        }
        
        // Agrandir la popup
        this.expandPopupSafely();
        
        // Déterminer la couleur et le statut selon le score de risque
        let riskColor = '#4ade80'; // Vert par défaut
        let riskStatus = 'Email sûr';
        let riskIcon = '✅';
        
        if (riskScore !== null) {
            const score = parseInt(riskScore);
            if (score >= 70) {
                riskColor = '#ef4444';
                riskStatus = 'Risque élevé - Phishing probable';
                riskIcon = '🚨';
            } else if (score >= 40) {
                riskColor = '#f59e0b';
                riskStatus = 'Risque modéré - Prudence requise';
                riskIcon = '⚠️';
            } else if (score >= 20) {
                riskColor = '#fbbf24';
                riskStatus = 'Risque faible - Vérifiez les détails';
                riskIcon = '⚡';
            }
        }
        
        // Extraire le provider et sujet pour l'affichage
        let displayInfo = 'Email analysé';
        if (provider && subject) {
            displayInfo = `${provider.toUpperCase()} - ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`;
        } else if (provider) {
            displayInfo = `${provider.toUpperCase()} - Email`;
        }
        
        resultSection.innerHTML = `
            <div class="analysis-header">
                <div class="analysis-domain">
                    <h3>📧 Analyse email - Phishing</h3>
                    <p class="domain-name">${displayInfo}</p>
                </div>
                <button class="close-analysis-btn" id="close-analysis">×</button>
            </div>
            
            ${riskScore !== null ? `
            <div class="analysis-score">
                <div class="score-circle" style="border-color: ${riskColor};">
                    <span class="score-number" style="color: ${riskColor};">${riskScore}</span>
                    <span class="score-total">/100</span>
                </div>
                <div class="score-status" style="color: ${riskColor};">
                    ${riskIcon} ${riskStatus}
                </div>
            </div>
            ` : ''}
            
            <div class="analysis-content">
                <h4>🛡️ Rapport d'analyse de sécurité</h4>
                <div class="analysis-text">${this.formatAnalysisText(response)}</div>
            </div>
            
            <div class="analysis-actions">
                <button class="action-btn secondary" id="copy-analysis">
                    📋 Copier le rapport
                </button>
                <button class="action-btn primary" id="new-email-analysis">
                    🔄 Nouvelle analyse
                </button>
            </div>
        `;
        
        resultSection.classList.remove('hidden');
        resultSection.classList.add('visible');
        
        // Attacher les event listeners
        const closeBtn = document.getElementById('close-analysis');
        const copyBtn = document.getElementById('copy-analysis');
        const newAnalysisBtn = document.getElementById('new-email-analysis');
        
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
                this.checkEmail();
            });
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
    }    formatAnalysisText(text) {
        // Convertir le texte brut en HTML formaté avec optimisation pour espace restreint
        let formatted = text
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>')
            // MODIFICATION: Supprimer les puces en les convertissant en paragraphes simples
            .replace(/- (.+?)(<br>|<\/p>)/g, '<p>$1</p>')
            // Ne plus créer de listes - la ligne suivante est commentée
            // .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
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
    }    createAccount() {
        this.setStatus("Redirection...", "loading");
        chrome.tabs.create({ url: "https://robertai.fr/login" });
        setTimeout(() => window.close(), 500);
    }    openHelp() {
        this.setStatus("Ouverture à propos...", "loading");
        chrome.tabs.create({ url: "https://robertai.fr/about" });
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
    }    // Adapter les API Mock Functions pour le mode test
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

    // Adapter les API Mock Functions pour le mode test  
    async callSummaryAPI(data) {
        try {
            // Convertir l'ancien format avec limitation de taille
            const prompt = `Résume cette page web:

Titre: ${data.title}

Contenu:
`;
            const maxContentLength = 8000 - prompt.length;
            const truncatedContent = data.content.substring(0, maxContentLength);
            
            const pageResumeData = {
                url: data.url,
                body: prompt + truncatedContent
            };
            
            return await this.callPageResumeAPI(pageResumeData);
        } catch (error) {
            return {
                error: `API non disponible: ${error.message}`,
                response: null
            };
        }
    }

    // Méthode utilitaire pour forcer un nettoyage complet (debug)
    async clearAllData() {
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
    }    // Méthode pour notifier les content scripts du changement d'état d'authentification
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
