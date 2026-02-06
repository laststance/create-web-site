import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

// --- Live Reload State ---
const SSE_CLIENTS = new Set()
let fileWatcherActive = false
let debounceTimer = null

/**
 * Inline script injected into HTML responses to enable live reload.
 * Uses EventSource (SSE) to listen for file-change events from the server.
 * CSS changes hot-swap <link> hrefs; HTML/JS changes trigger full reload.
 */
const LIVE_RELOAD_SCRIPT = `<script>
(function() {
  var source = new EventSource('/__reload');
  source.addEventListener('reload', function(e) {
    var data = JSON.parse(e.data);
    if (data.type === 'css') {
      document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link) {
        var url = new URL(link.href);
        url.searchParams.set('t', Date.now());
        link.href = url.toString();
      });
    } else {
      location.reload();
    }
  });
  source.onerror = function() {
    source.close();
    setTimeout(function() { location.reload(); }, 1000);
  };
  console.log('[Live Reload] Connected');
})();
</script>`

/** Watched file extensions for live reload. */
const WATCH_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.svg'])

/**
 * Initialize the file watcher for live reload.
 * Watches __dirname recursively, debounces rapid changes, and broadcasts
 * reload events to all connected SSE clients.
 */
function initFileWatcher() {
  try {
    fs.watch(__dirname, { recursive: true }, (_event, filename) => {
      if (!filename) return

      // Ignore dotfiles, node_modules, and server.js itself
      if (
        filename.startsWith('.') ||
        filename.includes('node_modules') ||
        filename === 'server.js'
      ) {
        return
      }

      const ext = path.extname(filename)
      if (!WATCH_EXTENSIONS.has(ext)) return

      // Debounce rapid file changes (e.g. editor save bursts)
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const type = ext === '.css' ? 'css' : 'full'
        console.log(`📝 File changed: ${filename} (${type} reload)`)
        broadcastReload(filename, type)
      }, 100)
    })
    fileWatcherActive = true
    console.log('👁️  Live reload enabled')
  } catch {
    // Graceful degradation — recursive watch may not be supported on all platforms
    console.log('⚠️  Live reload unavailable (fs.watch recursive not supported)')
  }
}

/**
 * Send a reload event to all connected SSE clients.
 * Dead connections are removed automatically.
 */
function broadcastReload(filename, type) {
  const data = JSON.stringify({ file: filename, type })
  for (const client of SSE_CLIENTS) {
    try {
      client.write(`event: reload\ndata: ${data}\n\n`)
    } catch {
      SSE_CLIENTS.delete(client)
    }
  }
}

/**
 * Inject the live reload script into HTML content before </body>.
 * Falls back to appending the script if no </body> tag is found.
 */
function injectLiveReload(html) {
  if (!fileWatcherActive) return html

  // Case-insensitive replacement before </body>
  const bodyCloseRegex = /<\/body>/i
  if (bodyCloseRegex.test(html)) {
    return html.replace(bodyCloseRegex, `${LIVE_RELOAD_SCRIPT}\n</body>`)
  }
  // Fallback: append script if no </body> found
  return html + LIVE_RELOAD_SCRIPT
}

const server = http.createServer((req, res) => {
  // --- SSE endpoint for live reload ---
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write(': connected\n\n')

    // Heartbeat to prevent proxy/browser timeout
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n')
    }, 30000)

    SSE_CLIENTS.add(res)

    req.on('close', () => {
      clearInterval(heartbeat)
      SSE_CLIENTS.delete(res)
    })
    return
  }

  // Handle root path and remove query string
  let requestPath = req.url.split('?')[0]
  requestPath = requestPath === '/' ? '/index.html' : requestPath

  // Normalize path and prevent directory traversal
  const safePath = path.normalize(requestPath).replace(/^(\.\.(\/|\\|$))+/, '')
  const filePath = path.join(__dirname, safePath)

  // Security check: ensure file is within __dirname
  const resolvedPath = path.resolve(filePath)
  const relativePath = path.relative(__dirname, resolvedPath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    res.writeHead(403, { 'Content-Type': 'text/html' })
    res.end('<h1>403 Forbidden</h1>', 'utf-8')
    return
  }

  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'text/plain'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<h1>404 Not Found</h1>', 'utf-8')
      } else {
        res.writeHead(500)
        res.end(`Server Error: ${err.code}`, 'utf-8')
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      if (ext === '.html') {
        res.end(injectLiveReload(content.toString('utf-8')), 'utf-8')
      } else {
        res.end(content, 'utf-8')
      }
    }
  })
})

const PORT = process.env.PORT || 3000

initFileWatcher()

server.listen(PORT, () => {
  console.log(`🌍 Server running at http://localhost:${PORT}/`)
  console.log('Press Ctrl+C to stop')
})
