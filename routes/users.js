var express = require('express');
var router = express.Router();

const userController = require('../controllers/user');
const quizController = require("../controllers/quiz");


// Autoload for routes using :userId
router.param('userId', userController.load);

// Routes for the resource /users
router.get('/',                   userController.index);
router.get('/:userId(\\d+)',      userController.show);
router.get('/new',                userController.new);
router.post('/',                  userController.create);
router.get('/:userId(\\d+)/edit', userController.isLocalRequired, userController.edit);
router.put('/:userId(\\d+)',      userController.isLocalRequired, userController.update);
router.delete('/:userId(\\d+)',   userController.destroy);


module.exports = router;
