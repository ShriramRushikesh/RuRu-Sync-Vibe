const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  spotifyId: { type: String, unique: true },
  accessToken: { type: String },
  refreshToken: { type: String },
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // for couple linking
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
