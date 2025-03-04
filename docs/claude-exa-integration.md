# Claude and Exa Integration

This document explains how Claude AI and Exa search capabilities are integrated in this application to provide up-to-date information in chat responses.

## Overview

The integration allows Claude to dynamically search for current information using Exa when responding to user queries. This is particularly useful for questions about recent events or topics that might not be covered in Claude's training data.

## How Claude and Exa Interact

The interaction between Claude and Exa is implemented through a tool-use framework that allows Claude to dynamically decide when to search for information.

### 1. Tool Definition

Claude is configured with a special tool called "exa_search" that it can use when needed:

```javascript
const exaSearchTool = {
  name: "exa_search",
  description: "Search the internet for current information using Exa API",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to look up"
      },
      num_results: {
        type: "number",
        description: "Number of results to return (default: 5)"
      }
    },
    required: ["query"]
  }
};
```

This tool definition tells Claude:
- The tool's name and purpose
- What parameters it accepts (a search query and optional number of results)
- That it can use this tool to get current information from the internet

### 2. Decision to Use the Tool

When a user asks a question, the application sends the entire conversation history to Claude along with the tool definition:

```javascript
const response = await this.client.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: maxTokens,
  messages: formattedMessages,
  tools: [exaSearchTool],
  tool_choice: { type: "auto" }
});
```

The `tool_choice: { type: "auto" }` setting allows Claude to decide on its own whether to use the tool. Claude analyzes the user's question and determines if it needs current information that might not be in its training data.

### 3. Tool Use Request

If Claude decides it needs to search for information, it responds with a special "tool_use" message instead of a text response:

```javascript
// Claude's response contains a tool_use block
{
  type: "tool_use",
  id: "tool_use_12345",
  name: "exa_search",
  input: {
    query: "Samay Raina controversy 2025",
    num_results: 5
  }
}
```

The application detects this tool use request by checking:

```javascript
const hasToolUse = response.content.some(block => block.type === 'tool_use');
```

### 4. Executing the Search

When a tool use request is detected, the application:
1. Extracts the search query from Claude's request
2. Calls the Exa API through the ExaClient:

```javascript
const searchResults = await this.exaClient.search({
  query: input.query,
  numResults: input.num_results || 5
});
```

The Exa client makes an HTTP request to the Exa API, which returns search results from the web.

### 5. Returning Results to Claude

The search results are then sent back to Claude as a "tool_result":

```javascript
const toolResponse = await this.client.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: maxTokens,
  messages: [
    ...formattedMessages,
    {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseBlock.id,
          name: toolUseBlock.name,
          input: toolUseBlock.input
        }
      ]
    },
    {
      role: "user",
      content: [
        { 
          type: "tool_result", 
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(searchResults)
        }
      ]
    }
  ]
});
```

This sends:
1. The original conversation
2. Claude's tool use request
3. The search results from Exa

### 6. Final Response Generation

Claude processes the search results and generates a final text response that incorporates the information from Exa:

```javascript
// Extract the text response from Claude
const textContent = toolResponse.content.find(block => block.type === 'text');
return {
  role: 'assistant',
  content: textContent && textContent.type === 'text' ? textContent.text : '',
  searchResults: searchResults
};
```

The final response includes:
- Claude's answer that incorporates information from the search
- The original search results, which are displayed to the user in the UI

## User Experience

This entire flow happens seamlessly from the user's perspective:

1. User asks a question (e.g., "What's the latest about Samay Raina controversy in 2025?")
2. Claude automatically determines if it needs to search for information
3. If needed, Claude formulates a search query and the system fetches results from Exa
4. Claude incorporates the search results into its response
5. The user receives both Claude's answer and the search results that were used

## Technical Implementation

The integration is implemented in the following files:

- `lib/claude/client.ts`: Contains the ClaudeClient class that manages communication with Claude's API and handles tool use
- `lib/exa/client.ts`: Contains the ExaClient class that manages communication with Exa's API
- `lib/claude/tools.ts`: Defines the tools available to Claude
- `app/api/chat/route.ts`: API endpoint for chat functionality
- `components/ChatInterface.tsx`: UI component for the chat interface
- `components/ChatMessage.tsx`: UI component for displaying chat messages and search results

## Benefits

This integration provides several benefits:

1. **Up-to-date information**: Claude can provide information about recent events that occurred after its training cutoff
2. **Factual accuracy**: Claude can verify information with current sources
3. **Transparency**: Users can see the search results that Claude used to formulate its response
4. **Flexibility**: Claude only searches when necessary, using its own judgment about when external information is needed

## Example Use Cases

- Questions about current events or breaking news
- Queries about recent developments in ongoing situations
- Information about changes that have occurred since Claude's training data cutoff
- Verification of facts that Claude is uncertain about
