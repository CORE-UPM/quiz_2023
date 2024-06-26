const createError = require('http-errors');
const {models} = require('../models');
const Sequelize = require('sequelize');

const addPagenoToUrl = require('../helpers/paginate').addPagenoToUrl;

//-----------------------------------------------------------


// Autoload el quiz asociado a :quizId.
// Includes author, fans and attachment.
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
            include: [
                {
                    model: models.Attachment,
                    as: 'attachment',
                    attributes: ['mime']
                },
                {
                    model: models.User,
                    as: 'author',
                    attributes: ['id', 'isAdmin', 'username', 'accountTypeId', 'profileId', 'profileName'],
                    include: [{
                        model: models.Attachment,
                        as: 'photo',
                        attributes: ['mime']
                    }]
                },
                {
                    model: models.User,
                    as: "fans",
                    attributes: ['id'],
                    through: {attributes: []},
                    where: {id: req.load.token.userId},
                    required: false
                }]
        });

        if (quiz) {
            if (req.load.token) {
                quiz.favourite = quiz.fans.length > 0;
            }
            req.load = {...req.load, quiz};
            next();
        } else {
            throw createError(404, 'There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};


// Autoload el quiz asociado a :quizId
// Without includes.
exports.load_woi = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']}
        });
        if (quiz) {
            req.load = {...req.load, quiz};
            next();
        } else {
            throw createError(404, 'There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------

// GET /api/quizzes
exports.index = async (req, res, next) => {

    let countOptions = {
        where: {},
        include: []
    };

    // Search quizzes which question field contains the value given in the query.
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g, "%") + "%";

        countOptions.where.question = {[Sequelize.Op.like]: search_like};
    }

    // User quizzes: If there exists "req.load.user", then only the quizzes of that user are shown
    if (req.load && req.load.user) {
        countOptions.where.authorId = req.load.user.id;
    }

    // Filter my favourite quizzes:
    // Lists all the quizzes or my favourite quizzes.
    const searchfavourites = !!req.query.searchfavourites;
    countOptions.include.push({
        model: models.User,
        as: "fans",
        attributes: ['id'],
        where: {id: req.load.token.userId},
        required: searchfavourites,
        through: {attributes: []}
    });

    // Pagination:

    const items_per_page = Number(req.query.pagelength) || 10;

    // The page to show is given in the query
    const pageno = parseInt(req.query.pageno) || 1;

    let totalItems = 0;

    try {
        const count = await models.Quiz.count(countOptions);

        totalItems = count;

        const findOptions = {
            ...countOptions,
            attributes: {exclude: ['answer', 'createdAt', 'updatedAt', 'deletedAt']},
            offset: items_per_page * (pageno - 1),
            limit: items_per_page
        };

        findOptions.include.push({
            model: models.Attachment,
            as: 'attachment',
            attributes: ['mime']
        });

        findOptions.include.push({
            model: models.User,
            as: 'author',
            attributes: ['id', 'isAdmin', 'username', 'accountTypeId', 'profileId', 'profileName'],
            include: [{
                model: models.Attachment,
                as: 'photo',
                attributes: ['mime']
            }]
        });

        let quizzes = await models.Quiz.findAll(findOptions);

        const protocol = /localhost:(\d{4})/.test(req.get('host')) ? "http" : "https"

        quizzes = quizzes.map(quiz => ({
            id: quiz.id,
            question: quiz.question,
            author: quiz.author && {
                id: quiz.author.id,
                isAdmin: quiz.author.isAdmin,
                username: quiz.author.username,
                accountTypeId: quiz.author.accountTypeId,
                profileId: quiz.author.profileId,
                profileName: quiz.author.profileName,
                photo: quiz.author.photo && {
                    mime: quiz.author.photo.mime,
                    url: `${protocol}://${req.get('host')}/users/${quiz.author.id}/photo`
                }
            },
            attachment: quiz.attachment && {
                mime: quiz.attachment.mime,
                url: `${protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`
            },
            favourite: quiz.fans.length > 0
        }));

        let nextUrl = "";
        const totalPages = Math.ceil(totalItems / items_per_page);
        if (pageno < totalPages) {
            let nextPage = pageno + 1;
            nextUrl = addPagenoToUrl(req, nextPage)
        }

        res.json({
            quizzes,
            pageno,
            nextUrl
        });

    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz, token} = req.load;

    //   if this quiz is one of my favourites, then I create
    //   the attribute "favourite = true"

    const protocol = /localhost:(\d{4})/.test(req.get('host')) ? "http" : "https"

    res.json({
        id: quiz.id,
        question: quiz.question,
        author: quiz.author && {
            id: quiz.author.id,
            isAdmin: quiz.author.isAdmin,
            username: quiz.author.username,
            accountTypeId: quiz.author.accountTypeId,
            profileId: quiz.author.profileId,
            profileName: quiz.author.profileName,
            photo: quiz.author.photo && {
                mime: quiz.author.photo.mime,
                url: `${protocol}://${req.get('host')}/users/${quiz.author.id}/photo`
            }
        },
        attachment: quiz.attachment && {
            mime: quiz.attachment.mime,
            url: `${protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`
        },
        favourite: quiz.favourite
    });
};

