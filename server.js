const express = require("express");
const app = express();
const http = require("http").createServer(app);

const { Server } = require("socket.io");
const io = new Server(http);

app.use(express.json());
app.use(express.static("client"));

/*
Store live locations of students
rollNumber → {lat, lon}
*/
let studentLocations = {};


/* SOCKET CONNECTION */

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


    /* PARENT OR FACULTY REQUESTS LOCATION */

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


/* IMPORTANT FOR RENDER */

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log("✅ Safety Tracker Server Running on port", PORT);
});

