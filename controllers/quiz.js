const createError = require('http-errors');
const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");

const paginate = require('../helpers/paginate').paginate;


// Autoload el quiz asociado a :quizId
exports.load = async (req, res, next, quizId) => {

    try {
        const quiz = await models.Quiz.findByPk(quizId, {
            include: [
                {model: models.Attachment, as: 'attachment'},
                {
                    model: models.User,
                    as: 'author',
                    include: [{
                        model: models.Attachment,
                        as: "photo"
                    }]
                }
            ]
        });
        if (quiz) {
            req.load = {...req.load, quiz};
            next();
        } else {
            throw createError(404,'There is no quiz with id=' + quizId);
        }
    } catch (error) {
        next(error);
    }
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin = !!req.loginUser.isAdmin;
    const isAuthor = req.load.quiz.authorId === req.loginUser.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = async (req, res, next) => {

    let countOptions = {
        where: {}
    };
    let findOptions = {
        where: {}
    };

    let title = "Quizzes";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g, "%") + "%";

        countOptions.where.question = {[Op.like]: search_like};
        findOptions.where.question = { [Op.like]: search_like };
    }

    // If there exists "req.load.user", then only the quizzes of that user are shown
    if (req.load && req.load.user) {
        countOptions.where.authorId = req.load.user.id;
        findOptions.where.authorId = req.load.user.id;

        if (req.loginUser && req.loginUser.id == req.load.user.id) {
            title = "My Quizzes";
        } else {
            title = "Quizzes of " + req.load.user.displayName;
        }
    }

    try {
        const count = await models.Quiz.count(countOptions);

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req);

        findOptions.offset = items_per_page * (pageno - 1);
        findOptions.limit = items_per_page;
        findOptions.include = [
            {model: models.Attachment, as: 'attachment'},
            {
                model: models.User,
                as: 'author',
                include: [{
                    model: models.Attachment,
                    as: "photo"
                }]
            }
        ];

        const quizzes = await models.Quiz.findAll(findOptions);
        res.render('quizzes/index.ejs', {
            quizzes,
            search,
            title
        });
    } catch (error) {
        next(error);
    }
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req.load;

    res.render('quizzes/show', {
        quiz
    });
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "",
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = async (req, res, next) => {

    const {question, answer} = req.body;
    const authorId = req.loginUser && req.loginUser.id || 0;

    let quiz = models.Quiz.build({question, answer, authorId});

    try {
        // Saves only the fields question and answer into the DDBB
        quiz = await quiz.save({fields: ["question", "answer", "authorId"]});
        req.flash('success', 'Quiz created successfully.');

        try {
            if (!req.file) {
                req.flash('info', 'Quiz without attachment.');
                return;
            }

            // Create the quiz attachment
            await createQuizAttachment(req, quiz);

        } catch (error) {
            req.flash('error', 'Failed to create attachment: ' + error.message);
        } finally {
            res.redirect('/quizzes/' + quiz.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/new', {quiz});
        } else {
            req.flash('error', 'Error creating a new Quiz: ' + error.message);
            next(error)
        }
    }
};

// Aux function to upload req.file to cloudinary, create an attachment with it, and
// associate it with the gien quiz.
// This function is called from the create an update middleware. DRY.
const createQuizAttachment = async (req, quiz) => {

    const image = req.file.buffer.toString('base64');
    const url = `${req.protocol}://${req.get('host')}/quizzes/${quiz.id}/attachment`;

    // Create the new attachment into the data base.
    const attachment = await models.Attachment.create({
        mime: req.file.mimetype,
        image,
        url
    });
    await quiz.setAttachment(attachment);
    req.flash('success', 'Attachment saved successfully.');
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req.load;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = async (req, res, next) => {

    const {body} = req;
    const {quiz} = req.load;

    quiz.question = body.question;
    quiz.answer = body.answer;

    try {
        await quiz.save({fields: ["question", "answer"]});
        req.flash('success', 'Quiz edited successfully.');

        try {
            if (req.body.keepAttachment) return; // Don't change the attachment.

            // Delete old attachment.
            if (quiz.attachment) {
                await quiz.attachment.destroy();
                await quiz.setAttachment();
            }

            if (!req.file) {
                req.flash('info', 'Quiz without attachment.');
                return;
            }

            // Create the quiz attachment
            await createQuizAttachment(req, quiz);

        } catch (error) {
            req.flash('error', 'Failed saving the new attachment: ' + error.message);
        } finally {
            res.redirect('/quizzes/' + quiz.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('quizzes/edit', {quiz});
        } else {
            req.flash('error', 'Error editing the Quiz: ' + error.message);
            next(error);
        }
    }
};


// DELETE /quizzes/:quizId
exports.destroy = async (req, res, next) => {

    const attachment = req.load.quiz.attachment;

    try {
        await req.load.quiz.destroy();
        await attachment?.destroy();
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback');
    }  catch(error) {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    }
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {query} = req;
    const {quiz} = req.load;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {query} = req;
    const {quiz} = req.load;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};


// GET /quizzes/:quizId/attachment
exports.attachment = (req, res, next) => {

    const {quiz} = req.load;

    const {attachment} = quiz;

    if (!attachment) {
        res.redirect("/images/none.png");
    } else if (attachment.image) {
        attachment.mime && res.type(attachment.mime);
        res.send(Buffer.from(attachment.image.toString(), 'base64'));
    } else if (attachment.url) {
        res.redirect(attachment.url);
    } else {
        res.redirect("/images/none.png");
    }
}
