var express = require('express');
var router = express.Router();

const multer = require('multer');
const storage = multer.memoryStorage()
const upload = multer({
    storage: storage,
    limits: {fileSize: 20 * 1024 * 1024}});

const userController = require('../controllers/user');
const sessionController = require("../controllers/session");
const quizController = require("../controllers/quiz");
const favouriteController = require("../controllers/favourite");


// Autoload for routes using :userId
router.param('userId', userController.load);
router.param('quizId', quizController.load);

// Routes for the resource /users
router.get('/',
  sessionController.loginRequired,
  userController.index);
router.get('/:userId(\\d+)',
  sessionController.loginRequired,
  userController.show);

if (!!process.env.QUIZ_OPEN_REGISTER) {
    router.get('/new',
      userController.new);
    router.post('/',
      upload.single('photo'),
      userController.create);
} else {
    router.get('/new',
      sessionController.loginRequired,
      sessionController.adminRequired,
      userController.new);
    router.post('/',
      sessionController.loginRequired,
      sessionController.adminRequired,
      upload.single('photo'),
      userController.create);
}

router.get('/:userId(\\d+)/edit',
  sessionController.loginRequired,
  userController.isLocalRequired,
  sessionController.adminOrMyselfRequired,
  userController.edit);
router.put('/:userId(\\d+)',
  sessionController.loginRequired,
  userController.isLocalRequired,
  sessionController.adminOrMyselfRequired,
  upload.single('photo'),
  userController.update);
router.delete('/:userId(\\d+)',
  sessionController.loginRequired,
  sessionController.adminOrMyselfRequired,
  userController.destroy);

// Route to user photo
router.get('/:userId(\\d+)/photo',
  userController.photo);


router.put('/:userId(\\d+)/token',
  sessionController.loginRequired,
  sessionController.adminOrMyselfRequired,
  userController.createToken);   // generar un nuevo token

router.get('/:userId(\\d+)/quizzes',
  sessionController.loginRequired,
  quizController.index);


// Routes for the resource favourites of a user
router.put('/:userId(\\d+)/favourites/:quizId(\\d+)',
  sessionController.loginRequired,
  sessionController.adminOrMyselfRequired,
  favouriteController.add);
router.delete('/:userId(\\d+)/favourites/:quizId(\\d+)',
  sessionController.loginRequired,
  sessionController.adminOrMyselfRequired,
  favouriteController.del);

module.exports = router;
