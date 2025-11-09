// Generate Apple Sign-In JWT for Supabase
// Run this script: node generate-apple-jwt.js

const fs = require('fs');
const jwt = require('jsonwebtoken');

// ===== CONFIGURATION =====
// Replace these with your actual values from Apple Developer

const TEAM_ID = 'D52VX5574L'; // e.g., 'ABC123DEFG'
const KEY_ID = 'V29FF4VJ8U';   // e.g., 'XYZ987HIJK'
const SERVICES_ID = 'com.igrigolia.chessmax-mobile.auth';

// Path to your .p8 file (adjust if needed)
const P8_FILE_PATH = "/Users/user/dev/chessmax-mobile/chessmax-mobile/AuthKey_V29FF4VJ8U.p8" // Put your .p8 file in this directory

// ===== END CONFIGURATION =====

try {
  // Read the private key
  const privateKey = fs.readFileSync(P8_FILE_PATH, 'utf8');

  // Create JWT payload
  const payload = {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (86400 * 180), // 180 days expiration
    aud: 'https://appleid.apple.com',
    sub: SERVICES_ID,
  };

  // Sign the JWT
  const token = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: KEY_ID,
  });

  console.log('\n✅ JWT Generated Successfully!\n');
  console.log('Copy the token below and paste it into Supabase "Secret Key" field:\n');
  console.log('─'.repeat(80));
  console.log(token);
  console.log('─'.repeat(80));
  console.log('\nThis token is valid for 180 days.\n');

} catch (error) {
  console.error('❌ Error generating JWT:', error.message);

  if (error.code === 'ENOENT') {
    console.error('\n⚠️  Could not find the .p8 file.');
    console.error('Make sure you have copied your AuthKey_XXXXX.p8 file to this directory');
    console.error('and renamed it to "AuthKey.p8" (or update P8_FILE_PATH in this script)\n');
  }
}
