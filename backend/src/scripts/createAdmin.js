// Bootstrap the FIRST AICTE officer. Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from the environment.
// Refuses to run if an officer already exists (use --force to add another).
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
(async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI } = process.env;
  if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) {
    console.error('Set MONGODB_URI, ADMIN_EMAIL and ADMIN_PASSWORD (10+ chars) in the environment.'); process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  if ((await User.exists({ role: 'AICTE_OFFICER' })) && !process.argv.includes('--force')) {
    console.error('An AICTE officer already exists. Use --force to create another.'); process.exit(1);
  }
  await User.create({ name: ADMIN_NAME || 'AICTE Officer', email: ADMIN_EMAIL, role: 'AICTE_OFFICER', passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12), mustChangePassword: true });
  console.log(`Officer created: ${ADMIN_EMAIL} (must change password at first login)`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
