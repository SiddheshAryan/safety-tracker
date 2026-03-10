const express = require("express");
const app = express();
const http = require("http").createServer(app);

const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.json());
app.use(express.static("client"));

/*
studentData structure:
rollNumber: {
    current: { lat, lon },
    start: { lat, lon },
    stop: { lat, lon } | null,
    path: [[lat, lon], [lat, lon], ...],
    isTracking: true/false
}
*/
let studentData = {};

io.on("connection", (socket) => {
    console.log("User connected");

    // Student sends live location
    socket.on("locationUpdate", (data) => {
        const roll = data.roll;
        const lat = data.lat;
        const lon = data.lon;

        if (!studentData[roll]) {
            studentData[roll] = {
                current: { lat, lon },
                start: { lat, lon },
                stop: null,
                path: [[lat, lon]],
                isTracking: true
            };
        } else {
            if (!studentData[roll].start) {
                studentData[roll].start = { lat, lon };
            }

            studentData[roll].current = { lat, lon };
            studentData[roll].isTracking = true;
            studentData[roll].stop = null;
            studentData[roll].path.push([lat, lon]);
        }

        io.emit("receiveLocation", {
            roll: roll,
            start: studentData[roll].start,
            current: studentData[roll].current,
            stop: studentData[roll].stop,
            path: studentData[roll].path,
            isTracking: studentData[roll].isTracking
        });
    });

    // Student stops tracking
    socket.on("trackingStopped", (roll) => {
        if (studentData[roll] && studentData[roll].current) {
            studentData[roll].stop = {
                lat: studentData[roll].current.lat,
                lon: studentData[roll].current.lon
            };
            studentData[roll].isTracking = false;

            io.emit("receiveLocation", {
                roll: roll,
                start: studentData[roll].start,
                current: studentData[roll].current,
                stop: studentData[roll].stop,
                path: studentData[roll].path,
                isTracking: studentData[roll].isTracking
            });
        }
    });

    // Parent / Faculty requests student data
    socket.on("trackStudent", (roll) => {
        const data = studentData[roll];

        if (data) {
            socket.emit("receiveLocation", {
                roll: roll,
                start: data.start,
                current: data.current,
                stop: data.stop,
                path: data.path,
                isTracking: data.isTracking
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

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log("✅ Safety Tracker Server Running on port", PORT);
});
