// Service Worker pour l'extension Robert IA
console.log('Background script Robert IA démarré');

// Gérer l'installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension Robert IA installée:', details);
    
    if (details.reason === 'install') {
        // Première installation
        console.log('Première installation de Robert IA');
    } else if (details.reason === 'update') {
        // Mise à jour
        console.log('Mise à jour de Robert IA');
    }
});

// Gérer les messages des content scripts ou popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message reçu dans background:', request);
    
    switch (request.action) {
        case 'logAnalytics':
            console.log('Analytics:', request.data);
            sendResponse({ success: true });
            break;
        default:
            console.log('Action non reconnue:', request.action);
            sendResponse({ success: false });
    }
});

// Gérer les changements d'onglets
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('Onglet activé:', activeInfo.tabId);
});

// Gérer les mises à jour d'URL
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Page chargée:', tab.url);
    }
});
