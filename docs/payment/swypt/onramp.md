
Okay, I've reviewed the `swyptAPI.md` document and can outline a payment flow that meets your requirements for a user-to-business payment, where funds arrive in the business's wallet and are available for withdrawal.

This flow primarily utilizes the **On-Ramp Process** detailed in the Swypt API documentation, treating the "business" as the ultimate recipient of the on-ramped cryptocurrency.

Here's the proposed flow:

---

## User-to-Business Payment Flow via Swypt API

This document outlines the steps for a customer (user) to make a payment to a business, with the funds being credited to the business's cryptocurrency wallet. The business can subsequently initiate an off-ramp process to withdraw these funds.

**Actors:**

*   **Customer:** The individual making the payment.
*   **Business System:** The application or platform managing the transaction at the storefront or online.
*   **Swypt API:** The third-party service facilitating the fiat-to-crypto conversion and transfer.
*   **Business Wallet:** The cryptocurrency wallet address designated by the business to receive payments.

**Assumptions:**

*   The business has API credentials (API key and secret) for the Swypt API.
*   The business has a designated cryptocurrency wallet address on a supported blockchain (e.g., Celo, Polygon, Base, Lisk).
*   The customer will be paying using a supported fiat method (e.g., M-Pesa, as per examples).

---

### Phase 1: Payment Initiation & Fiat-to-Crypto Conversion

**Step 1: Get Quote (Optional but Recommended)**

*   **Purpose:** To determine the current exchange rate, fees, and the expected crypto amount the business will receive for a given fiat payment from the customer. This information can be displayed to the customer or business.
*   **Action:** Business System calls the Swypt API.
*   **Endpoint:** `POST https://pool.swypt.io/api/swypt-quotes`
*   **Key Request Parameters:**
    *   `type`: `"onramp"`
    *   `amount`: Fiat amount the customer intends to pay (e.g., `"5000"`)
    *   `fiatCurrency`: Fiat currency code (e.g., `"KES"`)
    *   `cryptoCurrency`: Target cryptocurrency symbol for the business (e.g., `"USDT"`, `"cUSD"`)
    *   `network`: Blockchain network of the business's wallet (e.g., `"celo"`, `"Polygon"`)
*   **Authentication:** Requires `x-api-key` and `x-api-secret` headers.

**Step 2: Initiate Fiat Payment (STK Push)**

*   **Purpose:** The customer initiates a fiat payment (e.g., M-Pesa STK push) which, upon success, will be converted to crypto and sent to the business's wallet.
*   **Action:** Business System, using the customer's payment details and the business's wallet information, calls the Swypt API.
*   **Endpoint:** `POST https://pool.swypt.io/api/swypt-onramp`
*   **Key Request Parameters:**
    *   `partyA`: Customer's phone number (e.g., `"254703710518"`)
    *   `amount`: Fiat amount to be paid by the customer (e.g., `"5000"`)
    *   `side`: `"onramp"`
    *   `userAddress`: **Business's blockchain wallet address** (This links the payout to the store's account)
    *   `tokenAddress`: Token contract address of the cryptocurrency the business will receive.
*   **Authentication:** Requires `x-api-key` and `x-api-secret` headers.
*   **Successful Response:** Includes an `orderID` (e.g., `"D-rclsg-VL"`), which is crucial for tracking.

**Step 3: Monitor Fiat Payment Status**

*   **Purpose:** To check if the customer's fiat payment was successful.
*   **Action:** Business System periodically calls the Swypt API using the `orderID` from Step 2.
*   **Endpoint:** `GET https://pool.swypt.io/api/order-onramp-status/:orderID` (e.g., `https://pool.swypt.io/api/order-onramp-status/D-rclsg-VL`)
*   **Authentication:** Requires `x-api-key` and `x-api-secret` headers.
*   **Response Data:** Indicates `status` as `PENDING`, `SUCCESS`, or `FAILED`, along with other details.

---

### Phase 2: Crypto Transfer to Business Wallet

**Step 4: Process Crypto Transfer to Business**

*   **Purpose:** Once the customer's fiat payment is confirmed as `SUCCESS` (from Step 3), this step triggers the transfer of the equivalent cryptocurrency amount to the business's wallet.
*   **Prerequisite:** The status from Step 3 must be `SUCCESS`.
*   **Action:** Business System calls the Swypt API.
*   **Endpoint:** `POST https://pool.swypt.io/api/swypt-deposit`
*   **Key Request Parameters:**
    *   `chain`: Blockchain network of the business's wallet (must match the network intended in Step 1 & 2).
    *   `address`: **Business's blockchain wallet address** (must match `userAddress` from Step 2).
    *   `orderID`: The `orderID` from the successful fiat transaction (Step 2 & 3).
    *   `project` (Optional): Can be set to `"onramp"` or a business-specific identifier.
*   **Authentication:** Requires `x-api-key` and `x-api-secret` headers.
*   **Successful Response:** Indicates the transaction was processed successfully and includes the blockchain transaction `hash` (e.g., `"0x80856f025..."`). The funds are now in the business's wallet.

---

### Phase 3: Funds Availability & Business Withdrawal (Off-Ramp)

**Step 5: Funds in Business Wallet**

*   **Outcome:** Upon successful completion of Step 4 and blockchain confirmation of the transaction, the cryptocurrency is available in the business's designated wallet.

**Step 6: Business Initiates Withdrawal (Off-Ramp - Separate Flow)**

*   **Purpose:** If the business wishes to convert the received cryptocurrency back to fiat and withdraw it (e.g., to a bank account or mobile money).
*   **Note:** This is a separate process initiated by the business and follows the **OFF-RAMP FLOW** detailed in `swyptAPI.md`. A summary:
    1.  **Get Off-Ramp Quote:** Business System calls `POST https://pool.swypt.io/api/swypt-quotes` with `type: "offramp"`.
    2.  **Blockchain Transaction:** Business authorizes token withdrawal from their wallet to Swypt's escrow by calling `withdrawToEscrow` or `withdrawWithPermit` on the Swypt smart contract.
    3.  **Initiate Off-Ramp Order:** Business System calls `POST https://pool.swypt.io/api/swypt-order-offramp`, providing the blockchain transaction hash, business's payout details (e.g., phone number for M-Pesa), etc.
    4.  **Check Off-Ramp Status:** Business System calls `GET https://pool.swypt.io/api/order-offramp-status/:orderID` to monitor the withdrawal.

---

### Error Handling & Failed Transactions

*   **Scenario:** If the customer's fiat payment fails (e.g., STK push fails, insufficient funds, cancellation) at Step 2 or Step 3 reports a `FAILED` status.
*   **Action:** The Business System can create an on-ramp ticket for investigation or refund processing.
*   **Endpoint:** `POST https://pool.swypt.io/api/user-onramp-ticket`
*   **Key Request Parameters:**
    *   `orderID`: The `orderID` of the failed/cancelled transaction.
    *   `description`: Reason for the ticket (e.g., "Failed STK push for customer payment").
    *   Other parameters (phone, amount, userAddress, symbol, tokenAddress, chain) can be provided if `orderID` is not used or to override details.
*   **Authentication:** Requires `x-api-key` and `x-api-secret` headers.

---

This flow ensures that customer payments are processed, converted to crypto, and deposited into the business's designated wallet, making them available for subsequent withdrawal by the business.
