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
    
    // Répondre immédiatement pour éviter les timeouts
    sendResponse({ received: true });
    
    return true;
});

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
