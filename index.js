require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin'); // Ensure you have Firebase Admin SDK set up
const User = require('./models/user');

const app = express();
const PORT = process.env.PORT || 8800;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory

// home page 
app.get('/', (req, res) => {
    console.log('Serving index.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('*', (req, res) => {
    res.status(404).send('Page not found');
});

// MongoDB Atlas connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('Failed to connect to MongoDB Atlas', err));

// Initialize Firebase Admin SDK
const serviceAccount = require('./config/serviceAccountKey.json'); // Update with your Firebase service account path
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Route: Send OTP
app.post('/api/send-otp', async (req, res) => {
    const { name, email, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
        return res.status(400).json({ msg: 'Name and phone number are required.' });
    }

    try {
        // Check if user already exists
        let user = await User.findOne({ phoneNumber });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        let users = await User.findOne({ email });
        if (users) {
            return res.status(400).json({ msg: 'Email already exists' });
        }
        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save user with OTP (password is null for now)
        user = new User({
            name,
            email,
            phoneNumber,
            otp
        });

        await user.save();

        console.log(`Sending OTP ${otp} to phone number ${phoneNumber}`);

        // we should integrate with an SMS service like Twilio to send the OTP
        // Uncomment and configure if using Twilio
        /*
        const accountSid = 'your_twilio_account_sid';
        const authToken = 'your_twilio_auth_token';
        const client = require('twilio')(accountSid, authToken);

        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: '+your_twilio_phone_number',
            to: phoneNumber
        });
        */

        res.status(200).json({ msg: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ msg: 'Failed to send OTP' });
    }
});

// Route: Verify OTP and Create Password
app.post('/api/verify-otp', async (req, res) => {
    const { phoneNumber, otp, password } = req.body;

    if (!phoneNumber || !otp || !password) {
        return res.status(400).json({ msg: 'Phone number, OTP, and password are required.' });
    }

    try {
        // Find user with phone number and OTP
        let user = await User.findOne({ phoneNumber, otp });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid OTP or phone number.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.otp = null; // Clear OTP after successful verification

        await user.save();

        // Generate JWT token
        const payload = { userId: user._id };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ msg: 'Password created successfully. You can now log in.', token });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ msg: 'OTP verification failed' });
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
        return res.status(400).json({ msg: 'Phone number and password are required.' });
    }

    try {
        // Find the user by phone number
        const user = await User.findOne({ phoneNumber });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid phone number or password.' });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid phone number or password.' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        // Send success response along with the token
        res.status(200).json({ msg: 'Login successful!', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ msg: 'Server error during login' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
