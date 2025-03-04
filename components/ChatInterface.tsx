'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingState from './LoadingState';
import { ChatMessage as ChatMessageType } from '@/lib/claude/client';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

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
      console.log('Sending chat request with message:', content);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          maxTokens: 1024
        }),
      });

      const data = await response.json();
      console.log('Chat API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Chat failed');
      }

      // Add the assistant's response to the chat
      const assistantMessage = data.data;
      assistantMessage.id = uuidv4();
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err.message : 'Chat failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Chat with Claude</h2>
        <p className="text-gray-600">
          Ask questions about current events and Claude will search the web for up-to-date information.
        </p>
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
