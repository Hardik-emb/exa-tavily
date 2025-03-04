'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingState from './LoadingState';
import { ChatMessage as ChatMessageType } from '@/lib/claude/toggle-client';

export default function ClaudeToggleInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);

  const handleSendMessage = async (content: string) => {
    setLoading(true);
    setError('');
    
    // Create a new user message
    const userMessage: ChatMessageType = {
      role: 'user',
      content,
      id: uuidv4()
    };
    
    // Add the user message to the chat
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    try {
      console.log(`Sending chat-toggle request with message: ${content}, web search ${webSearchEnabled ? 'enabled' : 'disabled'}`);
      
      const response = await fetch('/api/chat-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          maxTokens: 1024,
          webSearchEnabled: webSearchEnabled
        }),
      });

      const data = await response.json();
      console.log('Chat-Toggle API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Chat failed');
      }

      // Add the assistant's response to the chat
      const assistantMessage = data.data;
      assistantMessage.id = uuidv4();
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error('Chat-Toggle error:', err);
      setError(err instanceof Error ? err.message : 'Chat failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWebSearch = () => {
    setWebSearchEnabled(!webSearchEnabled);
  };

  return (
    <div className="chat-container">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Chat with Claude (Toggle Search)</h2>
        <p className="text-gray-600">
          Ask questions and toggle whether Claude should search the web for up-to-date information.
        </p>
        
        {/* Web Search Toggle Switch */}
        <div className="flex items-center mt-3">
          <span className="mr-3 text-sm font-medium text-gray-700">Web Search</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={webSearchEnabled}
              onChange={toggleWebSearch}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
          <span className="ml-3 text-sm font-medium text-gray-700">
            {webSearchEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="text-red-500 p-4 border border-red-200 bg-red-50 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="messages-container mb-4 border rounded-lg p-4 bg-white min-h-[300px] max-h-[500px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            Start a conversation by sending a message below.
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        
        {loading && (
          <div className="mt-4">
            <LoadingState />
          </div>
        )}
      </div>
      
      <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
    </div>
  );
}
