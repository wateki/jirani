# Vercel Deployment Guide

## Subdomain Routing Configuration

When deploying on Vercel, the application needs special configuration to handle subdomain routing correctly.

### Environment Variables

Add the following environment variable in your Vercel project settings:

- `VITE_ENABLE_SUBDOMAIN_ROUTING`: Set to `false` for Vercel preview deployments (default) and `true` once you have your custom domain set up.

### Custom Domain Setup

1. Once your app is deployed on Vercel, add your custom domain in the Vercel project settings.
2. After verifying your custom domain, update the `VITE_ENABLE_SUBDOMAIN_ROUTING` to `true` if you want to use subdomain-based store routing.

### DNS Configuration for Subdomains

If you want to use subdomain-based store routing (e.g., `mystore.yourdomain.com`), you'll need to configure your DNS provider to route all subdomains to your Vercel app:

1. Add a wildcard DNS record:
   - Type: `A` or `CNAME`
   - Name: `*` (wildcard)
   - Value: Your Vercel app's IP address or domain
   - TTL: As recommended by your DNS provider

2. Verify the wildcard domain in Vercel if required.

## Common Issues

### Store Opening Instead of Landing Page

If your app is opening a store page instead of the landing page on Vercel, check:

1. The `VITE_ENABLE_SUBDOMAIN_ROUTING` environment variable is set to `false` in your Vercel project settings.
2. You've refreshed/redeployed the application after changing environment variables.

### Testing Stores Locally

To test store pages locally, use the `?store=mystore` query parameter in development mode (e.g., `http://localhost:5173?store=mystore`). 