const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DATA_FILE = path.join(__dirname, "nodePositions.json");

// Read nodes
app.get("/nodes", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Failed to read file" });
    res.json(JSON.parse(data));
  });
});

// Save nodes
app.post("/save", (req, res) => {
  const nodes = req.body;
  fs.writeFile(DATA_FILE, JSON.stringify(nodes, null, 2), (err) => {
    if (err) return res.status(500).json({ error: "Failed to save file" });
    res.json({ message: "Saved successfully" });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
