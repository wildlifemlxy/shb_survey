const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  '389626720765-5n54fet0fftskf03e89t97gjnu1r7rbt.apps.googleusercontent.com',
  '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',
  'http://localhost' // or 'http://localhost' for redirect
);

const SCOPES = ['https://mail.google.com/'];
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', url);

// After visiting the URL and authorizing, paste the code below:
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question('Enter the code from that page here: ', (code) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Your refresh token is:', token.refresh_token);
    readline.close();
  });
});