// API module for OpenAI streaming chat completions

async function streamChatCompletion({ apiKey, model, messages, onDelta, onDone, onError }) {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep the incomplete line in buffer

            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (trimmedLine === '') {
                    continue;
                }
                
                if (trimmedLine === 'data: [DONE]') {
                    onDone();
                    return;
                }
                
                if (trimmedLine.startsWith('data: ')) {
                    try {
                        const jsonData = trimmedLine.slice(6); // Remove 'data: ' prefix
                        const parsed = JSON.parse(jsonData);
                        
                        if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                onDelta(delta.content);
                            }
                        }
                    } catch (parseError) {
                        console.warn('Failed to parse SSE data:', parseError, trimmedLine);
                    }
                }
            }
        }

        // If we reach here without seeing [DONE], call onDone anyway
        onDone();

    } catch (error) {
        console.error('Stream error:', error);
        onError(error.message || 'Failed to connect to OpenAI API');
    }
}

// Export to global scope
window.ApiModule = {
    streamChatCompletion
};