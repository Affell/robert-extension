class RobertPopup {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.updateStatus();
        this.loadUserInfo();
    }

    initializeElements() {
        this.chatBtn = document.getElementById("chat-btn");
        this.verifyBtn = document.getElementById("verify-btn");
        this.summarizeBtn = document.getElementById("summarize-btn");
        this.emailBtn = document.getElementById("email-btn");
        this.statusElement = document.getElementById("status");
        
        // Éléments du compte
        this.accountBtn = document.getElementById("account-btn");
        this.accountSection = document.getElementById("account-section");
        this.backBtn = document.getElementById("back-btn");
        this.loginBtn = document.getElementById("login-btn");
        this.historyBtn = document.getElementById("history-btn");
        this.helpBtn = document.getElementById("help-btn");
        
        this.mainContent = document.querySelector(".popup-content");
    }

    attachEventListeners() {
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
        
        // Événements du compte
        if (this.accountBtn) {
            this.accountBtn.addEventListener("click", () => this.showAccountSection());
        }
        if (this.backBtn) {
            this.backBtn.addEventListener("click", () => this.hideAccountSection());
        }
        if (this.loginBtn) {
            this.loginBtn.addEventListener("click", () => this.handleLogin());
        }
        if (this.historyBtn) {
            this.historyBtn.addEventListener("click", () => this.openHistory());
        }
        if (this.helpBtn) {
            this.helpBtn.addEventListener("click", () => this.openHelp());
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
            
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "showVerificationResult",
                    result: verificationResult
                });
            } catch (messageError) {
                this.setStatus(verificationResult.error || `Score: ${verificationResult.score}/100`, "success");
            }
            
            setTimeout(() => this.setStatus("Prêt à vous aider", "ready"), 3000);
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
            
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "showSummary",
                    summary: summary
                });
            } catch (messageError) {
                this.setStatus("Résumé créé (voir console)", "success");
                console.log("Résumé:", summary.summary);
            }
            
            setTimeout(() => this.setStatus("Prêt à vous aider", "ready"), 3000);
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
            } else {
                result = await this.callPhishingAPI(emailData);
            }
            
            try {
                await chrome.tabs.sendMessage(tab.id, {
                    action: "showEmailResult",
                    result: result
                });
            } catch (messageError) {
                this.setStatus(result.message || "Email vérifié", "success");
            }
            
            setTimeout(() => this.setStatus("Prêt à vous aider", "ready"), 3000);
        } catch (error) {
            this.setStatus("Erreur vérification email", "error");
            console.error("Erreur:", error);
        }
    }

    // API Mock Functions
    async callVerificationAPI(data) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return {
            isTrustworthy: Math.random() > 0.3,
            score: Math.floor(Math.random() * 100),
            reasons: ["Certificat SSL valide", "Domaine connu", "Pas de contenu suspect"],
            error: "Problème API"
        };
    }

    async callSummaryAPI(data) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            summary: `Résumé de "${data.title}": Cette page contient environ ${data.content.length} caractères de contenu. Le sujet principal semble être...`,
            keyPoints: ["Point clé 1", "Point clé 2", "Point clé 3"],
            error: "Problème API"
        };
    }

    async callPhishingAPI(emailData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isDangerous = Math.random() > 0.7;
        
        return {
            isEmail: true,
            provider: emailData.provider,
            subject: emailData.subject,
            isDangerous: isDangerous,
            message: isDangerous 
                ? `⚠️ Le mail "${emailData.subject}" (${emailData.provider}) semble dangereux`
                : `✅ Le mail "${emailData.subject}" (${emailData.provider}) ne semble pas dangereux`,
            confidence: Math.floor(Math.random() * 100),
            error: "Problème API"
        };
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
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const hostname = new URL(tab.url).hostname;
            
            const shortHostname = hostname.length > 15 ? hostname.substring(0, 15) + '...' : hostname;
            this.setStatus(`${shortHostname}`, "ready");
        } catch (error) {
            this.setStatus("Déconnecté", "error");
        }
    }

    showAccountSection() {
        if (this.accountSection && this.mainContent) {
            this.accountSection.style.display = "flex";
            this.mainContent.style.display = "none";
            console.log("Section compte affichée");
        } else {
            console.error("Éléments de compte non trouvés");
        }
    }

    hideAccountSection() {
        if (this.accountSection && this.mainContent) {
            this.accountSection.style.display = "none";
            this.mainContent.style.display = "flex";
            console.log("Section compte masquée");
        }
    }

    async loadUserInfo() {
        try {
            const result = await chrome.storage.local.get(['userInfo', 'isLoggedIn']);
            const userNameEl = document.getElementById('user-name');
            const userEmailEl = document.getElementById('user-email');
            const loginBtn = document.getElementById('login-btn');
            
            if (result.isLoggedIn && result.userInfo) {
                if (userNameEl) userNameEl.textContent = result.userInfo.name || 'Utilisateur';
                if (userEmailEl) userEmailEl.textContent = result.userInfo.email || 'Non connecté';
                
                if (loginBtn) {
                    const titleEl = loginBtn.querySelector('h4');
                    const descEl = loginBtn.querySelector('p');
                    if (titleEl) titleEl.textContent = 'Se déconnecter';
                    if (descEl) descEl.textContent = 'Déconnexion de Robert IA';
                    loginBtn.classList.remove('primary');
                    loginBtn.classList.add('logout');
                }
            } else {
                if (userNameEl) userNameEl.textContent = 'Non connecté';
                if (userEmailEl) userEmailEl.textContent = 'Connectez-vous pour accéder à vos données';
                
                if (loginBtn) {
                    const titleEl = loginBtn.querySelector('h4');
                    const descEl = loginBtn.querySelector('p');
                    if (titleEl) titleEl.textContent = 'Se connecter';
                    if (descEl) descEl.textContent = 'Connectez-vous à Robert IA';
                    loginBtn.classList.add('primary');
                    loginBtn.classList.remove('logout');
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des infos utilisateur:', error);
        }
    }

    async handleLogin() {
        try {
            const result = await chrome.storage.local.get(['isLoggedIn']);
            
            if (result.isLoggedIn) {
                await chrome.storage.local.remove(['userInfo', 'isLoggedIn']);
                this.setStatus("Déconnecté de Robert IA", "success");
                await this.loadUserInfo();
                
                setTimeout(() => {
                    this.setStatus("Prêt à vous aider", "ready");
                }, 2000);
            } else {
                this.setStatus("Redirection vers Robert IA...", "loading");
                
                chrome.tabs.create({
                    url: 'https://ent.uphf.fr/'
                });
                
                setTimeout(() => {
                    window.close();
                }, 500);
            }
        } catch (error) {
            this.setStatus("Erreur de connexion", "error");
            console.error('Erreur de connexion:', error);
        }
    }

    openHistory() {
        this.setStatus("Chargement de l'historique...", "loading");
        setTimeout(() => {
            this.setStatus("Historique non disponible", "error");
        }, 1000);
    }

    openHelp() {
        this.setStatus("Ouverture de l'aide...", "loading");
        chrome.tabs.create({
            url: 'https://ent.uphf.fr/'
        });
        setTimeout(() => {
            this.setStatus("Prêt à vous aider", "ready");
        }, 1000);
    }
}

// Initialiser au chargement
document.addEventListener("DOMContentLoaded", () => {
    console.log('Popup Robert IA chargée');
    new RobertPopup();
});
