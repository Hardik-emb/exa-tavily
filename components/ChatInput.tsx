'use client';

import { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
}

export default function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSendMessage(message.trim());
      setMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question..."
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            disabled={disabled || isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={disabled || isSubmitting || !message.trim()}
          className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors h-12"
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  );
}
