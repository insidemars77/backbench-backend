require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const Message = require("./models/Message");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
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

// Home Route
app.get("/", (req, res) => {
    res.send("🚀 Backbench Backend Running");
});

// Create Room
app.post("/create-room", async (req, res) => {

    try {

        const { pin } = req.body;

        const existingRoom =
            await Room.findOne({ pin });

        if (existingRoom) {

            return res.json({
                success: false,
                message: "Room already exists"
            });

        }

        const room =
            await Room.create({ pin });

        console.log("Room Created:", room);

        res.json({
            success: true,
            room
        });

    } catch (err) {

        console.error(err);

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

        console.error(err);

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});

// Get Messages For Room
app.get("/messages/:pin", async (req, res) => {

    try {

        const messages = await Message.find({
            roomPin: req.params.pin
        }).sort({
            createdAt: 1
        });

        res.json(messages);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

});

// Create HTTP Server
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

io.on("connection", (socket) => {

    console.log("🟢 Connected:", socket.id);

    // Join Room
    socket.on("join-room", (pin) => {

        socket.join(pin);

        console.log(
            `${socket.id} joined room ${pin}`
        );

    });

    // Send Message
    socket.on("send-message", async (data) => {

        try {

            await Message.create({
                roomPin: data.room,
                text: data.message
            });

            io.to(data.room).emit(
                "receive-message",
                data
            );

            console.log(
                `📨 Room ${data.room}: ${data.message}`
            );

        } catch (err) {

            console.error(err);

        }

    });

    // Disconnect
    socket.on("disconnect", () => {

        console.log(
            "🔴 Disconnected:",
            socket.id
        );

    });

});

// Start Server
server.listen(PORT, () => {

    console.log(
        `🚀 Server running at http://localhost:${PORT}`
    );

});