var express = require('express');
var router = express.Router();

const quizController = require('../controllers/quiz');


// Autoload for routes using :quizId
router.param('quizId', quizController.load);


// Routes for the resource /quizzes
router.get('/',                    quizController.index);
router.get('/:quizId(\\d+)',       quizController.show);
router.get('/new',                 quizController.new);
router.post('/',                   quizController.create);
router.get('/:quizId(\\d+)/edit',  quizController.edit);
router.put('/:quizId(\\d+)',       quizController.update);
router.delete('/:quizId(\\d+)',    quizController.destroy);

router.get('/:quizId(\\d+)/play',  quizController.play);
router.get('/:quizId(\\d+)/check', quizController.check);


module.exports = router;
