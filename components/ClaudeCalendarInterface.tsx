'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession, signIn } from 'next-auth/react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import LoadingState from './LoadingState';
import { ChatMessage as ChatMessageType } from '@/lib/claude/calendar-client';

export default function ClaudeCalendarInterface() {
  const { data: session, status } = useSession();
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
      console.log('Sending chat-calendar request with message:', content);
      
      const response = await fetch('/api/chat-calendar', {
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
      console.log('Chat-Calendar API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Chat failed');
      }

      // Add the assistant's response to the chat
      const assistantMessage = data.data;
      assistantMessage.id = uuidv4();
      
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      console.error('Chat-Calendar error:', err);
      setError(err instanceof Error ? err.message : 'Chat failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If not authenticated, show sign-in button
  if (status === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] border rounded-lg p-4 bg-white">
        <h2 className="text-xl font-semibold mb-4">Google Calendar Integration</h2>
        <p className="text-gray-600 mb-6 text-center">
          Sign in with your Google account to access your calendar and manage events with Claude.
        </p>
        <button
          onClick={() => signIn('google')}
          className="flex items-center justify-center rounded-md bg-white px-4 py-2 text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  // If loading session, show loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[300px] border rounded-lg p-4 bg-white">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Chat with Claude (Calendar)</h2>
        <p className="text-gray-600">
          Ask Claude to manage your Google Calendar events, create reminders, or check your schedule.
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
            Start a conversation by sending a message below. You can ask Claude to:
            <ul className="list-disc list-inside mt-2 text-left max-w-md mx-auto">
              <li>List your upcoming events</li>
              <li>Create a new event</li>
              <li>Update or reschedule an existing event</li>
              <li>Delete an event</li>
              <li>Get a summary of your day or week</li>
            </ul>
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
