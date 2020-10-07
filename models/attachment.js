'use strict';

const {Model, DataTypes} = require('sequelize');

// Definition of the Attachment model:
module.exports = sequelize => {

    class Attachment extends Model {
    }

    Attachment.init({
           mime: {
                type: DataTypes.STRING
            },
            url: {
                type: DataTypes.STRING
            },
            image: {
                type: DataTypes.BLOB('long')
            }
        }, {
            sequelize
        }
    );

    return Attachment;
};
