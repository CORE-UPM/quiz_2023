var express = require('express');
var router = express.Router();

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
  quizController.create);
router.get('/:quizId(\\d+)/edit',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.edit);
router.put('/:quizId(\\d+)',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.update);
router.delete('/:quizId(\\d+)',
  sessionController.loginRequired,
  quizController.adminOrAuthorRequired,
  quizController.destroy);

router.get('/:quizId(\\d+)/play',  quizController.play);
router.get('/:quizId(\\d+)/check', quizController.check);


module.exports = router;
