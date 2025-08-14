Structure of a Webhook Payload
All webhook payloads follow the same basic structure:

A data object, The content of this object will vary depending on the event, but typically it will contain details of the event, including:
an id containing the ID of the transaction, e.g. chg_Hq4oBRTJ4r.
a status describing the status of the transaction, e.g. succeeded.
payment or customer details, if applicable.
A type field describing the type of event, e.g charge.completed.
An idfield containing the webhook ID, e.g. wbk_W5p6ktwU0jQ8RO4By860.
A timestampfield e.g. 1735116884019.
Here are some sample webhook payloads for transfers and payments:

Successful Payment

{
  "data": {
    "amount": 2500,
    "created_datetime": 1735116842.116,
    "currency": "KES",
    "customer": {
      "address": null,
      "created_datetime": 1732977179.938,
      "email": "olaobajua@gmail.com",
      "id": "cus_csm0pcQim4",
      "meta": {},
      "name": null,
      "phone": null
    },
    "description": null,
    "id": "chg_Hq4oBRTJ4r",
    "meta": {},
    "payment_method": {
      "client_ip": null,
      "created_datetime": 1735116842.107,
      "customer_id": "cus_csm0pcQim4",
      "device_fingerprint": null,
      "id": "pmd_sG5zwZBN4L",
      "meta": {},
      "mobile_money": {
        "country_code": "234",
        "network": "MTN",
        "phone_number": "9067985861"
      },
      "type": "mobile_money"
    },
    "processor_response": {
      "code": "00",
      "type": "approved"
    },
    "redirect_url": "https://google.com",
    "reference": "49c3c6f5-aedd-4443-9eb4-92c51758f04a",
    "status": "succeeded"
  },
  "id": "wbk_W5p6ktwU0jQ8RO4By860",
  "timestamp": 1735116884019,
  "type": "charge.completed"
}


Implementing a Webhook
Creating a webhook endpoint on your server is the same as writing any other API endpoint, but there are a few important details to note:

Verifying Webhook Signature
Responding to Webhook Requests
Webhook Timeout
Verifying Webhook Signatures
When enabling webhooks, you have the option to set a secret hash. Since webhook URLs are publicly accessible, this hash allows you to verify that incoming requests are from Flutterwave. Choose a random, secure value as your secret hash and store it as an environment variable on your server.

If you specify a secret hash, we'll include it in our request to your webhook URL, in a header called flutterwave-signature. In the webhook endpoint, check if the flutterwave-signature header is present and that it matches the secret hash you set. If the header is missing or the value doesn't match, you can discard the request, as it isn't from Flutterwave.


Responding to Webhook Requests
To acknowledge receipt of a webhook, your endpoint must return a 200 HTTP status code. Any other response codes, including 3xx codes will be treated as a failure. We don't care about the response body or headers..


Webhook Timeout
Webhook requests time out after 60 seconds. Your webhook endpoint must respond within this window. If it doesn't, the request will be marked as failed. If webhook retries are enabled, we’ll attempt to resend the request.

ℹ️
Handling Webhook Retries

Be sure to enable webhook retries on your dashboard. If we don't get a 200 status code (for example, if your server is unreachable), we'll retry the webhook call 3 times, with a 30-minute interval between each attempt.


Examples
Here are a few examples of implementing a webhook endpoint in some web frameworks:

🚧
Rails and Django

Web frameworks like Rails or Django check POST requests for CSRF tokens, a security measure against cross-site request forgery. Exclude webhook endpoints from CSRF protection.

Node.js
PHP
Python

// In an Express-like app:

app.post("/flw-webhook", (req, res) => {
    // If you specified a secret hash, check for the signature
    const secretHash = process.env.FLW_SECRET_HASH;
    const signature = req.headers["flutterwave-signature"];
    if (!signature || (signature !== secretHash)) {
        // This request isn't from Flutterwave; discard
        res.status(401).end();
    }
    const payload = req.body;
    // It's a good idea to log all received events.
    log(payload);
    // Do something (that doesn't take too long) with the payload
    res.status(200).end()
});

Best Practices for Implementing Webhooks
Always Verify Critical Transaction Data
Before giving value to a customer based on a webhook notification, always re-query our API to verify the transaction details. This helps confirm that the data returned is consistent with what you’re expecting and has not been compromised.

For example, when you receive a successful payment notification, call the transaction verification endpoint to confirm that the status, amount, currency, and tx_ref match the expected value in your system before confirming the customer's order.

JavaScript

const payload = req.body;
const response = await flw.Transaction.verify({id: payload.id});
if (
    response.data.status === "successful"
    && response.data.amount === expectedAmount
    && response.data.currency === expectedCurrency
    && response.data.tx_ref === expectedReference ) {
    // Success! Confirm the customer's payment
} else {
    // Inform the customer their payment was unsuccessful
}

Don't Rely Solely on Webhooks
Have a backup strategy in place, in case your webhook endpoint fails. For instance, if your webhook endpoint is throwing server errors, you won't know about any new customer payments because webhook requests will fail.

To get around this, we recommend setting up a background job that polls for the status of any pending transactions at regular intervals (for instance, every hour) using the transaction verification endpoint, till a successful or failed response is returned.


Use a Signature
Remember, your webhook URL is public, and anyone can send a fake payload. We recommend using a signature so you can be sure the requests you get are from Flutterwave.


Respond Quickly
Your webhook endpoint needs to respond within a certain time limit, or we'll consider it a failure and try again. Avoid doing long-running tasks or network calls in your webhook endpoint so you don't hit the timeout.

If your framework supports it, you can have your webhook endpoint immediately return a 200 status code, and then perform the rest of its duties; otherwise, you should dispatch any long-running tasks to a job queue, and then respond.


Be Idempotent
Occasionally, we might send the same webhook event more than once. You should make your event processing idempotent (calling the webhook multiple times will have the same effect), so you don't end up giving a customer value multiple times.

One way of doing this is recording the events you've processed, and then checking if the status has changed before processing the duplicate event:

JavaScript

const payload = req.body;
const existingEvent = await PaymentEvent.where({id: payload.id}).find();
if (existingEvent.status === payload.status) {
    // The status hasn't changed,
    // so it's probably just a duplicate event
    // and we can discard it
    res.status(200).end();
}

// Record this event
await PaymentEvent.save(payload);
// Process event...