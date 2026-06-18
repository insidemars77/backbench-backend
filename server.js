const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());                    // Allow frontend to connect
app.use(express.json());            // Parse JSON body

// Test route
app.get('/', (req, res) => {
    res.send('✅ Backend is running on port 8080');
});

// Your create-room route
app.post('/create-room', (req, res) => {
    const { pin } = req.body;
    
    console.log("🔥 Received PIN from frontend:", pin);
    console.log("Full request body:", req.body);
    
    // Send response back to frontend
    res.json({
        success: true,
        message: "Room created successfully",
        pin: pin,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});