'use client';

import { ChatMessage as ChatMessageType } from '@/lib/claude/client';
import { SearchResult } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`mb-4 ${isUser ? 'text-right' : 'text-left'}`}>
      <div className={`inline-block p-4 rounded-lg max-w-[80%] ${
        isUser ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="font-semibold mb-1">
          {isUser ? 'You' : 'Claude'}
        </div>
        <div className="whitespace-pre-wrap">{message.content}</div>
        
        {/* Display search results if available */}
        {message.searchResults && message.searchResults.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="text-sm font-medium mb-2">Search Results Used:</div>
            <div className="space-y-3">
              {message.searchResults.map((result, index) => (
                <SearchResultItem key={index} result={result} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultItem({ result }: { result: SearchResult }) {
  return (
    <div className="text-sm border border-gray-200 rounded p-2 bg-white">
      <div className="font-medium">{result.title}</div>
      <a 
        href={result.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-500 hover:underline text-xs block mt-1 truncate"
      >
        {result.url}
      </a>
      <div className="mt-1 text-gray-600 text-xs line-clamp-2">{result.snippet}</div>
    </div>
  );
}
