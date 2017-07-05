const Scaling = require('./scaling');

module.exports.handler = (event, context, callback) => {
  new Scaling(event, context, callback).scaling();
};
