const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: { type: String, enum: ['patient','doctor','admin'], default: 'patient' }
});
module.exports = mongoose.model('User', UserSchema);