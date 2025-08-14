Best Practices
As a developer or business integrating Flutterwave to receive payments, it's important to follow best practices to maintain reliability, security, and compliance. Here are some key guidelines:

Payments
Receiving Customer Payments
Always verify the payment before giving value. Confirm the amount, currency, transaction reference and customer details.

Implement webhooks to handle transaction updates reliably.

When checking transaction status, make sure you're not hitting rate limits.


Making Payments
For USSD and transfer payments, use webhooks to confirm payment completion.

Error Handling
Handle edge cases carefully by giving value or rendering service only on definite API responses.

Catch all errors and show user-friendly, general messages when necessary.


Validating webhooks
Set a signature from your dashboard under Settings > Webhooks to verify all incoming webhooks.

Security
API Management
Verify that your app meets the following requirements for managing your API keys:

Never hardcode API credentials in your codebase.
Only initiate token-protected API calls from your backend, not from the client (browser or mobile app).
Store credentials in environment variables or use a secrets manager.

Authentication
Enforce strong password policies (e.g., minimum 8 characters, including uppercase, lowercase, numbers, and symbols).
Use input validation during login.
Prevent brute-force attacks using rate limits, account lockouts, and two-factor authentication.
Store database credentials securely, preferably using a secrets manager.

Cookie Management
Set all app session cookies with Secure and HttpOnly attributes.
On logout, terminate the session on the server and clear client-side session tokens to prevent caching.
Store session tokens in cookies and transport them only via HTTP cookie headers.

Session Management
Set session timeouts on the server.
Limit session duration to a maximum of 10 hours, after which re-authentication is required.
Implement idle timeouts.
Prevent concurrent sessions.
Use a cryptographically secure random number generator for session tokens.

Session Termination
Provide a clearly accessible logout option to terminate user sessions.
Invalidate sessions on the server during logout.
Destroy all session tokens on logout to make them unusable.

Handling Sensitive Information
Use secure channels (TLS 1.2 or TLS 1.3) for key exchange.
Limit storage and transmission of sensitive data. Use abstract identifiers where possible.
Encrypt sensitive data at rest.

Error Handling and Accountability
Log all privileged changes and administrative/user activities.
Log all access to sensitive data.
On unhandled exceptions, show a generic message to users. Never expose internal details like database errors or server traces.
Store logs securely and follow global log retention standards.

Input and Output Forms
Validate all inputs on the server side, even if already validated on the client.
Encode all outputs.
Proper validation and encoding protect your application against stored and reflected cross-site scripting (XSS) in headers, cookies, form fields, query strings, and hidden fields.
Use character whitelists for user inputs.
Validate uploaded files thoroughly.
Use parameterized SQL queries to prevent SQL injection.

Application Server
Disable caching for SSL pages and any page with sensitive data. Use Cache-Control: no-cache or no-store instead of private.
Keep OS, web server, and app server security patches up to date.
Only support TLS 1.2 or higher.
Enforce HTTPS across all pages and endpoints.
Disable TRACE and other unnecessary HTTP methods on your web server.

Vulnerability and Security Assessment
Your application should be protected against common security risks, including:

Cross-Site Request Forgery (CSRF)
Reflected and Stored Cross-Site Scripting (XSS)
SQL Injection
XML Injection