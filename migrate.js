const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite', (err) => { // Siguraduhing tama ang file name ng DB mo
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

db.serialize(() => {
    // 1. Gumawa muna ng users table kung wala pa
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        year TEXT,
        email TEXT,
        password TEXT
    )`, (err) => {
        if (err) console.error("Error creating table:", err.message);
        else console.log("Users table verified/created.");
    });

    // 2. I-add ang course column kung wala pa
    db.run(`ALTER TABLE users ADD COLUMN course TEXT`, (err) => {
        if (err) {
            console.log('Note (Column might already exist):', err.message);
        } else {
            console.log('Successfully added "course" column to users table!');
        }
        db.close();
    });
});