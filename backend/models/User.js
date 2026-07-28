const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true // No two users can register with the same email!
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['tenant', 'landlord'], // This restricts the role to ONLY these two words
    default: 'tenant' 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);