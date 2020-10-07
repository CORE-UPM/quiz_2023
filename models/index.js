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

module.exports = sequelize;
