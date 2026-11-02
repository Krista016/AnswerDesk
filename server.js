const http = require('http');
const fs = require('fs');
const path = require('path');

// Automatically load .env.local for local development if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\s*([\w_]+)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) {
            process.env[m[1]] = m[2];
        }
    }
}

const chatHandler = require('./api/chat.js');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = urlObj.pathname;

    // Route /api/chat to our Gemini API handler
    if (pathname === '/api/chat') {
        delete require.cache[require.resolve('./api/chat.js')];
        const freshHandler = require('./api/chat.js');
        freshHandler(req, res);
        return;
    }

    // Static file serving
    let filePath = path.join(BASE_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(BASE_DIR)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback for html extension omission
            if (!path.extname(filePath)) {
                const htmlPath = filePath + '.html';
                if (fs.existsSync(htmlPath)) {
                    serveFile(htmlPath, res);
                    return;
                }
            }
            res.statusCode = 404;
            res.end('Not Found');
            return;
        }

        serveFile(filePath, res);
    });
});

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
    console.log(`AnswerDesk server with Gemini API active at http://localhost:${PORT}`);
});
