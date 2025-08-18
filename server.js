// Import the necessary Node.js modules
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Create the server
const server = http.createServer((req, res) => {
    // Log the request URL and method for debugging
    console.log(`Request received: ${req.method} ${req.url}`);

    // === Handle POST requests to save node positions ===
    if (req.method === 'POST' && req.url === '/save-nodes') {
        let body = '';
        req.on('data', chunk => {
            // Collect the data chunks from the request body
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                // Parse the JSON data from the request body
                const nodeData = JSON.parse(body);
                const filePath = path.join(__dirname, 'nodePositions.json');

                // Write the JSON data to the file
                fs.writeFile(filePath, JSON.stringify(nodeData, null, 2), (err) => {
                    if (err) {
                        console.error('Error writing to file:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Error saving positions.' }));
                    } else {
                        console.log('Positions saved successfully!');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ message: 'Positions saved successfully.' }));
                    }
                });
            } catch (e) {
                // Handle JSON parsing errors
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Invalid JSON data.' }));
            }
        });
    }

    // === Handle GET requests for static files (HTML, JSON) ===
    else if (req.method === 'GET') {
        let filePath = '.' + req.url;
        if (filePath === './') {
            // Serve the main HTML file when the root URL is requested
            filePath = './3d-force-graph.html'; 
        }

        // Handle the case where the user's HTML file has a different name
        // The user's HTML file in the immersive is named: 3d-force-graph
        if (filePath.endsWith('3d-force-graph')) {
            filePath = './3d-force-graph.html';
        }

        // Get the file extension and set the content type
        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.json': 'application/json'
        };
        const contentType = mimeTypes[extname] || 'application/octet-stream';

        // Read the file and send it as the response
        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    // File not found
                    res.writeHead(404);
                    res.end('File not found: ' + req.url);
                } else {
                    // Other server errors
                    res.writeHead(500);
                    res.end('Server error: ' + err.code);
                }
            } else {
                // Success
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    }

    // Handle any other request methods
    else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed.');
    }
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