//-----------------------------------------------------------

// GET /quizzes/random
exports.random = async (req, res, next) => {

    const {token} = req.load;

    try {
        const quizId = await randomQuizId([]);

        if (quizId) {
            const quiz = await models.Quiz.findByPk(quizId, {
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['mime']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'accountTypeId', 'profileId', 'profileName'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['mime']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []},
                        where: {id: req.load.token.userId},
                        required: false
                    }]
            });
            if (!quiz) {
                throw new Error('There is no quiz with id=' + quizId);
            }
            quiz.favourite = quiz.fans.length > 0;

            // If this quiz is one of my favourites, then I create
            // the attribute "favourite = true"

            const protocol = /localhost:(\d{4})/.test(req.get('host')) ? "http" : "https"

            res.json({
                id: quiz.id,
                question: quiz.question,
                author: quiz.author && {
                    id: quiz.author.id,
                    isAdmin: quiz.author.isAdmin,
                    username: quiz.author.username,
                    accountTypeId: quiz.author.accountTypeId,
                    profileId: quiz.author.profileId,
                    profileName: quiz.author.profileName,
                    photo: quiz.author.photo && {
                        mime: quiz.author.photo.mime,
                        url: `${protocol}://${req.get('host')}/users/${quiz.author.id}/photo`
                    }
                },
                attachment: quiz.attachment && {
                    mime: quiz.attachment.mime,
                    url: `${protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`
                },
                favourite: quiz.favourite
            });
        } else {
            res.json({nomore: true});
        }
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/:quizId_woi/check
exports.check = (req, res, next) => {

    const {load, query} = req;
    const {quiz} = load;

    const answer = query.answer || "";

    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.json({
        quizId: quiz.id,
        answer,
        result
    });
};


// GET /quizzes/:quizId_woi/answer
exports.answer = (req, res, next) => {

    const {quiz} = req.load;

    res.json({
        quizId: quiz.id,
        answer: quiz.answer
    });
};

//-----------------------------------------------------------


exports.randomPlayNew = (req, res, next) => {

    req.session.randomPlay = {
        currentQuizId: 0,
        resolved: []
    };

    randomPlayNextQuiz(req, res, next);
};


exports.randomPlayNext = (req, res, next) => {

    randomPlayNextQuiz(req, res, next);
};


