var express = require('express');
var router = express.Router();

// History: Goback routes.

// Redirection to the saved goback route.
function redirectBack(req, res, next) {
    const url = req.session.backURL || "/";
    delete req.session.backURL;
    res.redirect(url);
}

router.get('/goback', redirectBack);

// Save the route that will be the current goback route.
function saveBack(req, res, next) {
    req.session.backURL = req.url;
    next();
}

// Goback routes are GET routes that do not end in:
//   /new, /edit, /play, /check, /login or /:id.
router.get(
  [
      '/',
      '/author',
      '/users',
      '/users/:id(\\d+)/quizzes',
      '/quizzes'
  ],
  saveBack);


module.exports = router;
