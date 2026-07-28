const mongoose = require('mongoose');

// Custom validator function to ensure maximum 5 media files
function mediaLimit(val) {
    return val.length <= 5;
}

const listingSchema = new mongoose.Schema({
    // Basic Details
    propertyName: { type: String, required: true },
    ownerName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    whatsappNumber: { type: String },
    
    // Location
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    landmark: { type: String },
    
    // Property Specifics
    roomType: { 
        type: String, 
        required: true,
        enum: ['Single Occupancy', 'Double Sharing', 'Triple Sharing', 'Entire Flat']
    },
    pgFor: { 
        type: String, 
        required: true,
        enum: ['Boys', 'Girls', 'Co-ed']
    },
    
    // Pricing & Availability
    monthlyRent: { type: Number, required: true },
    securityDeposit: { type: Number },
    availableFrom: { type: Date, required: true },
    roomsAvailable: { type: Number, required: true, default: 1 },
    
    // Features & Rules
    amenities: {
        type: [String], // Defines this as an array of strings
        enum: ['Wi-Fi', 'AC', 'Geyser', 'Meals (2)', 'Meals (3)', 'Laundry', 'TV', 'Parking', 'CCTV', 'Power Backup', 'Housekeeping', 'Drinking Water']
    },
    description: { type: String },
    
    // Media (Storing the URLs of uploaded files)
    mediaUrls: {
        type: [String],
        validate: [mediaLimit, 'You can only upload a maximum of 5 images or videos']
    },
    // ... your other fields (monthlyRent, amenities, etc.)
    
    isApproved: {
        type: Boolean,
        default: false // Every new listing starts as unapproved
    }
}, { 
    timestamps: true 
});

module.exports = mongoose.model('Listing', listingSchema);