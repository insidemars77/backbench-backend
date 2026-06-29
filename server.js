require("dotenv").config();

const supabase = require("./supabase");
const File = require("./models/File");
const multer = require("multer");
const Category = require("./models/Category");
const Room = require("./models/Room");
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

const upload = multer({
    storage: multer.memoryStorage()
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("✅ Mongo Connected");
})
.catch((err) => {
    console.error("❌ Mongo Error:", err);
});

// Home Route
app.get("/", (req, res) => {
    res.send("🚀 Backbench Backend Running");
});

// Create Room
app.post("/create-room", async (req, res) => {

    console.log("🔥 CREATE ROOM ROUTE HIT");

    try {

        const { pin } = req.body;

        console.log("PIN:", pin);

        const room = await Room.create({
            pin
        });

        console.log("ROOM SAVED:", room);

        res.json({
            success: true,
            room
        });

    } catch (err) {

        console.log("CREATE ROOM ERROR:");
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

//create category
app.post("/create-category", async (req, res) => {

    try {

        const { roomPin, name } = req.body;

        if (!roomPin || !name) {
            return res.json({
                success: false,
                message: "Missing data"
            });
        }

        const exists = await Category.findOne({
            roomPin,
            name
        });

        if (exists) {
            return res.json({
                success: false,
                message: "Category already exists"
            });
        }

        await Category.create({
            roomPin,
            name
        });

        res.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        res.json({
            success: false,
            message: "Server Error"
        });

    }

});

//get category
app.get("/categories/:roomPin", async (req, res) => {

    try {

        const categories = await Category.find({
            roomPin: req.params.roomPin
        }).sort({
            createdAt: 1
        });

        res.json(categories);

    } catch (err) {

        console.log(err);

        res.json([]);

    }

});

app.post("/upload", upload.single("file"), async (req, res) => {

    const file = req.file;

    const fileName = Date.now() + "-" + file.originalname;

    const { data, error } = await supabase.storage
        .from("backbench")
        .upload(fileName, file.buffer, {
            contentType: file.mimetype
        });

    if (error) {
        return res.status(500).json(error);
    }

    await File.create({
        roomPin: req.body.roomPin,
        category: req.body.category,
        fileName: file.originalname,
        supabasePath: data.path,
        mimeType: file.mimetype,
        size: file.size
    });

    res.json({
        success: true
    });

});

app.get("/files/:roomPin/:category", async (req, res) => {

    console.log("FILES ROUTE HIT");
    console.log(req.params);

    try {

        const files = await File.find({

            roomPin: req.params.roomPin,
            category: req.params.category

        }).sort({

            createdAt: -1

        });

        res.json(files);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });

    }

});

app.get("/download/:id", async (req, res) => {

    const file = await File.findById(req.params.id);

    if (!file) {
        return res.status(404).json({
            success:false
        });
    }

    const { data } = supabase.storage
        .from("backbench")
        .getPublicUrl(file.supabasePath);

    res.json({
        url: data.publicUrl
    });

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