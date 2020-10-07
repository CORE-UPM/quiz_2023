var express = require('express');
var router = express.Router();

const userController = require('../controllers/user');
const sessionController = require("../controllers/session");


// Autoload for routes using :userId
router.param('userId', userController.load);

// Routes for the resource /users
router.get('/',
  sessionController.loginRequired,
  userController.index);
router.get('/:userId(\\d+)',
  sessionController.loginRequired,
  userController.show);
router.get('/new',
  userController.new);
router.post('/',
  userController.create);
router.get('/:userId(\\d+)/edit',
  sessionController.loginRequired,
  userController.isLocalRequired,
  sessionController.adminOrMyselfRequired,
  userController.edit);
router.put('/:userId(\\d+)',
  sessionController.loginRequired,
  userController.isLocalRequired,
  sessionController.adminOrMyselfRequired,
  userController.update);
router.delete('/:userId(\\d+)',
  sessionController.loginRequired,
  sessionController.adminOrMyselfRequired,
  userController.destroy);


module.exports = router;
