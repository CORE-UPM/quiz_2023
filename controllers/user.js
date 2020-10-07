"use strict";

const createError = require('http-errors');
const Sequelize = require("sequelize");
const {models} = require("../models");

const moment = require('moment');

const paginate = require('../helpers/paginate').paginate;
const authentication = require('../helpers/authentication');


// Autoload the user with id equals to :userId
exports.load = async (req, res, next, userId) => {

    try {
        const user = await models.User.findByPk(userId, {
            include: [{model: models.Attachment, as: "photo"}]
        });
        if (user) {
            req.load = {...req.load, user};
            next();
        } else {
            req.flash('error', 'There is no user with id=' + userId + '.');
            throw createError(404, 'No exist userId=' + userId);
        }
    } catch (error) {
        next(error);
    }
};


// MW that allows actions only if the user account is local.
exports.isLocalRequired = (req, res, next) => {

    if (!req.load.user.accountTypeId) {
        next();
    } else {
        console.log('Prohibited operation: The user account must be local.');
        res.send(403);
    }
};


// GET /users
exports.index = async (req, res, next) => {

    try {
        const count = await models.User.count();

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req);

        const findOptions = {
            offset: items_per_page * (pageno - 1),
            limit: items_per_page,
            order: ['username'],
            include: [{model: models.Attachment, as: "photo"}]
        };

        const users = await models.User.findAll(findOptions);
        res.render('users/index', {
            users
        });
    } catch (error) {
        next(error);
    }
};

// GET /users/:userId
exports.show = (req, res, next) => {

    const {user} = req.load;

    res.render('users/show', {
        user
    });
};


// GET /users/new
exports.new = (req, res, next) => {

    const user = {
        username: "",
        password: ""
    };

    res.render('users/new', {user});
};


// POST /users
exports.create = async (req, res, next) => {

    const {username, password} = req.body;

    let user = models.User.build({
        username,
        password,
        accountTypeId: 0
    });

    // Password must not be empty.
    if (!password) {
        req.flash('error', 'Password must not be empty.');
        return res.render('users/new', {user});
    }

    try {
        // Create the token field:
        user.token = authentication.createToken();

        // Save into the data base
        user = await user.save({fields: ["username", "token", "password", "salt", "accountTypeId"]});
        req.flash('success', 'User created successfully.');

        try {
            if (!req.file) {
                req.flash('info', 'User without photo.');
                return;
            }

            // Create the user photo
            await createUserPhoto(req, user);

        } catch (error) {
            req.flash('error', 'Failed to save photo: ' + error.message);
        } finally {
            if (req.loginUser) {
                res.redirect('/users/' + user.id);
            } else {
                res.redirect('/login'); // Redirection to the login page
            }
        }
    } catch (error) {
        if (error instanceof Sequelize.UniqueConstraintError) {
            req.flash('error', `User "${username}" already exists.`);
            res.render('users/new', {user});
        } else if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('users/new', {user});
        } else {
            req.flash('error', 'Error creating a new User: ' + error.message);
            next(error);
        }
    }
};

// Aux function to upload req.file to cloudinary, create an attachment with it, and
// associate it with the given user.
// This function is called from the create an update middlewares. DRY.
const createUserPhoto = async (req, user) => {

    const image = req.file.buffer.toString('base64');
    const url = `${req.protocol}://${req.get('host')}/users/${user.id}/photo`;

    // Create the new attachment into the data base.
    let attachment = await models.Attachment.create({
        mime: req.file.mimetype,
        image,
        url
    });
    await user.setPhoto(attachment);
    req.flash('success', 'Photo saved successfully.');
};


// GET /users/:userId/edit
exports.edit = (req, res, next) => {

    const {user} = req.load;

    res.render('users/edit', {user});
};


// PUT /users/:userId
exports.update = async (req, res, next) => {

    const {body} = req;
    const {user} = req.load;

    // user.username  = body.user.username; // edition not allowed

    let fields_to_update = [];

    // ¿Cambio el password?
    if (body.password) {
        console.log('Updating password');
        user.password = body.password;
        fields_to_update.push('salt');
        fields_to_update.push('password');
    }

    try {
        await user.save({fields: fields_to_update});
        req.flash('success', 'User updated successfully.');

        try {
            if (user.accountTypeId) return; // Only local user can edit it photo.

            if (req.body.keepPhoto) return; // Don't change the photo.

            // The photo can be changed if more than 1 minute has passed since the last change:
            if (user.photo) {

                const now = moment();
                const lastEdition = moment(user.photo.updatedAt);

                if (lastEdition.add(1,"m").isAfter(now)) {
                    req.flash('error', 'Photo file can not be modified until 1 minute has passed.');
                    return
                }
            }

            // Delete old photo.
            if (user.photo) {
                await user.photo.destroy();
                await user.setPhoto();
            }

            if (!req.file) {
                req.flash('info', 'This user has no photo.');
                return;
            }

            // Create the user photo
            await createUserPhoto(req, user);

        } catch (error) {
            req.flash('error', 'Failed saving the new photo: ' + error.message);
        } finally {
            res.redirect('/users/' + user.id);
        }
    } catch (error) {
        if (error instanceof Sequelize.ValidationError) {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('users/edit', {user});
        } else {
            req.flash('error', 'Error editing the User: ' + error.message);
            next(error)
        }
    }
};


// DELETE /users/:userId
exports.destroy = async (req, res, next) => {

    const photo = req.load.user.photo;

    try {
        await photo?.destroy();

        // Deleting logged user.
        if (req.loginUser && req.loginUser.id === req.load.user.id) {
            // Close the user session
            req.logout()
            delete req.session.loginExpires;
        }

        await req.load.user.destroy();

        req.flash('success', 'User deleted successfully.');
        res.redirect('/goback');
    } catch (error) {
        req.flash('error', 'Error deleting the User: ' + error.message);
        next(error)
    }
};


// GET /users/:userId/photo
exports.photo = (req, res, next) => {

    const {user} = req.load;

    const {photo} = user;

    if (!photo) {
        res.redirect("/images/face.png");
    } else if (photo.image) {
        photo.mime && res.type(photo.mime);
        res.send(Buffer.from(photo.image.toString(), 'base64'));
    } else if (photo.url) {
        res.redirect(photo.url);
    } else {
        res.redirect("/images/face.png");
    }
}

//-----------------------------------------------------------

// PUT /users/:id/token
// Create a saves a new user access token.
exports.createToken = async (req, res, next) => {

    req.load.user.token = authentication.createToken();

    try {
        const user = await req.load.user.save({fields: ["token"]});
        req.flash('success', 'User Access Token created successfully.');
        res.redirect('/users/' + user.id);
    } catch (error) {
        next(error);
    }
};

//-----------------------------------------------------------