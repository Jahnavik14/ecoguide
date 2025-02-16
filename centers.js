const express = require("express");
const RecyclingCenter = require("../models/RecyclingCenter");
const router = express.Router();

// Fetch all centers
router.get("/", async (req, res) => {
    try {
        const centers = await RecyclingCenter.find();
        res.json(centers);
    } catch (error) {
        res.status(500).json({ error: "Error fetching centers" });
    }
});

// Add a new center (Optional)
router.post("/", async (req, res) => {
    try {
        const newCenter = new RecyclingCenter(req.body);
        await newCenter.save();
        res.status(201).json(newCenter);
    } catch (error) {
        res.status(500).json({ error: "Error adding center" });
    }
});

module.exports = router;
