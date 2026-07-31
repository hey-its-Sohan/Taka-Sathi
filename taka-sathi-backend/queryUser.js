require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connected');
    const users = await User.find({}).select('+voicePrint.audioData');
    console.log('Found users:', users.length);
    for (const u of users) {
      console.log(`Phone: ${u.phoneNumber}, voiceEnrolled: ${u.voiceEnrolled}, audioDataExists: ${!!u.voicePrint?.audioData}, staffProfilesCount: ${u.voiceProfiles?.length || 0}`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

check();
