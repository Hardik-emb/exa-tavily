# Exa-Claude Integration

This project integrates Exa search capabilities with Claude AI to provide up-to-date information in chat responses. It allows users to either directly search the web using Exa or chat with Claude, which can automatically search for current information when needed.

## Features

- **Direct Web Search**: Search the web using Exa's powerful search API
- **AI Chat with Claude**: Chat with Claude 3.7 Sonnet, which can provide up-to-date information
- **Automatic Tool Use**: Claude automatically decides when to search for information
- **Result Transparency**: See the search results that Claude used to formulate its responses

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Exa API key (get one from [Exa](https://exa.ai))
- Claude API key (get one from [Anthropic](https://console.anthropic.com))

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.local` file with your API keys:
   ```
   EXA_API_KEY=your-exa-api-key
   CLAUDE_API_KEY=your-claude-api-key
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Web Search

1. Click on the "Search" tab
2. Enter your search query
3. View the search results

### Chat with Claude

1. Click on the "Chat" tab
2. Ask a question (e.g., "What's the latest about Samay Raina controversy in 2025?")
3. Claude will automatically search for information if needed
4. View Claude's response and the search results it used

## How It Works

The integration between Claude and Exa is implemented through a tool-use framework that allows Claude to dynamically decide when to search for information. For detailed information about how this works, see [Claude-Exa Integration](docs/claude-exa-integration.md).

## Project Structure

- `app/`: Next.js app directory
  - `api/`: API routes
    - `chat/`: Chat API endpoint
    - `search/`: Search API endpoint
  - `page.tsx`: Main page component
- `components/`: React components
  - `ChatInterface.tsx`: Chat interface component
  - `ChatMessage.tsx`: Chat message component
  - `ChatInput.tsx`: Chat input component
  - `SearchForm.tsx`: Search form component
  - `SearchResults.tsx`: Search results component
  - `LoadingState.tsx`: Loading state component
- `lib/`: Library code
  - `claude/`: Claude API integration
  - `exa/`: Exa API integration
  - `utils/`: Utility functions
- `docs/`: Documentation
  - `claude-exa-integration.md`: Detailed explanation of the Claude-Exa integration

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [React](https://reactjs.org/) - UI library
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api) - AI model
- [Exa API](https://exa.ai/docs) - Search API
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## License

This project is licensed under the MIT License - see the LICENSE file for details.
