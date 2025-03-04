# Google Calendar Integration

This document provides instructions on how to set up and use the Google Calendar integration with Claude.

## Features

- **List Calendar Events**: View your upcoming events from Google Calendar
- **Create Events**: Add new events to your calendar
- **Update Events**: Modify existing events
- **Delete Events**: Remove events from your calendar
- **Natural Language Interaction**: Ask Claude to manage your calendar using natural language

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" at the top of the page
3. Click "New Project" and give it a name (e.g., "Claude Calendar Integration")
4. Click "Create"

### 2. Enable the Google Calendar API

1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and then click "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace account)
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact information
4. Add the scopes needed for Calendar:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add your email as a test user
6. Complete the registration

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Add a name for your OAuth client
5. Add authorized redirect URIs:
   - For the refresh token script: `http://localhost:3000/oauth2callback`
   - For the application: `http://localhost:3000/api/auth/callback/google`
6. Click "Create"
7. You'll receive a **Client ID** and **Client Secret** - save these securely

### 5. Add Credentials to Environment Variables

Add your Google credentials to your `.env.local` file:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 6. Get a Refresh Token

Run the provided script to get a refresh token:

```bash
npm install open server-destroy --save-dev
node scripts/get-google-refresh-token.js
```

Follow the prompts to enter your Client ID and Client Secret. The script will:
1. Open a browser for you to authenticate with Google
2. Capture the authorization code from the redirect
3. Exchange the code for access and refresh tokens
4. Display the refresh token for you to add to your `.env.local` file

Add the refresh token to your `.env.local` file:

```
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### 7. Start the Application

```bash
npm run dev
```

## Using the Calendar Integration

1. Open the application in your browser
2. Click on the "Claude with Calendar" tab
3. Sign in with your Google account if prompted
4. Start chatting with Claude about your calendar

### Example Prompts

- "What events do I have scheduled for this week?"
- "Create a meeting with John tomorrow at 2 PM for 1 hour"
- "Reschedule my 3 PM meeting to 4 PM"
- "Delete my meeting with Sarah"
- "What's on my calendar for next Monday?"
- "Add a reminder for my doctor's appointment on Friday at 10 AM"

## Troubleshooting

### Authentication Issues

- Make sure your OAuth consent screen is properly configured
- Verify that your redirect URIs are correctly set up
- Check that your Client ID, Client Secret, and Refresh Token are correctly added to `.env.local`

### Calendar Access Issues

- Ensure you've granted the necessary permissions during the OAuth flow
- Verify that the Google Calendar API is enabled in your Google Cloud project
- Check the browser console and server logs for any error messages

### Refresh Token Expiration

If your refresh token expires or becomes invalid:
1. Run the `get-google-refresh-token.js` script again
2. Update the `GOOGLE_REFRESH_TOKEN` in your `.env.local` file
3. Restart the application
