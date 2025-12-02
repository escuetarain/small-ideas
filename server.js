const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// SSE endpoint for continuous ping
app.get('/ping-stream', (req, res) => {
    // Get hostname/IP from querystring, e.g. /ping-stream?host=google.com
    const host = req.query.host;
    if (!host || /[^a-zA-Z0-9.\-]/.test(host)) {
        res.status(400).end('Invalid host');
        return;
    }

    // Set SSE headers
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Start ping process (on Windows: '-t', on Linux/Mac: no -t)
    const ping = spawn('ping', ['-t', host]);

    // Send ping output lines to the client as they arrive
    ping.stdout.on('data', (data) => {
        // Each "data:" is a line in SSE protocol
        res.write(`data: ${data.toString()}\n\n`);
    });

    // If ping produces error output
    ping.stderr.on('data', (data) => {
        res.write(`data: ERROR: ${data.toString()}\n\n`);
    });

    // If ping exits, notify frontend and close connection
    ping.on('close', () => {
        res.write('event: end\ndata: Ping process ended.\n\n');
        res.end();
    });

    // If the user closes the browser/tab, kill ping
    req.on('close', () => {
        ping.kill();
        res.end();
    });
});

// Start the HTTP server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});