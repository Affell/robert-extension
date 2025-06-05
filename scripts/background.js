// Service Worker pour l'extension Robert IA
console.log('Background script Robert IA démarré');

// Gérer l'installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension Robert IA installée:', details.reason);
    
    if (details.reason === 'install') {
        console.log('Première installation de l\'extension');
    } else if (details.reason === 'update') {
        console.log('Extension mise à jour');
        // Recharger tous les content scripts après une mise à jour
        reloadAllContentScripts();
    }
});

// Recharger les content scripts dans tous les onglets
async function reloadAllContentScripts() {
    try {
        const tabs = await chrome.tabs.query({});
        
        for (const tab of tabs) {
            if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['scripts/content.js']
                    });
                    console.log(`Content script rechargé pour l'onglet ${tab.id}`);
                } catch (error) {
                    console.log(`Impossible de recharger le content script pour l'onglet ${tab.id}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du rechargement des content scripts:', error);
    }
}

// Gérer les messages depuis les content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message reçu dans background:', request);
    
    if (request.action === 'openPopup') {
        console.log('Tentative d\'ouverture du popup...');
        try {
            // Utiliser chrome.action.openPopup() pour ouvrir l'extension
            chrome.action.openPopup();
            console.log('Popup ouvert via chrome.action.openPopup()');
            sendResponse({ success: true });
        } catch (error) {
            console.warn('Impossible d\'ouvrir le popup via action:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    }
    
    // Répondre immédiatement pour les autres messages
    sendResponse({ received: true });
    return true;
});

// Fonction pour gérer les requêtes API via le service worker
async function handleApiRequest(requestData) {
    const { endpoint, options, authToken } = requestData;
    const apiBaseUrl = 'http://localhost:5000';
    
    console.log('Requête API via background:', endpoint);
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Robert-Connect-Token': authToken,
            ...options.headers
        };

        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            throw new Error('Session expirée');
        }

        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            throw new Error('Réponse inattendue du serveur');
        }
        
        if (!response.ok) {
            throw new Error(data.message || data.error || `Erreur HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Connexion impossible à l\'API. Vérifiez que Docker est démarré.');
        }
        throw error;
    }
}

// Gérer les erreurs de startup
chrome.runtime.onStartup.addListener(() => {
    console.log('Extension Robert IA démarrée');
});

// Détecter les suspensions du service worker
self.addEventListener('activate', event => {
    console.log('Service Worker activé');
});

self.addEventListener('install', event => {
    console.log('Service Worker installé');
});
