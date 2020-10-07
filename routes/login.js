var express = require('express');
var router = express.Router();

const sessionController = require('../controllers/session');


// Routes for the resource /login

// autologout
router.all('*',sessionController.checkLoginExpires);

// login form
router.get('/login', sessionController.new);

// create login session
router.post('/login',
  sessionController.create,
  sessionController.createLoginExpires);


// Authenticate with OAuth 2.0 at Github
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    router.get('/auth/github',
      sessionController.authGitHub);
    router.get('/auth/github/callback',
      sessionController.authGitHubCB,
      sessionController.createLoginExpires);
}

// Authenticate with OAuth 1.0 at Twitter
if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    router.get('/auth/twitter',
      sessionController.authTwitter);
    router.get('/auth/twitter/callback',
      sessionController.authTwitterCB,
      sessionController.createLoginExpires);
}

// Authenticate with OAuth 2.0 at Twitter
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    router.get('/auth/google',
      sessionController.authGoogle);
    router.get('/auth/google/callback',
      sessionController.authGoogleCB,
      sessionController.createLoginExpires);
}

// Authenticate with OAuth 2.0 at Linkedin
if (process.env.LINKEDIN_API_KEY && process.env.LINKEDIN_SECRET_KEY) {
    router.get('/auth/linkedin',
      sessionController.authLinkedin);
    router.get('/auth/linkedin/callback',
      sessionController.authLinkedinCB,
      sessionController.createLoginExpires);
}


// logout - close login session
router.delete('/login', sessionController.destroy);


module.exports = router;
