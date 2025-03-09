// app.js - Backend server for the Comrade Organization platform

const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Member schema and model
const memberSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    dob: { type: Date, required: true },
    membershipType: { type: String, required: true },
    skills: { type: String },
    interests: { type: Array },
    memberId: { type: String, unique: true },
    registrationDate: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail'
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Generate unique member ID
function generateMemberId() {
    const prefix = 'COM';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
}

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        // Create member object with unique ID
        const memberId = generateMemberId();
        const newMember = new Member({
            ...req.body,
            memberId
        });

        // Save member to database
        await newMember.save();

        // Send confirmation email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: newMember.email,
            subject: 'Welcome to Comrade Organization',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                    <h2 style="color: #d32f2f; text-align: center;">Comrade Organization Membership Confirmation</h2>
                    <p>Dear ${newMember.fullName},</p>
                    <p>Thank you for joining the Comrade Organization. Your registration has been successfully processed.</p>
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Membership Details:</h3>
                        <p><strong>Member ID:</strong> ${memberId}</p>
                        <p><strong>Membership Type:</strong> ${newMember.membershipType}</p>
                        <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    <p>Please save this email for your records. You can access your member profile and benefits by logging in to our portal with your email and member ID.</p>
                    <p>If you have any questions, please contact our support team.</p>
                    <p>In solidarity,<br>Comrade Organization Team</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // Send admin notification
        const adminMailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: 'New Member Registration',
            html: `
                <h3>New Member Registration</h3>
                <p><strong>Name:</strong> ${newMember.fullName}</p>
                <p><strong>Email:</strong> ${newMember.email}</p>
                <p><strong>Member ID:</strong> ${memberId}</p>
                <p><strong>Membership Type:</strong> ${newMember.membershipType}</p>
                <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
            `
        };

        await transporter.sendMail(adminMailOptions);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            memberId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Get member details endpoint (protected in production)
app.get('/api/member/:id', async (req, res) => {
    try {
        const member = await Member.findOne({ memberId: req.params.id });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found' });
        }
        res.status(200).json({ success: true, member });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});