const { verifyAccessToken } = require('C:/Users/Robert_D_AZ_1/Documents/LifeHub/shared/auth/dist/jwt.js');
require('dotenv').config({ path: 'C:/Users/Robert_D_AZ_1/Documents/LifeHub/.env' });
const http = require('http');

// Get a fresh token from login
const postData = JSON.stringify({ email: 'admin@lifehub.local', password: 'admin12345' });
const options = {
  hostname: 'localhost', port: 3007, path: '/api/v1/auth/login',
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData)}
};
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', async () => {
    const token = JSON.parse(data).accessToken;
    console.log('Token:', token.substring(0, 30) + '...');
    try {
      const payload = await verifyAccessToken(token);
      console.log('Verify OK:', payload.sub);
    } catch (e) {
      console.log('Verify FAILED:', e.message);
    }
  });
});
req.write(postData);
req.end();
