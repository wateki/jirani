Thank you for clarifying!  
If customers do **not** sign in (i.e., orders are created by unauthenticated users, or "anonymous checkout"), then the default Supabase RLS setup will **block all inserts** unless you explicitly allow inserts for unauthenticated users.

### Options for Allowing Anonymous Order Creation

#### 1. Allow All Inserts (Not Recommended for Sensitive Data)
You can create a very permissive policy:

```sql
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
USING (true)
WITH CHECK (true);
```
- This allows **anyone** (authenticated or not) to insert orders.

#### 2. Allow Only for Service Roles (More Secure)
If you want to restrict order creation to only your backend (using the service key), you can use:

```sql
CREATE POLICY "Service role can create orders"
ON public.orders
FOR INSERT
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```
- This means only your backend (using the service key) can create orders, not the public client.

#### 3. Allow Only for Authenticated Users (Default Ecommerce)
If you want to require login in the future, use the policy from the previous message.

---

### **Security Note**
Allowing anyone to insert into your orders table can expose you to spam, abuse, or malicious data.  
- If you allow anonymous inserts, consider adding anti-spam measures (rate limiting, CAPTCHA, etc.).
- If you want to track users later, consider implementing guest accounts or magic link authentication.

---

**Summary:**  
- For true anonymous checkout, use the "Anyone can create orders" policy above.
- Be aware of the security implications.

Would you like the exact SQL migration for this, or do you want to discuss a more secure approach?