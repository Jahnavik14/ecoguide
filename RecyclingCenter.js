const mongoose = require("mongoose");

const RecyclingCenterSchema = new mongoose.Schema({
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    materials: [String],
});

module.exports = mongoose.model("RecyclingCenter", RecyclingCenterSchema);
