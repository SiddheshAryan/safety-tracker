const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("safety_tracker.db", (err) => {
    if (err) {
        console.log("Database connection error:", err);
    } else {
        console.log("Connected to SQLite database");
    }
});

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            roll_number TEXT UNIQUE,
            parent_mobile TEXT,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS parents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_name TEXT,
            child_roll TEXT,
            mobile TEXT,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS faculty (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            faculty_name TEXT,
            subject TEXT,
            mobile TEXT,
            password TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS tracking_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roll_number TEXT,
            start_time TEXT,
            start_lat REAL,
            start_lon REAL,
            stop_time TEXT,
            stop_lat REAL,
            stop_lon REAL
        )
    `);

});

module.exports = db;
