const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, enum: ['patient', 'family', 'doctor'] }
});

module.exports = mongoose.model('User', userSchema);



