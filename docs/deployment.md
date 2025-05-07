# Deployment Guide for Subdomain-Based Stores

This guide provides instructions for deploying the Shopify Builder Kit with subdomain-based store routing, where each store is accessible via its own subdomain (e.g., `mystorename.yourdomain.com`).

## Requirements

1. A domain name that you control
2. Access to your domain's DNS settings
3. A hosting provider that supports wildcard subdomains
4. SSL certificate that supports wildcard subdomains

## Environment Configuration

The application uses environment variables to configure various aspects of the deployment. You need to set these up before deploying:

1. Copy the `.env.example` file to `.env` for local development
2. For production deployment, set these environment variables on your hosting platform

### Required Environment Variables:

```
# Production configuration
VITE_PRODUCTION_DOMAIN=yourdomain.com

# Supabase configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Local development
VITE_LOCAL_DEV_PORT=8080

# UI Configuration
VITE_SHOW_PREVIEW_URL=true
```

- `VITE_PRODUCTION_DOMAIN`: Your main domain name without www or http (e.g., `mysite.com`)
- `VITE_SUPABASE_URL`: URL of your Supabase instance
- `VITE_SUPABASE_ANON_KEY`: Anonymous key for your Supabase project
- `VITE_LOCAL_DEV_PORT`: Port to use for local development (default: 8080)
- `VITE_SHOW_PREVIEW_URL`: Whether to show the full URL in the preview button (true/false)

## DNS Configuration

To enable subdomain-based routing, you need to set up a wildcard DNS record:

1. Log in to your domain registrar or DNS provider
2. Add a wildcard A record or CNAME record:
   - **Type**: A or CNAME
   - **Name**: `*` (wildcard)
   - **Value**: Your server's IP address (for A record) or your main domain (for CNAME record)
   - **TTL**: 3600 (or as recommended by your DNS provider)

Example:
```
*.yourdomain.com.  IN  A  123.45.67.89
```
or
```
*.yourdomain.com.  IN  CNAME  yourdomain.com.
```

## SSL Certificate

You'll need a wildcard SSL certificate to secure all subdomains:

1. Obtain a wildcard SSL certificate for `*.yourdomain.com`
2. Install it on your server according to your hosting provider's instructions

Most providers like Let's Encrypt support wildcard certificates:
```bash
certbot certonly --manual --preferred-challenges=dns -d yourdomain.com -d *.yourdomain.com
```

## Server Configuration

### Nginx Configuration

If you're using Nginx, configure it to handle all subdomains and route them to your application:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com *.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory for your app
    root /var/www/yourdomain.com/dist;
    
    # Application routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Apache Configuration

If you're using Apache, add this to your VirtualHost configuration:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias *.yourdomain.com
    Redirect permanent / https://%{HTTP_HOST}%{REQUEST_URI}
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias *.yourdomain.com
    
    DocumentRoot /var/www/yourdomain.com/dist
    
    SSLEngine on
    SSLCertificateFile /path/to/certificate.crt
    SSLCertificateKeyFile /path/to/private.key
    SSLCertificateChainFile /path/to/ca_bundle.crt
    
    <Directory /var/www/yourdomain.com/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # For SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

## Hosting Providers

Different hosting providers have different ways to handle wildcard subdomains:

### Vercel

Update your `vercel.json` file:

```json
{
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

In the Vercel dashboard:
1. Add your domain and enable wildcard subdomains
2. Go to "Settings" > "Environment Variables" and add all required variables

### Netlify

Update your `_redirects` file:

```
/* /index.html 200
```

In the Netlify dashboard:
1. Add your domain and enable wildcard subdomains
2. Go to "Site settings" > "Build & deploy" > "Environment" and add all required variables

## Local Development

For local development:

1. Copy `.env.example` to `.env` and adjust values as needed
2. Start your development server:
   ```bash
   npm run dev
   ```

3. Use the query parameter for testing specific stores:
   ```
   http://localhost:8080?store=mystorename
   ```

## Building for Production

When building for production, ensure that environment variables are correctly set:

```bash
# Build the application
npm run build
```

## Testing

After deployment, test your subdomain routing:

1. Visit `yourdomain.com` to ensure the main site loads
2. Visit `mystorename.yourdomain.com` to check that stores load correctly
3. Test the checkout flow on both the main domain and subdomains

## Troubleshooting

### Store Not Found

If you see "Store Not Found" errors:

1. Check that the store slug exists in your database
2. Verify the store is marked as published
3. Check browser console for any API errors
4. Verify that your environment variables are correctly set

### DNS Issues

If subdomains aren't resolving:

1. Verify your DNS configuration with:
   ```bash
   dig *.yourdomain.com
   ```
2. DNS changes can take up to 24-48 hours to propagate globally

### SSL Certificate Issues

If you're seeing SSL warnings:

1. Make sure your SSL certificate is valid for `*.yourdomain.com`
2. Check certificate installation on your server 