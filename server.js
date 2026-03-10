const express = require("express")
const app = express()
const http = require("http").createServer(app)

const { Server } = require("socket.io")
const io = new Server(http)

app.use(express.static("client"))

let studentLocations = {}

io.on("connection",(socket)=>{

console.log("User Connected")

// student sends GPS location
socket.on("locationUpdate",(data)=>{

let roll = data.roll

studentLocations[roll] = {
lat:data.lat,
lon:data.lon
}

io.emit("receiveLocation",{
roll:roll,
lat:data.lat,
lon:data.lon
})

})

// parent/faculty request student location
socket.on("trackStudent",(roll)=>{

let loc = studentLocations[roll]

if(loc){

socket.emit("receiveLocation",{
roll:roll,
lat:loc.lat,
lon:loc.lon
})

}

})

})

// IMPORTANT for Render
const PORT = process.env.PORT || 3000

http.listen(PORT,()=>{

console.log("✅ Safety Tracker Server Running on port",PORT)

})
