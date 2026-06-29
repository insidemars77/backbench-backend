const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({

    roomPin: String,

    category: String,

    fileName: String,

    supabasePath: String,

    publicUrl: String,

    mimeType: String,

    size: Number

}, {
    timestamps: true
});

module.exports = mongoose.model("File", fileSchema);