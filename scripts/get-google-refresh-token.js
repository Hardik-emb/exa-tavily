#!/usr/bin/env node

/**
 * This script helps you get a Google OAuth refresh token for Google Calendar API.
 * Run this script with: node scripts/get-google-refresh-token.js
 * 
 * Prerequisites:
 * 1. You must have created a Google Cloud Project
 * 2. Enabled the Google Calendar API
 * 3. Created OAuth 2.0 credentials (Web application type)
 * 4. Set up authorized redirect URIs (http://localhost:3000/oauth2callback)
 * 
 * The script will:
 * 1. Open a browser for you to authenticate with Google
 * 2. Capture the authorization code from the redirect
 * 3. Exchange the code for access and refresh tokens
 * 4. Display the refresh token for you to add to your .env.local file
 */

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const open = require('open');
const destroyer = require('server-destroy');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Ask for client ID and secret
rl.question('Enter your Google OAuth Client ID: ', (clientId) => {
  rl.question('Enter your Google OAuth Client Secret: ', (clientSecret) => {
    getRefreshToken(clientId, clientSecret);
    rl.close();
  });
});

async function getRefreshToken(clientId, clientSecret) {
  // Create an OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/oauth2callback'
  );

  // Generate the authorization URL
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    prompt: 'consent'  // Force to get refresh token
  });

  // Create a local server to receive the callback
  const server = http
    .createServer(async (req, res) => {
      try {
        // Handle the OAuth2 callback
        if (req.url.startsWith('/oauth2callback')) {
          // Get the code from the callback URL
          const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
          const code = qs.get('code');
          
          // Exchange the code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          
          // Send a success response to the browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <h1>Authentication successful!</h1>
            <p>You can close this window now and return to the terminal.</p>
            <script>window.close();</script>
          `);
          
          // Display the refresh token in the terminal
          console.log('\n\n');
          console.log('='.repeat(80));
          console.log('SUCCESS! Add this refresh token to your .env.local file:');
          console.log('='.repeat(80));
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log('='.repeat(80));
          
          // Close the server
          server.close();
        }
      } catch (e) {
        // Handle errors
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`<h1>Error</h1><p>${e.message}</p>`);
        console.error('Error getting tokens:', e);
        server.close();
      }
    })
    .listen(3000, () => {
      // Open the authorization URL in the browser
      console.log('Opening browser for authentication...');
      open(authorizeUrl, { wait: false });
    });
  
  destroyer(server);
}