const randomPlayNextQuiz = async (req, res, next) => {

    if (!req.session.randomPlay) {
        req.session.randomPlay = {
            currentQuizId: 0,
            resolved: []
        };
    }

    try {
        let quizId;
        // volver a mostrar la misma pregunta que la ultima vez que pase por aqui y no conteste:
        if (req.session.randomPlay.currentQuizId) {
            quizId = req.session.randomPlay.currentQuizId;
        } else {
            // elegir una pregunta al azar no repetida:
            quizId = await randomQuizId(req.session.randomPlay.resolved);
        }

        if (!quizId) {
            const score = req.session.randomPlay.resolved.length;
            delete req.session.randomPlay;
            res.json({nomore: true, score});
        } else {
            const quiz = await models.Quiz.findByPk(quizId, {
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['mime']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'accountTypeId', 'profileId', 'profileName'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['mime']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []},
                        where: {id: req.load.token.userId},
                        required: false
                    }
                ]
            });
            if (!quiz) {
                throw new Error('There is no quiz with id=' + quizId);
            }
            quiz.favourite = quiz.fans.length > 0;

            const score = req.session.randomPlay.resolved.length;

            req.session.randomPlay.currentQuizId = quizId;

            // If this quiz is one of my favourites, then I create
            // the attribute "favourite = true"

            const protocol = /localhost:(\d{4})/.test(req.get('host')) ? "http" : "https"

            res.json({
                quiz: {
                    id: quiz.id,
                    question: quiz.question,
                    author: quiz.author && {
                        id: quiz.author.id,
                        isAdmin: quiz.author.isAdmin,
                        username: quiz.author.username,
                        accountTypeId: quiz.author.accountTypeId,
                        profileId: quiz.author.profileId,
                        profileName: quiz.author.profileName,
                        photo: quiz.author.photo && {
                            mime: quiz.author.photo.mime,
                            url: `${protocol}://${req.get('host')}/users/${quiz.author.id}/photo`
                        }
                    },
                    attachment: quiz.attachment && {
                        mime: quiz.attachment.mime,
                        url: `${protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`
                    },
                    favourite: quiz.favourite
                },
                score
            });
        }
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/randomPlay/check/
exports.randomPlayCheck = async (req, res, next) => {

    if (!req.session.randomPlay ||
      (req.session.randomPlay.currentQuizId === 0)) {
        res.sendStatus(409);
        return;
    }

    const quizId = req.session.randomPlay.currentQuizId;

    try {
        const quiz = await models.Quiz.findByPk(quizId);

        if (quiz) {

            const answer = req.query.answer || "";

            const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

            if (result) {
                req.session.randomPlay.currentQuizId = 0;

                // Evitar que me hagan llamadas a este metodo manualmente con una respuesta acertada para
                // que se guarde muchas veces la misma respuesta en resolved, y asi conseguir que score
                // se incremente indebidamente.
                if (req.session.randomPlay.resolved.indexOf(quiz.id) == -1) {
                    req.session.randomPlay.resolved.push(quiz.id);
                }
            }

            const score = req.session.randomPlay.resolved.length;

            if (!result) {
                delete req.session.randomPlay;
            }

            res.json({
                answer,
                quizId: quiz.id,
                result,
                score
            });

        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------

// GET /quizzes/random10
exports.random10 = async (req, res, next) => {
    _random10_wa(false, req, res, next);
}

// GET /quizzes/random10wa
exports.random10wa = async (req, res, next) => {
    _random10_wa(true, req, res, next);
}

const _random10_wa = async (wa, req, res, next) => {

    try {
        const {token} = req.load;

        let quizIds = [];
        let quizzes = [];

        const count = await models.Quiz.count();

        for (let i = 0; i < 10 && i < count; i++) {
            const whereOpt = {'id': {[Sequelize.Op.notIn]: quizIds}};

            const qarr = await models.Quiz.findAll({
                where: whereOpt,
                attributes: {exclude: ['createdAt', 'updatedAt', 'deletedAt']},
                include: [
                    {
                        model: models.Attachment,
                        as: 'attachment',
                        attributes: ['mime']
                    },
                    {
                        model: models.User,
                        as: 'author',
                        attributes: ['id', 'isAdmin', 'username', 'accountTypeId', 'profileId', 'profileName'],
                        include: [{
                            model: models.Attachment,
                            as: 'photo',
                            attributes: ['mime']
                        }]
                    },
                    {
                        model: models.User,
                        as: "fans",
                        attributes: ['id'],
                        through: {attributes: []},
                        where: {id: req.load.token.userId},
                        required: false
                    }
                ],
                offset: Math.floor(Math.random() * (count - i)),
                limit: 1
            });

            if (!qarr.length) break;

            const quiz = qarr[0]

            quiz.favourite = quiz.fans.length > 0

            quizIds.push(quiz.id);
            quizzes.push(quiz);
        }

        // If this quiz is one of my favourites, then I create
        // the attribute "favourite = true"

        const protocol = /localhost:(\d{4})/.test(req.get('host')) ? "http" : "https"

        res.json(quizzes.map(quiz => ({
            id: quiz.id,
            question: quiz.question,
            answer: quiz.answer,
            author: quiz.author && {
                id: quiz.author.id,
                isAdmin: quiz.author.isAdmin,
                username: quiz.author.username,
                accountTypeId: quiz.author.accountTypeId,
                profileId: quiz.author.profileId,
                profileName: quiz.author.profileName,
                photo: quiz.author.photo && {
                    mime: quiz.author.photo.mime,
                    url: `${protocol}://${req.get('host')}/users/${quiz.author.id}/photo`
                }
            },
            attachment: quiz.attachment && {
                mime: quiz.attachment.mime,
                url: `${protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`
            },
            favourite: quiz.favourite
        }))
          .map(quiz => {
              if (!wa) {
                  delete quiz.answer;
              }
              return quiz;
          }));
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------

/**
 * Returns a promise to get a random quizId.
 * Excludes the ids given in the parameter.
 *
 * @param exclude Array of ids to exclude.
 *
 * @return A promise
 */
const randomQuizId = async exclude => {

    const whereOpt = {'id': {[Sequelize.Op.notIn]: exclude}};

    const count = await models.Quiz.count({where: whereOpt});


    const quizzes = await models.Quiz.findAll({
        where: whereOpt,
        offset: Math.floor(Math.random() * count),
        limit: 1
    });
    return quizzes.length ? quizzes[0].id : 0;
};

//-----------------------------------------------------------
