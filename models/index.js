// Load ORM
const Sequelize = require('sequelize');

// Environment variable to define the URL of the data base to use.
// To use SQLite data base:
//    DATABASE_URL = sqlite:quiz.sqlite
const url = process.env.DATABASE_URL || "sqlite:quiz.sqlite";

const sequelize = new Sequelize(url);

const Session = require('./session')(sequelize);
const Quiz = require('./quiz')(sequelize);
const User = require('./user')(sequelize);
const Attachment = require('./attachment')(sequelize);

// Relation 1-to-N between User and Quiz:
User.hasMany(Quiz, {as: 'quizzes', foreignKey: 'authorId'});
Quiz.belongsTo(User, {as: 'author', foreignKey: 'authorId'});


// Relation 1-to-1 between Quiz and Attachment
Quiz.hasOne(Attachment, {as: 'attachment', foreignKey: 'quizId'});
Attachment.belongsTo(Quiz, {as: 'quiz', foreignKey: 'quizId'});


// Relation 1-to-1 between User and Attachment
User.hasOne(Attachment, {as: "photo", foreignKey: 'userId'});
Attachment.belongsTo(User, {as: 'user', foreignKey: 'userId'});


// Relation N-to-N between Quiz and User:
//    A User has many favourite quizzes.
//    A quiz has many fans (the users who have marked it as favorite)
Quiz.belongsToMany(User, {
    as: 'fans',
    through: 'Favourites',
    foreignKey: 'quizId',
    otherKey: 'userId'
});

User.belongsToMany(Quiz, {
    as: 'favouriteQuizzes',
    through: 'Favourites',
    foreignKey: 'userId',
    otherKey: 'quizId'
});


module.exports = sequelize;
