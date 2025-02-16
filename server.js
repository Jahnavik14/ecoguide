const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser'); // For parsing request bodies
const socketIO = require('socket.io');
const http = require('http'); // Required for Socket.io

require('dotenv').config();

const app = express();
const server = http.createServer(app); // Create an HTTP server
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:5173", // or your frontend URL
        methods: ["GET", "POST"]
    }
}); // Initialize Socket.io

app.use(cors({
    origin: "http://localhost:5173" // or your frontend URL
}));
app.use(express.json());
app.use(bodyParser.json()); // important!

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err));

// Define Schemas
const RecyclingCenterSchema = new mongoose.Schema({
    name: String,
    address: String,
    lat: Number,
    lng: Number,
    materials: [String],
});

const WasteLogSchema = new mongoose.Schema({
    type: String,
    quantity: Number,
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Add user reference later
    date: { type: Date, default: Date.now } // Add a date field
});

const UserSchema = new mongoose.Schema({
    name: String,
    // ... other user fields
});

// Define Models
const RecyclingCenter = mongoose.model('RecyclingCenter', RecyclingCenterSchema);
const WasteLog = mongoose.model('WasteLog', WasteLogSchema);
const User = mongoose.model('User', UserSchema); // If you have a User model


// API Endpoints

app.get('/api/centers', async (req, res) => {
    try {
        const centers = await RecyclingCenter.find();
        res.json(centers);
    } catch (error) {
        console.error('Error fetching centers:', error);
        res.status(500).json({ error: 'Failed to fetch centers' });
    }
});

app.post('/api/waste/log', async (req, res) => {
    try {
        const { type, quantity } = req.body;

        // You'll need to get the actual user ID when you implement authentication
        const userId = "6576882209772a1738d17978"; // Example: Replace with actual user ID

        const newLog = new WasteLog({ type, quantity, user: userId }); // Associate with user
        await newLog.save();

        // Emit Socket.io event for waste update
        io.emit('wasteUpdate', await getWasteData()); // Send updated data

        // Check and emit achievements (replace with your logic)
        const achievements = await checkAchievements(userId);
        if (achievements.length > 0) {
            io.emit('achievementUnlocked', achievements);
        }

        res.status(201).json({ message: 'Waste logged successfully', log: newLog }); // Send the created log
    } catch (error) {
        console.error('Error logging waste:', error);
        res.status(500).json({ error: 'Failed to log waste' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        // Implement leaderboard logic (e.g., aggregate waste by user)
        const leaderboard = await getLeaderboardData(); // Function to fetch and process leaderboard data
        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});


// Helper functions (move these to separate modules for larger apps)

async function getWasteData() {
    // Implement logic to aggregate waste data for the chart
    const recyclables = await WasteLog.aggregate([
        { $match: { type: 'recyclable' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    const nonRecyclables = await WasteLog.aggregate([
        { $match: { type: 'non-recyclable' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]);

    return {
        recyclables: recyclables.length > 0 ? recyclables[0].total : 0,
        nonRecyclables: nonRecyclables.length > 0 ? nonRecyclables[0].total : 0,
    };
}


async function getLeaderboardData() {
    // Example: Aggregate total waste by user
    const leaderboard = await WasteLog.aggregate([
        {
            $group: {
                _id: '$user',
                totalWaste: { $sum: '$quantity' }
            }
        },
        {
            $lookup: { // Assuming you have a User model
                from: 'users', // Collection name for users
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' }, // Deconstruct the user array
        { $sort: { totalWaste: -1 } }, // Sort by total waste descending
        { $limit: 10 } // Limit to top 10
    ]);

    // Format the leaderboard data
    return leaderboard.map(item => ({
        name: item.user.name, // Access user's name
        points: item.totalWaste // Or whatever you want to call "points"
    }));
}


async function checkAchievements(userId) {
    // Implement your achievement checking logic here
    // Example (replace with your actual achievements)
    const achievements = [];
    const logs = await WasteLog.find({ user: userId });

    if (logs.length >= 1) {
        achievements.push({ title: 'First Log', description: 'Logged your first waste!' });
    }

    // Check if user has logged recyclable waste
    const hasRecyclable = logs.some(log => log.type === 'recyclable')
    if(hasRecyclable) {
        achievements.push({ title: 'Recycler', description: 'Logged recyclable waste!' });
    }

    return achievements;
}


// Socket.io Connection
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Initial data for charts and leaderboard
    (async () => {
        socket.emit('wasteUpdate', await getWasteData());
        socket.emit('leaderboardUpdate', await getLeaderboardData());
    })();

    // You can add more socket event listeners here if needed
});


server.listen(PORT, () => console.log(`Server running on port ${PORT}`));