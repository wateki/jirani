Authentication
Learn how to authenticate your API requests.

Flutterwave utilizes OAuth 2.0 to authenticate API requests. With OAuth 2.0, you can connect your application to our servers without using your keys or sensitive information. This guide explains how to generate and use tokens to authenticate your requests.

Using OAuth2.0
To authenticate API requests with OAuth 2.0, you'll need to generate an access_token by sending a POST request to the OAuth 2.0 token endpoint. You must include your client_id, client_secret, and grant_type in the request.

🚧
Authentication on Sandbox and Production

This process applies to both the sandbox and production environments. Make sure to use the correct credentials for each environment to obtain a valid token.

cURL

curl -X POST 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'client_id={{CLIENT_ID}}' \
--data-urlencode 'client_secret={{CLIENT_SECRET}}' \
--data-urlencode 'grant_type=client_credentials'
A successful request will return a response containing the access_token, expires_in, token_type, not-before-policy, and scopes.

Here is an example response:

JSON

{
    "access_token": "SAMPLE_TOKEN",
    "expires_in": 600,
    "refresh_expires_in": 0,
    "token_type": "Bearer",
    "not-before-policy": 0,
    "scope": "profile email"
}

You can then use the access token to make authorized requests to any of our API endpoints:

cURL

# Sample cURL request to the payment gateway's API endpoint
curl -X GET https://api.flutterwave.cloud/{{ENVIRONMENT}}/endpoint \
     -H "Authorization: Bearer {{ACCESS_TOKEN}}" \
     -H "Content-Type: application/json"

🚧
Managing your Access Token

Your access token grants access to your Flutterwave account. Keep it confidential and store it securely on your server, ideally as an environment variable. Do not commit it to your Git repository or expose it in frontend code.

Refreshing your Access Token
Tokens expire periodically to help reduce security risks. Each token is valid for 10 minutes (as indicated by the expires_in field), so you should refresh it before it expires to maintain uninterrupted access.

We recommend refreshing the token at least one minute before it expires. Below are example implementations:

JavaScript
Python
PHP

const axios = require('axios');

let accessToken = null;
let expiresIn = 0; // token expiry time in seconds
let lastTokenRefreshTime = 0;

async function refreshToken() {
  try {
    const response = await axios.post(
      'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
      new URLSearchParams({
        client_id: '<CLIENT_ID>',
        client_secret: '<CLIENT_SECRET>',
        grant_type: 'client_credentials'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    accessToken = response.data.access_token;
    expiresIn = response.data.expires_in;
    lastTokenRefreshTime = Date.now();

    console.log('New Token:', accessToken);
    console.log('Expires in:', expiresIn, 'seconds');
  } catch (error) {
    console.error('Error refreshing token:', error.response ? error.response.data : error.message);
  }
}

async function ensureTokenIsValid() {
  const currentTime = Date.now();
}

Environments
Switch between Test and Production mode with ease

v4 supports two environments: Test mode (sandbox) and Production (live).

In the sandbox environment, all flows are mocked; no actual transaction processing occurs when you make requests. To connect to the sandbox environment, use https://api.flutterwave.cloud/developersandbox/ as your base URL for your requests.

For production, use https://api.flutterwave.cloud/f4bexperience/ as the base URL.

