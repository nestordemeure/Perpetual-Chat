// UI module for DOM rendering and event handling

// DOM elements (will be set in initializeUI)
let elements = {};

function initializeUI() {
    elements = {
        // Landing view
        apiKeyInput: document.getElementById('apiKey'),
        systemPromptInput: document.getElementById('systemPrompt'),
        startChatBtn: document.getElementById('startChat'),
        loadFromFileBtn: document.getElementById('loadFromFile'),
        fileInput: document.getElementById('fileInput'),
        
        // Chat view
        messagesPanel: document.getElementById('messagesPanel'),
        typingIndicator: document.getElementById('typingIndicator'),
        errorBanner: document.getElementById('errorBanner'),
        composer: document.getElementById('composer'),
        sendButton: document.getElementById('sendButton'),
        newChatBtn: document.getElementById('newChat')
    };
    
    setupEventListeners();
    setupMobileKeyboardHandling();
}

function setupEventListeners() {
    // Landing view events
    elements.startChatBtn.addEventListener('click', handleStartChat);
    elements.loadFromFileBtn.addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', handleFileLoad);
    
    // Chat view events
    elements.sendButton.addEventListener('click', handleSendMessage);
    elements.newChatBtn.addEventListener('click', handleNewChat);
    
    // Composer events
    elements.composer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Auto-resize composer
    elements.composer.addEventListener('input', () => {
        elements.composer.style.height = 'auto';
        elements.composer.style.height = elements.composer.scrollHeight + 'px';
    });
}

function handleStartChat() {
    const apiKey = elements.apiKeyInput.value.trim();
    const systemPrompt = elements.systemPromptInput.value.trim();
    
    if (!apiKey) {
        showError('API key is required');
        return;
    }
    
    // Create new state
    const state = {
        apiKey: apiKey,
        systemPrompt: systemPrompt,
        messages: [],
        lastSaveTimestamp: Date.now()
    };
    
    window.ChatModule.updateAppState(state);
    window.StorageModule.saveState(state);
    
    switchToView('chat');
    renderMessages([]);
    focusComposer();
}

async function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const importedState = await window.StorageModule.importStateFromFile(file);
        
        // Update inputs with imported data
        elements.apiKeyInput.value = importedState.apiKey;
        elements.systemPromptInput.value = importedState.systemPrompt;
        
        // Update app state
        window.ChatModule.updateAppState(importedState);
        window.StorageModule.saveState(importedState);
        
        // Switch to chat view and render messages
        switchToView('chat');
        renderMessages(importedState.messages);
        scrollToBottom();
        focusComposer();
        
    } catch (error) {
        showError('Failed to load file: ' + error.message);
    }
    
    // Reset file input
    e.target.value = '';
}

function handleSendMessage() {
    if (window.ChatModule.isCurrentlyStreaming()) {
        return;
    }
    
    const text = elements.composer.value.trim();
    if (!text) return;
    
    elements.composer.value = '';
    elements.composer.style.height = 'auto';
    
    window.ChatModule.sendMessage(text);
}

function handleNewChat() {
    const currentState = window.ChatModule.getAppState();
    
    // Keep API key and system prompt, reset messages
    const newState = {
        apiKey: currentState.apiKey,
        systemPrompt: currentState.systemPrompt,
        messages: [],
        lastSaveTimestamp: Date.now()
    };
    
    window.ChatModule.updateAppState(newState);
    window.StorageModule.saveState(newState);
    
    // Prefill landing form
    elements.apiKeyInput.value = currentState.apiKey;
    elements.systemPromptInput.value = currentState.systemPrompt;
    
    switchToView('landing');
    hideError();
}

function switchToView(viewName) {
    document.body.setAttribute('data-view', viewName);
}

function renderMessages(messages) {
    elements.messagesPanel.innerHTML = '';
    
    messages.forEach(message => {
        const messageEl = createMessageElement(message);
        elements.messagesPanel.appendChild(messageEl);
    });
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = message.content;
    
    messageDiv.appendChild(contentDiv);
    return messageDiv;
}

function appendAssistantToken(token) {
    const messages = elements.messagesPanel.children;
    if (messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage.classList.contains('assistant')) return;
    
    const contentDiv = lastMessage.querySelector('.message-content');
    if (contentDiv) {
        contentDiv.textContent += token;
    }
}

function showTyping() {
    elements.typingIndicator.style.display = 'flex';
}

function hideTyping() {
    elements.typingIndicator.style.display = 'none';
}

function scrollToBottom() {
    elements.messagesPanel.scrollTop = elements.messagesPanel.scrollHeight;
}

function showError(message) {
    elements.errorBanner.textContent = message;
    elements.errorBanner.style.display = 'block';
}

function hideError() {
    elements.errorBanner.style.display = 'none';
}

function focusComposer() {
    elements.composer.focus();
}

function prefillLandingForm(state) {
    elements.apiKeyInput.value = state.apiKey || '';
    elements.systemPromptInput.value = state.systemPrompt || '';
}

function setupMobileKeyboardHandling() {
    // Handle mobile keyboard appearance/disappearance
    if ('visualViewport' in window) {
        // Modern approach using Visual Viewport API
        window.visualViewport.addEventListener('resize', () => {
            const viewport = window.visualViewport;
            const isKeyboardOpen = viewport.height < window.innerHeight * 0.75;
            
            if (isKeyboardOpen) {
                // Keyboard is open - ensure composer is visible
                setTimeout(() => {
                    elements.composer.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'end' 
                    });
                }, 150);
            }
        });
    } else {
        // Fallback for older browsers
        let initialViewportHeight = window.innerHeight;
        
        window.addEventListener('resize', () => {
            const currentHeight = window.innerHeight;
            const heightDifference = initialViewportHeight - currentHeight;
            
            // If height decreased significantly (keyboard appeared)
            if (heightDifference > 150) {
                setTimeout(() => {
                    elements.composer.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'end' 
                    });
                }, 150);
            }
        });
    }
    
    // Handle focus events on composer
    elements.composer.addEventListener('focus', () => {
        // Small delay to ensure keyboard is fully open
        setTimeout(() => {
            elements.composer.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end' 
            });
        }, 300);
    });
}

// Export to global scope
window.UiModule = {
    initializeUI,
    renderMessages,
    appendAssistantToken,
    showTyping,
    hideTyping,
    scrollToBottom,
    showError,
    hideError,
    switchToView,
    focusComposer,
    prefillLandingForm
};