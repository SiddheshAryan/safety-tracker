const express = require("express");
const app = express();
const http = require("http").createServer(app);

const { Server } = require("socket.io");
const io = new Server(http, {
  cors: {
    origin: "*",
  },
});

const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

app.use(cors());
app.use(express.json());
app.use(express.static("client"));

/* =========================
   MYSQL CONNECTION
========================= */

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "sid@crick2006",
  database: process.env.DB_NAME || "trackingsystem",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL");
  }
});

/* =========================
   IN-MEMORY LIVE CACHE
========================= */

let studentLocations = {};

/* =========================
   REGISTER USER
========================= */

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!["student", "teacher", "parent"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [name, email, hashedPassword, role], (err, result) => {
      if (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ error: "Registration failed" });
      }

      res.json({
        message: "User registered successfully",
        userId: result.insertId,
      });
    });
  } catch (error) {
    console.error("Register route error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* =========================
   LOGIN USER
========================= */

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const sql = `SELECT * FROM users WHERE email = ?`;

  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Invalid password" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
});

/* =========================
   GET ALL STUDENTS
========================= */

app.get("/api/students", (req, res) => {
  const sql = `
    SELECT id, name, email, role, created_at
    FROM users
    WHERE role = 'student'
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Fetch students error:", err);
      return res.status(500).json({ error: "Failed to fetch students" });
    }

    res.json(results);
  });
});

/* =========================
   DELETE STUDENT
========================= */

app.delete("/api/students/:studentId", (req, res) => {
  const { studentId } = req.params;
  const { teacherId } = req.body;

  if (!teacherId) {
    return res.status(400).json({ error: "teacherId is required" });
  }

  const teacherCheckSql =
    "SELECT * FROM users WHERE id = ? AND role = 'teacher'";

  db.query(teacherCheckSql, [teacherId], (err, teacherResults) => {
    if (err) {
      return res.status(500).json({ error: "Server error" });
    }

    if (teacherResults.length === 0) {
      return res
        .status(403)
        .json({ error: "Only teachers can delete students" });
    }

    const deleteSql = `DELETE FROM users WHERE id = ?`;

    db.query(deleteSql, [studentId], (err2) => {
      if (err2) {
        return res.status(500).json({ error: "Failed to delete student" });
      }

      res.json({ message: "Student deleted successfully" });
    });
  });
});

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", (socket) => {
  console.log("🔌 User connected");

  socket.on("locationUpdate", (data) => {
    const { studentId, lat, lon, locationName = "", status = "moving" } = data;

    if (!studentId || lat == null || lon == null) {
      socket.emit("locationError", {
        message: "studentId, lat and lon are required",
      });
      return;
    }

    studentLocations[studentId] = {
      lat,
      lon,
      locationName,
      status,
    };

    const historySql = `
      INSERT INTO tracking_history
      (student_id, latitude, longitude, location_name)
      VALUES (?, ?, ?, ?)
    `;

    db.query(historySql, [studentId, lat, lon, locationName]);

    io.emit("receiveLocation", {
      studentId,
      lat,
      lon,
      locationName,
      status,
    });

    console.log("📍 Location updated for student:", studentId);
  });

  socket.on("trackStudent", (studentId) => {
    if (studentLocations[studentId]) {
      socket.emit("receiveLocation", studentLocations[studentId]);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
  console.log(`✅ Safety Tracker Server Running on port ${PORT}`);
});
