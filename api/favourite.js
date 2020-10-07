
const {models} = require('../models');

// PUT /users/tokenOwner/favourites/:quizId
exports.add = async (req, res, next) => {

    const tokenUserId = req.load.token.userId;

    try {
        await req.load.quiz.addFan(tokenUserId);
        res.status(200).send({id: req.load.quiz.id, favourite: true});
    } catch (error) {
        next(error);
    }
};


// DELETE /users/tokenOwner/favourites/:quizId
exports.del = async (req, res, next) => {

    const tokenUserId = req.load.token.userId;

    try {
        await req.load.quiz.removeFan(tokenUserId);
        res.status(200).send({id: req.load.quiz.id, favourite: false});
    } catch (error) {
        next(error);
    }
};
