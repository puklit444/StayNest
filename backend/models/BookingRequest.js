const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    // This links the request to the specific PG Listing
    listingId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Listing', 
        required: true 
    },
    tenantName: { 
        type: String, 
        required: true 
    },
    tenantPhone: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        default: 'Pending' // Can later be changed to 'Contacted' or 'Confirmed'
    }
}, { timestamps: true });

module.exports = mongoose.model('BookingRequest', bookingSchema);