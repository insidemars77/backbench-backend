const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    pin: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Room", roomSchema);