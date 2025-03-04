'use client';

import { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import ClaudeTavilyInterface from '@/components/ClaudeTavilyInterface';

type ActiveTab = 'claude-exa' | 'claude-tavily';

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('claude-exa');

  return (
    <main className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Claude with Search Tools</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'claude-exa'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('claude-exa')}
        >
          Claude with Exa
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'claude-tavily'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('claude-tavily')}
        >
          Claude with Tavily
        </button>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'claude-exa' && <ChatInterface />}
      {activeTab === 'claude-tavily' && <ClaudeTavilyInterface />}
    </main>
  );
}
