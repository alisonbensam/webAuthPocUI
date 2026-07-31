/**
 * Production server for Azure App Service Linux.
 * Serves the React build folder and handles SPA routing.
 * Uses only Node.js built-in modules — zero dependencies needed.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const buildPath = path.join(__dirname, "build");

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".map": "application/json",
};

const server = http.createServer((req, res) => {
  // Remove query string
  const url = req.url.split("?")[0];
  let filePath = path.join(buildPath, url);

  // Check if the file exists
  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      // Serve the static file
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA fallback — serve index.html
      const indexPath = path.join(buildPath, "index.html");
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(indexPath).pipe(res);
    }
  });
});

server.listen(PORT, () => {
  console.log(`webAuthPocUI running on port ${PORT}`);
});
