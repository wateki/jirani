API Headers
Correctly use API headers in your requests.

In our v4 API, we've introduced some changes to how request headers work. Each header serves a specific purpose and helps us process your request more efficiently. In this section, we’ll walk through each one and explain how to use them in your requests.

📘
Prerequisites

We assume you're familiar with APIs and have used them before. If you're new to APIs, this beginner-friendly guide can help you get started.

Your API requests should include the following headers:

Content-Type
Authorization
X-Idempotency-Key
X-Trace-Id
X-Scenario-Key

Content-Type
Set this header to application/json to let our servers know to expect JSON data. This helps us read and respond to your requests correctly.

Example

curl --location 'https://api.flutterwave.cloud/developersandbox/customers?page=1' \
--header 'Content-Type: application/json'

Authorization
🚧
Generating Tokens

See the authentication section to learn how to generate your token and use this header.

Use this header to securely pass your access token along with your request. We use it to verify your identity and access level. If the token is missing or invalid, you'll get a 401 Unauthorized error.

Example
401 Unauthorized

curl --location 'https://api.flutterwave.cloud/developersandbox/customers?page=1' \
--header 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
--header 'Content-Type: application/json'

X-Idempotency-Key
This header helps prevent accidental duplicate transactions. If your request is retried (due to a timeout or network issue), it lets us process the request just once.

What Makes a Valid X-Idempotency-Key?
It must be a string using only alphanumeric ASCII characters.
Its length should be between 12 and 255 characters.
Example

curl --request POST \
--url 'https://api.flutterwave.cloud/developersandbox/charges' \
--header 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
--header 'Content-Type: application/json' \
--header 'X-Idempotency-Key: {{YOUR_UNIQUE_INDEMPOTENCY_KEY}}' \
--data '{}
'
🚧
Distinct Idempotency keys

Each X-Idempotency-Key must be unique per request. If you reuse a key, we’ll return the original response from the first request instead of processing a new one.


X-Trace-Id
The X-Trace-Id header helps track and debug API requests by assigning a unique identifier to each request.

When you send a request and include a trace ID, our servers log this ID and attach it to responses, helping you track the request’s flow. If an issue occurs, you can provide this ID to our support team for faster troubleshooting.

What Makes a Valid X-Trace-Id?
It must be a string using only alphanumeric ASCII characters.
Its length should be between 12 and 255 characters.
Example

curl --request POST \
--url 'https://api.flutterwave.cloud/developersandbox/charges' \
--header 'Authorization: Bearer {{YOUR_ACCESS_TOKEN}}' \
--header 'Content-Type: application/json' \
--header 'X-Trace-Id: {{YOUR_UNIQUE_TRACE_ID}}' \
--data '{}
'

X-Scenario-Key
🚧
Scenario Keys

See the Testing section for details on how to use this header.

This header lets you simulate different responses for testing purposes. You can mock scenarios like successful payments or failed transfers without changing your code.

If you pass an invalid key, we'll default to a pending status, which simulates an incomplete payment.