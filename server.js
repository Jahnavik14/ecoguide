const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected');
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Mock data for recycling centers
const centers = [
    {
        id: 1,
        name: 'City Recycling Center',
        address: '123 Green Street',
        lat: -34.397,
        lng: 150.644,
        materials: ['Paper', 'Plastic', 'Glass', 'Metal'],
        hours: '8AM - 6PM',
        rating: 4.5,
        reviews: 128
    },
    {
        id: 2,
        name: 'EcoHub Recycling',
        address: '456 Earth Avenue',
        lat: -34.395,
        lng: 150.642,
        materials: ['Electronics', 'Batteries', 'Paper', 'Plastic'],
        hours: '9AM - 5PM',
        rating: 4.8,
        reviews: 89
    }
];

// Mock data for leaderboard
const leaderboard = [
    { name: 'Sarah J.', points: 1250, streak: 7, badges: ['Eco Warrior', 'Plastic Free'] },
    { name: 'Mike T.', points: 1100, streak: 5, badges: ['Recycling Pro'] },
    { name: 'Emma R.', points: 950, streak: 3, badges: ['Green Starter'] },
    { name: 'John D.', points: 800, streak: 4, badges: ['Water Saver'] },
    { name: 'Lisa M.', points: 750, streak: 2, badges: ['Energy Efficient'] }
];

// Mock waste data
let wasteData = {
    recyclables: [12, 19, 15, 25, 22, 30],
    nonRecyclables: [8, 15, 12, 10, 7, 5]
};

// Routes
app.get('/api/centers', (req, res) => {
    res.json(centers);
});

app.get('/api/leaderboard', (req, res) => {
    res.json(leaderboard);
});

app.post('/api/waste/log', (req, res) => {
    const { type, quantity } = req.body;
    
    // Update mock waste data
    if (type === 'recyclable') {
        wasteData.recyclables.push(parseFloat(quantity));
        wasteData.recyclables.shift();
    } else {
        wasteData.nonRecyclables.push(parseFloat(quantity));
        wasteData.nonRecyclables.shift();
    }
    
    // Emit update to all connected clients
    io.emit('wasteUpdate', wasteData);
    
    console.log('Logged waste:', { type, quantity });
    res.status(200).json({ message: 'Waste logged successfully' });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});