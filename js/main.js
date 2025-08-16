// Main module for app bootstrap and routing

async function loadParameters() {
    try {
        const response = await fetch('parameters.json');
        if (!response.ok) {
            throw new Error('Failed to load parameters.json');
        }
        const params = await response.json();
        window.__PARAMS__ = params;
        return params;
    } catch (error) {
        console.error('Error loading parameters:', error);
        // Use defaults if parameters.json fails to load
        window.__PARAMS__ = {
            model: 'gpt-4o',
            maxMessagesForAPI: 50,
            dailySavePeriodHours: 24
        };
        return window.__PARAMS__;
    }
}

async function initializeApp() {
    try {
        // Load parameters first
        await loadParameters();
        
        // Initialize UI
        window.UiModule.initializeUI();
        
        // Load state from localStorage
        const state = window.StorageModule.loadState();
        
        // Initialize chat module with state
        window.ChatModule.initializeChat(state);
        
        // Determine which view to show
        if (state.messages && state.messages.length > 0) {
            // We have existing messages, go to chat view
            window.UiModule.switchToView('chat');
            window.UiModule.renderMessages(state.messages);
            window.UiModule.scrollToBottom();
            window.UiModule.focusComposer();
        } else {
            // No messages, show landing view
            window.UiModule.switchToView('landing');
            window.UiModule.prefillLandingForm(state);
        }
        
        // Hide any initial error state
        window.UiModule.hideError();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        // Show landing view as fallback
        window.UiModule.switchToView('landing');
        window.UiModule.showError('Failed to initialize app: ' + error.message);
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}