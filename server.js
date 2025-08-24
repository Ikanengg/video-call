
/*const WebSocket = require("ws");
const wss = new WebSocket.Server({ port: 5000 });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    // Broadcast incoming message to all other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
});

console.log("WebSocket signaling server running on ws://localhost:5000");*/

const express = require('express');
const path = require('path');
const app = express();
const port = 5000;

// Serve the static files from the React build directory.
// 'build' is the default output folder for a 'create-react-app' project.
app.use(express.static(path.join(__dirname, 'build')));

// Handle all other requests by serving the main index.html file.
// This is crucial for a single-page application (SPA) like React.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});