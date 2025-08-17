const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // serve index.html + js

const DATA_FILE = path.join(__dirname, "nodePositions.json");

// Get nodes
app.get("/nodes", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error reading node data");
    res.json(JSON.parse(data));
  });
});

// Save nodes
app.post("/nodes", (req, res) => {
  fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
    if (err) return res.status(500).send("Error writing node data");
    res.json({ status: "ok" });
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
