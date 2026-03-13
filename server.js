const express = require("express");
const app = express();
const http = require("http").createServer(app);

const { Server } = require("socket.io");
const io = new Server(http);

const db = require("./database"); // SQLite database connection

app.use(express.json());
app.use(express.static("client"));

/*
Store live locations of students
rollNumber → {lat, lon}
*/
let studentLocations = {};


/* ===============================
   REGISTER USERS
================================ */

app.post("/register/student", (req, res) => {

    const { name, roll, parentMobile, password } = req.body;

    db.run(
        `INSERT INTO students (name, roll_number, parent_mobile, password)
         VALUES (?, ?, ?, ?)`,
        [name, roll, parentMobile, password],
        function (err) {

            if (err) {
                res.json({ success: false, message: "Student already exists" });
            } else {
                res.json({ success: true });
            }

        }
    );

});


app.post("/register/parent", (req, res) => {

    const { parentName, childRoll, mobile, password } = req.body;

    db.run(
        `INSERT INTO parents (parent_name, child_roll, mobile, password)
         VALUES (?, ?, ?, ?)`,
        [parentName, childRoll, mobile, password],
        function (err) {

            if (err) {
                res.json({ success: false });
            } else {
                res.json({ success: true });
            }

        }
    );

});


app.post("/register/faculty", (req, res) => {

    const { facultyName, subject, mobile, password } = req.body;

    db.run(
        `INSERT INTO faculty (faculty_name, subject, mobile, password)
         VALUES (?, ?, ?, ?)`,
        [facultyName, subject, mobile, password],
        function (err) {

            if (err) {
                res.json({ success: false });
            } else {
                res.json({ success: true });
            }

        }
    );

});


/* ===============================
   LOGIN USERS
================================ */

app.post("/login/student", (req, res) => {

    const { roll, password } = req.body;

    db.get(
        `SELECT * FROM students WHERE roll_number = ? AND password = ?`,
        [roll, password],
        (err, row) => {

            if (row) {
                res.json({ success: true, name: row.name });
            } else {
                res.json({ success: false });
            }

        }
    );

});


app.post("/login/parent", (req, res) => {

    const { mobile, password } = req.body;

    db.get(
        `SELECT * FROM parents WHERE mobile = ? AND password = ?`,
        [mobile, password],
        (err, row) => {

            if (row) {
                res.json({ success: true, childRoll: row.child_roll });
            } else {
                res.json({ success: false });
            }

        }
    );

});


app.post("/login/faculty", (req, res) => {

    const { mobile, password } = req.body;

    db.get(
        `SELECT * FROM faculty WHERE mobile = ? AND password = ?`,
        [mobile, password],
        (err, row) => {

            if (row) {
                res.json({ success: true, faculty: row.faculty_name });
            } else {
                res.json({ success: false });
            }

        }
    );

});


/* ===============================
   START TRACKING (STORE START TIME)
================================ */

app.post("/startTracking", (req, res) => {

    const { roll, lat, lon } = req.body;

    const time = new Date().toLocaleString();

    db.run(
        `INSERT INTO tracking_logs (roll_number, start_time, start_lat, start_lon)
         VALUES (?, ?, ?, ?)`,
        [roll, time, lat, lon],
        function (err) {

            if (err) {
                res.json({ success: false });
            } else {
                res.json({ success: true });
            }

        }
    );

});


/* ===============================
   STOP TRACKING (STORE STOP TIME)
================================ */

app.post("/stopTracking", (req, res) => {

    const { roll, lat, lon } = req.body;

    const time = new Date().toLocaleString();

    db.run(
        `UPDATE tracking_logs
         SET stop_time = ?, stop_lat = ?, stop_lon = ?
         WHERE roll_number = ?
         AND stop_time IS NULL`,
        [time, lat, lon, roll],
        function (err) {

            if (err) {
                res.json({ success: false });
            } else {
                res.json({ success: true });
            }

        }
    );

});


/* ===============================
   SOCKET CONNECTION
================================ */

io.on("connection", (socket) => {

    console.log("User connected");

    /* STUDENT SENDS LOCATION */

    socket.on("locationUpdate", (data) => {

        const roll = data.roll;
        const lat = data.lat;
        const lon = data.lon;

        studentLocations[roll] = { lat, lon };

        console.log("Location updated for:", roll);

        io.emit("receiveLocation", {
            roll: roll,
            lat: lat,
            lon: lon
        });

    });


    /* PARENT / FACULTY TRACK STUDENT */

    socket.on("trackStudent", (roll) => {

        const location = studentLocations[roll];

        if (location) {

            socket.emit("receiveLocation", {
                roll: roll,
                lat: location.lat,
                lon: location.lon
            });

        } else {

            socket.emit("locationError", {
                message: "Student location not available"
            });

        }

    });


    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

});


/* ===============================
   START SERVER
================================ */

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {

    console.log("✅ Safety Tracker Server Running on port", PORT);

});
