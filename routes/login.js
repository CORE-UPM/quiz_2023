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

// logout - close login session
router.delete('/login', sessionController.destroy);


module.exports = router;
