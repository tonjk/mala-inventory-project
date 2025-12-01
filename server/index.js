import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Connect to SQLite database
const dbPath = join(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create table if not exists (though it should exist based on exploration)
    db.run(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      avgDailyUsage REAL,
      maxDailyUsage REAL,
      leadTime REAL,
      currentStock REAL
    )`);
  }
});

// GET all items
app.get('/api/items', (req, res) => {
  const sql = 'SELECT * FROM items';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": rows
    });
  });
});

// POST new item
app.post('/api/items', (req, res) => {
  const { name, category, unit, avgDailyUsage, maxDailyUsage, leadTime, currentStock } = req.body;
  const sql = 'INSERT INTO items (name, category, unit, avgDailyUsage, maxDailyUsage, leadTime, currentStock) VALUES (?,?,?,?,?,?,?)';
  const params = [name, category, unit, avgDailyUsage, maxDailyUsage, leadTime, currentStock];
  
  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": {
        id: this.lastID,
        ...req.body
      }
    });
  });
});

// PUT update item
app.put('/api/items/:id', (req, res) => {
  const { name, category, unit, avgDailyUsage, maxDailyUsage, leadTime, currentStock } = req.body;
  const sql = `UPDATE items SET 
    name = COALESCE(?, name), 
    category = COALESCE(?, category), 
    unit = COALESCE(?, unit), 
    avgDailyUsage = COALESCE(?, avgDailyUsage), 
    maxDailyUsage = COALESCE(?, maxDailyUsage), 
    leadTime = COALESCE(?, leadTime), 
    currentStock = COALESCE(?, currentStock) 
    WHERE id = ?`;
  const params = [name, category, unit, avgDailyUsage, maxDailyUsage, leadTime, currentStock, req.params.id];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({
      "message": "success",
      "data": req.body,
      "changes": this.changes
    });
  });
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const sql = 'DELETE FROM items WHERE id = ?';
  db.run(sql, req.params.id, function (err) {
    if (err) {
      res.status(400).json({ "error": err.message });
      return;
    }
    res.json({ "message": "deleted", changes: this.changes });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
