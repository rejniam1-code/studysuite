const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// I-serve ang static files mula sa 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 1. Database Setup (SQLite)
const db = new sqlite3.Database('./studysuite.db', (err) => {
  if (err) {
    console.error('Database opening error: ', err.message);
  } else {
    console.log('Connected to SQLite database successfully.');
  }
});

// Create Tables kung wala pa
db.serialize(() => {
  // Users Table (Kasama ang role column para sa Student / Professor)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  // Subjects Table
  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    code TEXT,
    name TEXT
  )`);

  // Activities Table
  db.run(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    title TEXT,
    subject TEXT,
    due_date TEXT,
    due_time TEXT,
    priority TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Pending'
  )`);
});


// ==========================================
// 2. AUTHENTICATION API ENDPOINTS
// ==========================================

// Sign Up (May kasamang Role: Student / Professor)
app.post('/api/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const userRole = role || 'Student'; // Default sa Student kung sakali
  const query = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`;

  db.run(query, [name, email, password, userRole], function(err) {
    if (err) {
      return res.status(400).json({ message: 'Email is already registered or invalid data.' });
    }
    res.json({ id: this.lastID, message: 'Account created successfully!' });
  });
});

// Sign In / Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
  db.get(query, [email, password], (err, row) => {
    if (err || !row) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    // Ibalik ang user info kasama ang role
    res.json({ 
      email: row.email, 
      name: row.name, 
      role: row.role 
    });
  });
});


// ==========================================
// 3. SUBJECTS API ENDPOINTS
// ==========================================

// Get Subjects per User
app.get('/api/subjects', (req, res) => {
  const { email } = req.query;
  const query = `SELECT * FROM subjects WHERE email = ?`;

  db.all(query, [email], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve subjects.' });
    }
    res.json(rows);
  });
});

// Add Subject
app.post('/api/subjects', (req, res) => {
  const { email, code, name } = req.body;

  if (!email || !code || !name) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = `INSERT INTO subjects (email, code, name) VALUES (?, ?, ?)`;
  db.run(query, [email, code, name], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to save subject.' });
    }
    res.json({ id: this.lastID, message: 'Subject added successfully!' });
  });
});

// Delete Subject
app.delete('/api/subjects/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM subjects WHERE id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete subject.' });
    }
    res.json({ message: 'Subject deleted successfully!' });
  });
});


// ==========================================
// 4. ACTIVITIES API ENDPOINTS
// ==========================================

// Get Activities per User
app.get('/api/activities', (req, res) => {
  const { email } = req.query;
  const query = `SELECT * FROM activities WHERE email = ?`;

  db.all(query, [email], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to retrieve activities.' });
    }
    res.json(rows);
  });
});

// Add Activity
app.post('/api/activities', (req, res) => {
  const { email, title, subject, due_date, due_time, priority, notes } = req.body;

  if (!email || !title) {
    return res.status(400).json({ message: 'Email and title are required.' });
  }

  const query = `INSERT INTO activities (email, title, subject, due_date, due_time, priority, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`;
  db.run(query, [email, title, subject, due_date, due_time, priority, notes], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to save activity.' });
    }
    res.json({ id: this.lastID, message: 'Activity added successfully!' });
  });
});

// Update Activity Status (Pending / In Progress / Completed)
app.patch('/api/activities/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const query = `UPDATE activities SET status = ? WHERE id = ?`;
  db.run(query, [status, id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to update status.' });
    }
    res.json({ message: 'Status updated successfully!' });
  });
});

// Delete Activity
app.delete('/api/activities/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM activities WHERE id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete activity.' });
    }
    res.json({ message: 'Activity deleted successfully!' });
  });
});


// Fallback route para sa SPA (Single Page Application) kung index.html ang gamit sa public folder
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// Simulan ang Server
app.listen(PORT, () => {
  console.log(`StudySuite Server is running on port ${PORT}`);
});