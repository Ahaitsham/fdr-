const { Schema, model } = require('mongoose');
module.exports = model('Institution', new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  contactPerson: { type: String, trim: true },
  phone: { type: String, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  latitude: { type: Number, min: -90, max: 90 },
  longitude: { type: Number, min: -180, max: 180 },
  active: { type: Boolean, default: true },
}, { timestamps: true }));
