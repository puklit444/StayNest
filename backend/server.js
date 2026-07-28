const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const User = require('./models/User'); // Brings in our new User database blueprint
const app = express();
app.use(express.json());
const Listing = require('./models/Listing');
const BookingRequest = require('./models/BookingRequest');
const upload = require('./cloudinary');
// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.log('❌ MongoDB Connection Error: ', err));

// Test Route
app.get('/', (req, res) => {
  res.send('StayNest API is running 🚀');
});
// POST Route: Create a new PG Listing
// POST Route: Create a new PG Listing WITH IMAGES
// upload.array('photos', 5) means we accept up to 5 images in a field called 'photos'
// ------------------------------------------------------
// CREATE LISTING (With Cloudinary Error Catching)
// ------------------------------------------------------
app.post('/api/listings', (req, res, next) => {
    
    // 1. We run the "Bouncer" manually so we can catch its errors
    const uploadBouncer = upload.array('photos', 5);
    
    uploadBouncer(req, res, function (err) {
        if (err) {
            console.error("🚨 CLOUDINARY/MULTER ERROR:", err);
            // Send JSON back so the frontend doesn't choke on HTML!
            return res.status(500).json({ message: "Photo upload failed", error: err.message });
        }
        // If photos upload successfully, move to step 2!
        next();
    });

}, async (req, res) => {
    try {
        // 2. Map through the files uploaded to Cloudinary
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        // 3. Combine the text data with the new Image URLs
        const newListing = new Listing({
            ...req.body,
            mediaUrls: imageUrls
        });

        const savedListing = await newListing.save();

        res.status(201).json({
            message: "Listing created successfully!",
            listing: savedListing
        });
    } catch (error) {
        // Using a comma instead of a '+' stops the [object Object] issue!
        console.error("🚨 DATABASE ERROR:", error); 
        res.status(400).json({
            message: "Failed to create listing",
            error: error.message
        });
    }
});
// GET Route: Fetch ALL APPROVED PG Listings
// ------------------------------------------------------
// GET Route: Fetch Approved PG Listings (With Search!)
// ------------------------------------------------------
app.get('/api/listings', async (req, res) => {
    console.log("🚪 1. KNOCK KNOCK! Frontend just called the backend.");
    console.log("🔍 2. The search word they typed is:", req.query.search);

    try {
        const { search } = req.query;
        let dbQuery = { isApproved: { $ne: false } };

        if (search) {
            dbQuery.$or = [
                { city: { $regex: search, $options: 'i' } },
                { propertyName: { $regex: search, $options: 'i' } }
            ];
        }

        console.log("⚙️ 3. Database query is built. Searching MongoDB now...");
        const listings = await Listing.find(dbQuery).sort({ createdAt: -1 });
        
        console.log("✅ 4. SUCCESS! Found", listings.length, "properties.");
        res.status(200).json(listings);
    } catch (error) {
        console.log("🚨 5. CRASH! Here is the error:", error);
        res.status(500).json({ message: "Failed to fetch listings", error: error.message });
    }
});
// GET Route: Fetch a SINGLE PG Listing by ID (ADD THIS HERE)
app.get('/api/listings/:id', async (req, res) => {
    try {
        // req.params.id grabs the ID from the URL
        const listing = await Listing.findById(req.params.id);
        
        if (!listing) {
            return res.status(404).json({ message: "Listing not found" });
        }
        
        res.status(200).json(listing);
    } catch (error) {
        res.status(500).json({ message: "Error fetching listing", error: error.message });
    }
});
// ------------------------------------------------------
// BOOKING ROUTE: Submit a new booking request (Lead)
// ------------------------------------------------------
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new BookingRequest({
            listingId: req.body.listingId,
            tenantName: req.body.tenantName,
            tenantPhone: req.body.tenantPhone
        });
        
        const savedBooking = await newBooking.save();
        res.status(201).json({ 
            message: "Booking request sent successfully!", 
            booking: savedBooking 
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Failed to send booking request", 
            error: error.message 
        });
    }
});
// ------------------------------------------------------
// ADMIN ROUTE 1: Fetch all PENDING (Unapproved) Listings
// ------------------------------------------------------
app.get('/api/admin/listings/pending', async (req, res) => {
    try {
        // Notice we are looking for { isApproved: false } this time!
        const pendingListings = await Listing.find({ isApproved: false }).sort({ createdAt: -1 }); 
        res.status(200).json(pendingListings);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch pending listings", error: error.message });
    }
});
// ------------------------------------------------------
// ADMIN ROUTE 3: Fetch all Booking Leads
// ------------------------------------------------------
app.get('/api/admin/bookings', async (req, res) => {
    try {
        // We use .populate() to get the actual PG name instead of just an ID!
        const leads = await BookingRequest.find()
            .populate('listingId', 'propertyName city ownerName')
            .sort({ createdAt: -1 }); // Newest leads at the top
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch leads", error: error.message });
    }
});

// ------------------------------------------------------
// ADMIN ROUTE 2: Approve a Listing (Flip the switch)
// ------------------------------------------------------
app.patch('/api/admin/listings/:id/approve', async (req, res) => {
    try {
        // Find the listing by ID and change isApproved to true
        const updatedListing = await Listing.findByIdAndUpdate(
            req.params.id, 
            { isApproved: true }, 
            { returnDocument: 'after' }
        );
        
        if (!updatedListing) {
            return res.status(404).json({ message: "Listing not found" });
        }
        
        res.status(200).json({ message: "Listing approved successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Error approving listing", error: error.message });
    }
});
// ------------------------------------------------------
// AUTH ROUTE 1: Register a new User
// ------------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // 1. Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use!" });
        }

        // 2. Hash the password (Security!)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Save the new user to the database
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role
        });
        await newUser.save();

        res.status(201).json({ message: "Account created successfully! You can now log in." });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
});
// ------------------------------------------------------
// AI ROUTE: Magic Description Generator
// ------------------------------------------------------
app.post('/api/ai/generate-description', async (req, res) => {
    try {
        const { keywords } = req.body;

        // We use Gemini 1.5 Flash because it is lightning fast
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // This is the "Prompt Engineering" part!
        const prompt = `Write a professional, warm, and highly engaging real estate listing description for a PG/rental room based on these keywords: ${keywords}. Keep it under 4 sentences. Do not use hashtags.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ description: text });
    } catch (error) {
        console.error("🚨 AI Generation Error:", error);
        res.status(500).json({ message: "Failed to generate description", error: error.message });
    }
});

// ------------------------------------------------------
// AUTH ROUTE 2: Login Existing User
// ------------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user in the database
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 2. Check if the password matches the scrambled password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // 3. Create a digital ID card (JWT Token)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET || 'supersecretstaynestkey', 
            { expiresIn: '1d' } // Token expires in 1 day
        );

        res.status(200).json({
            message: "Login successful!",
            token,
            user: { name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Login failed", error: error.message });
    }
});
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});