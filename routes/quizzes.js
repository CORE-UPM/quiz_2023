var express = require('express');
var router = express.Router();

const multer = require('multer');
const storage = multer.memoryStorage()
const upload = multer({
    storage: storage,
    limits: {fileSize: 20 * 1024 * 1024}});

const quizController = require('../controllers/quiz');
const sessionController = require("../controllers/session");


// Autoload for routes using :quizId
router.param('quizId', quizController.load);


// Routes for the resource /quizzes
router.get('/',
  quizController.index);
router.get('/:quizId(\\d+)',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.show);
router.get('/new',
  sessionController.loginRequired,
  quizController.new);
router.post('/',
  sessionController.loginRequired,
  upload.single('image'),
  quizController.create);
router.get('/:quizId(\\d+)/edit',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.edit);
router.put('/:quizId(\\d+)',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  upload.single('image'),
  quizController.update);
router.delete('/:quizId(\\d+)',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.destroy);

router.get('/:quizId(\\d+)/play',  quizController.play);
router.get('/:quizId(\\d+)/check', quizController.check);

// Route to quiz attachment
router.get('/:quizId(\\d+)/attachment',
  quizController.attachment);


module.exports = router;
