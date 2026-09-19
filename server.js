const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const otpStore = {}; 

const db = new sqlite3.Database('./school_system.db', (err) => {
  if (err) console.error('Database Error:', err.message);
  else console.log('Connected to school_system.db');
});

db.serialize(() => {
  // USERS TABLE
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullname TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    course TEXT,
    year TEXT,
    profileCompleted BOOLEAN DEFAULT 0
  )`);

  // SUBJECTS TABLE
  db.run(`CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL
  )`);

  // ACTIVITIES TABLE
  db.run(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subject TEXT DEFAULT 'General',
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'Medium',
    notes TEXT,
    status TEXT DEFAULT 'Pending'
  )`);

  // AUTO-FIX: Idadagdag ang due_time column kung wala pa ito sa lumang database
  db.run(`ALTER TABLE activities ADD COLUMN due_time TEXT`, (err) => {
    // Balewalain kung umiiral na ang column
  });
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/signup', (req, res) => {
  const { fullname, course, year, email, password } = req.body;
  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  db.run(
    'INSERT INTO users (fullname, course, year, email, password, profileCompleted) VALUES (?, ?, ?, ?, ?, 1)',
    [fullname, course, year, email, password],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'User created successfully!' });
    }
  );
});

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body;
  db.get(
    'SELECT * FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
      res.json({ message: 'Login successful', user });
    }
  );
});

app.put('/api/user/profile', (req, res) => {
  const { email, fullname, course, year, profileCompleted } = req.body;
  db.run(
    'UPDATE users SET fullname = ?, course = ?, year = ?, profileCompleted = ? WHERE email = ?',
    [fullname, course, year, profileCompleted ? 1 : 0, email],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Profile updated' });
    }
  );
});

// FORGOT PASSWORD - REQUEST OTP
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  db.get('SELECT email FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Email not found.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    console.log(`\n===================================`);
    console.log(`🔑 OTP Code for ${email}: [ ${otp} ]`);
    console.log(`===================================\n`);

    res.json({ message: 'OTP generated! Check terminal console.' });
  });
});

// FORGOT PASSWORD - RESET WITH OTP
app.post('/api/auth/reset-password', (req, res) => {
  const { email, otp, newPassword } = req.body;
  
  if (!otpStore[email] || otpStore[email] !== otp) {
    return res.status(400).json({ error: 'Invalid or expired OTP code.' });
  }

  db.run('UPDATE users SET password = ? WHERE email = ?', [newPassword, email], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    delete otpStore[email];
    res.json({ message: 'Password updated successfully!' });
  });
});

// --- SUBJECT ENDPOINTS ---
app.get('/api/subjects', (req, res) => {
  db.all('SELECT * FROM subjects ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/subjects', (req, res) => {
  const { code, name } = req.body;
  db.run('INSERT INTO subjects (code, name) VALUES (?, ?)', [code, name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, code, name });
  });
});

app.delete('/api/subjects/:id', (req, res) => {
  db.run('DELETE FROM subjects WHERE id = ?', req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted' });
  });
});

// --- ACTIVITY ENDPOINTS ---
app.get('/api/activities', (req, res) => {
  db.all('SELECT * FROM activities ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/activities', (req, res) => {
  const { title, subject, due_date, due_time, priority, notes } = req.body;
  db.run(
    'INSERT INTO activities (title, subject, due_date, due_time, priority, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [title, subject, due_date, due_time, priority, notes],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, title, status: 'Pending' });
    }
  );
});

app.patch('/api/activities/:id/status', (req, res) => {
  const { status } = req.body;
  db.run('UPDATE activities SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Updated' });
  });
});

app.delete('/api/activities/:id', (req, res) => {
  db.run('DELETE FROM activities WHERE id = ?', req.params.id, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted' });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));