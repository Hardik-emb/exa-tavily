'use client';

import { ChatMessage as ChatMessageType } from '@/lib/claude/client';
import { SearchResult, GeneratedImage } from '@/types';
import { CalendarEvent } from '@/lib/google/calendar-client';

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
        
        {/* Display generated images if available */}
        {message.generatedImages && message.generatedImages.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="text-sm font-medium mb-2">Generated Images:</div>
            <div className="space-y-3">
              {message.generatedImages.map((image, index) => (
                <GeneratedImageItem key={index} image={image} />
              ))}
            </div>
          </div>
        )}
        
        {/* Display calendar events if available */}
        {message.calendarEvents && message.calendarEvents.length > 0 && (
          <div className="mt-4 border-t pt-3">
            <div className="text-sm font-medium mb-2">Calendar Events:</div>
            <div className="space-y-3">
              {message.calendarEvents.map((event, index) => (
                <CalendarEventItem key={index} event={event} />
              ))}
            </div>
          </div>
        )}
        
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

function GeneratedImageItem({ image }: { image: GeneratedImage }) {
  return (
    <div className="text-sm border border-gray-200 rounded p-2 bg-white">
      <img 
        src={image.url} 
        alt={image.prompt}
        className="w-full h-auto rounded"
      />
      <div className="mt-2 text-xs text-gray-600">{image.prompt}</div>
    </div>
  );
}

function CalendarEventItem({ event }: { event: CalendarEvent }) {
  // Format date and time
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div className="text-sm border border-gray-200 rounded p-2 bg-white">
      <div className="font-medium">{event.summary}</div>
      {event.description && (
        <div className="mt-1 text-gray-600 text-xs">{event.description}</div>
      )}
      <div className="mt-1 text-xs">
        <span className="font-medium">Start:</span> {formatDateTime(event.start.dateTime)}
      </div>
      <div className="mt-1 text-xs">
        <span className="font-medium">End:</span> {formatDateTime(event.end.dateTime)}
      </div>
      {event.location && (
        <div className="mt-1 text-xs">
          <span className="font-medium">Location:</span> {event.location}
        </div>
      )}
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
