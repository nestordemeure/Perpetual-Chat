// Chat module for message handling and truncation

let appState = null;
let isStreaming = false;

function initializeChat(state) {
    appState = state;
}

function buildPayloadMessages() {
    const maxMessages = window.__PARAMS__?.maxMessagesForAPI || 50;
    const messages = [];
    
    // 1. Include system prompt if provided
    if (appState.systemPrompt.trim()) {
        messages.push({
            role: 'system',
            content: appState.systemPrompt.trim()
        });
    }
    
    // 2. Get non-system messages
    const nonSystemMessages = appState.messages.filter(msg => msg.role !== 'system');
    
    // 3. If we have fewer messages than the limit, return all
    if (nonSystemMessages.length <= maxMessages) {
        return messages.concat(nonSystemMessages);
    }
    
    // 4. Slice to last N messages
    const slicedMessages = nonSystemMessages.slice(-maxMessages);
    
    // 5. Ensure first message in slice is assistant
    let startIndex = 0;
    while (startIndex < slicedMessages.length && slicedMessages[startIndex].role !== 'assistant') {
        startIndex++;
    }
    
    // If no assistant message found, just use the slice as-is
    if (startIndex >= slicedMessages.length) {
        return messages.concat(slicedMessages);
    }
    
    // 6. Insert truncation notice before the first assistant message
    const truncationNotice = {
        role: 'user',
        content: '[Conversation truncated]'
    };
    
    const finalMessages = messages.concat([
        truncationNotice,
        ...slicedMessages.slice(startIndex)
    ]);
    
    return finalMessages;
}

async function sendMessage(text) {
    if (isStreaming || !text.trim()) {
        return;
    }
    
    const trimmedText = text.trim();
    
    // Add user message to state
    const userMessage = {
        role: 'user',
        content: trimmedText
    };
    
    appState.messages.push(userMessage);
    window.StorageModule.saveState(appState);
    
    // Update UI
    window.UiModule.renderMessages(appState.messages);
    window.UiModule.scrollToBottom();
    
    // Check for periodic save
    const now = Date.now();
    const savePeriodHours = window.__PARAMS__?.dailySavePeriodHours || 24;
    
    if (window.StorageModule.shouldTriggerPeriodicSave(now, savePeriodHours, appState.lastSaveTimestamp)) {
        window.StorageModule.exportStateToDownload(appState);
        window.StorageModule.markSavedNow(appState);
    }
    
    // Prepare API payload
    const payloadMessages = buildPayloadMessages();
    
    // Add placeholder assistant message
    const assistantMessage = {
        role: 'assistant',
        content: ''
    };
    
    appState.messages.push(assistantMessage);
    window.UiModule.renderMessages(appState.messages);
    window.UiModule.scrollToBottom();
    
    // Start streaming
    isStreaming = true;
    window.UiModule.showTyping();
    window.UiModule.hideError();
    
    try {
        await window.ApiModule.streamChatCompletion({
            apiKey: appState.apiKey,
            model: window.__PARAMS__?.model || 'gpt-4o',
            messages: payloadMessages,
            onDelta: (token) => {
                // Append token to the last message (assistant)
                const lastMessage = appState.messages[appState.messages.length - 1];
                lastMessage.content += token;
                
                window.UiModule.appendAssistantToken(token);
                window.UiModule.scrollToBottom();
            },
            onDone: () => {
                isStreaming = false;
                window.UiModule.hideTyping();
                window.StorageModule.saveState(appState);
            },
            onError: (error) => {
                isStreaming = false;
                window.UiModule.hideTyping();
                window.UiModule.showError(error);
                
                // Remove the placeholder assistant message on error
                if (appState.messages.length > 0 && 
                    appState.messages[appState.messages.length - 1].role === 'assistant' &&
                    appState.messages[appState.messages.length - 1].content === '') {
                    appState.messages.pop();
                    window.UiModule.renderMessages(appState.messages);
                }
                
                window.StorageModule.saveState(appState);
            }
        });
    } catch (error) {
        isStreaming = false;
        window.UiModule.hideTyping();
        window.UiModule.showError('Failed to send message: ' + error.message);
        
        // Remove the placeholder assistant message on error
        if (appState.messages.length > 0 && 
            appState.messages[appState.messages.length - 1].role === 'assistant' &&
            appState.messages[appState.messages.length - 1].content === '') {
            appState.messages.pop();
            window.UiModule.renderMessages(appState.messages);
        }
        
        window.StorageModule.saveState(appState);
    }
}

function getAppState() {
    return appState;
}

function updateAppState(newState) {
    appState = newState;
}

function isCurrentlyStreaming() {
    return isStreaming;
}

// Export to global scope
window.ChatModule = {
    initializeChat,
    buildPayloadMessages,
    sendMessage,
    getAppState,
    updateAppState,
    isCurrentlyStreaming
};