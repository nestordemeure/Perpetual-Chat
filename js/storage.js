// Storage module for localStorage persistence and export/import

const STORAGE_KEY = 'perpetual-chat-state';

// AppState structure:
// {
//   apiKey: string,
//   systemPrompt: string,
//   messages: Array<{role: 'user'|'assistant'|'system', content: string}>,
//   lastSaveTimestamp: number
// }

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return {
                apiKey: '',
                systemPrompt: '',
                messages: [],
                lastSaveTimestamp: 0
            };
        }
        return JSON.parse(stored);
    } catch (error) {
        console.error('Error loading state:', error);
        return {
            apiKey: '',
            systemPrompt: '',
            messages: [],
            lastSaveTimestamp: 0
        };
    }
}

function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

function shouldTriggerPeriodicSave(now, hours, lastSave) {
    const hoursInMs = hours * 60 * 60 * 1000;
    return (now - lastSave) >= hoursInMs;
}

function markSavedNow(state) {
    state.lastSaveTimestamp = Date.now();
    saveState(state);
}

function exportStateToDownload(state) {
    const exportData = {
        meta: {
            model: window.__PARAMS__?.model || 'gpt-4o',
            createdAt: new Date().toISOString(),
            systemPrompt: state.systemPrompt
        },
        apiKey: state.apiKey,
        messages: state.messages
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'perpetual_chat_backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importStateFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate the imported data structure
                if (!data.apiKey || !Array.isArray(data.messages)) {
                    throw new Error('Invalid file format');
                }
                
                const importedState = {
                    apiKey: data.apiKey,
                    systemPrompt: data.meta?.systemPrompt || '',
                    messages: data.messages,
                    lastSaveTimestamp: Date.now()
                };
                
                resolve(importedState);
            } catch (error) {
                reject(new Error('Failed to parse file: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
    });
}

// Export functions to global scope
window.StorageModule = {
    loadState,
    saveState,
    shouldTriggerPeriodicSave,
    markSavedNow,
    exportStateToDownload,
    importStateFromFile
};