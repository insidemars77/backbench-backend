require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ Mongo Connected");
})
.catch((err) => {
    console.error("❌ Mongo Error:", err);
});

// Room Schema
const roomSchema = new mongoose.Schema({
    pin: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Room = mongoose.model("Room", roomSchema);

// Home
app.get("/", (req, res) => {
    res.send("🚀 Backbench Backend Running");
});

// Create Room
app.post("/create-room", async (req, res) => {

    try {

        const { pin } = req.body;

        const existingRoom = await Room.findOne({ pin });

        if (existingRoom) {
            return res.status(400).json({
                success: false,
                message: "Room already exists"
            });
        }

        const room = await Room.create({ pin });

        res.json({
            success: true,
            message: "Room created",
            room
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// Join Room
app.post("/join-room", async (req, res) => {

    try {

        const { pin } = req.body;

        const room = await Room.findOne({ pin });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        res.json({
            success: true,
            message: "Room found",
            room
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// Socket Server
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {

    console.log("🟢 Connected:", socket.id);

    socket.on("join-room", (pin) => {

        socket.join(pin);

        console.log(
            `${socket.id} joined room ${pin}`
        );

    });

    socket.on("send-message", (data) => {

        console.log(
            `📨 Room ${data.room}: ${data.message}`
        );

        io.to(data.room).emit(
            "receive-message",
            data
        );

    });

    socket.on("disconnect", () => {

        console.log(
            "🔴 Disconnected:",
            socket.id
        );

    });

});

server.listen(PORT, () => {

    console.log(
        `🚀 Server running at http://localhost:${PORT}`
    );

});