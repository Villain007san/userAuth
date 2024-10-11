const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const User = require('./models/user'); // User model defined in models/User.js
require('dotenv').config();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8800;

// Middleware
app.use(bodyParser.json());
app.use(cors());



// MongoDB Atlas connection string
const DB_URI = "mongodb+srv://sandipkumar9334:uwYcKUwcbUsPSRTw@cluster0.b6kcl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB Atlas
mongoose.connect(DB_URI)
.then(() => {
    console.log('Connected to MongoDB Atlas');
    
    // Start the server after the DB connection is successful
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
})
.catch(err => {
    console.error('Failed to connect to MongoDB Atlas', err);
});



// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));


// Signup Route
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            password,
        });

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Generate JWT token
        const payload = { user: { id: user.id } };
        jwt.sign(payload, 'yourJWTSecret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Generate JWT token
        const payload = { user: { id: user.id } };
        jwt.sign(payload, 'yourJWTSecret', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



