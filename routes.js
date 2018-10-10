const passport = require('passport');
// MongoDB.
const mongo = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcrypt');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('authenticated');
    return next();
  }
  console.log('redirect');
  res.redirect('/');
}

module.exports = function (app, db) {
  app.route('/')
      .get((req, res) => {
        res.render(process.cwd() + '/views/pug/index',
            {
              title: 'Home page',
              message: 'Please login',
              showLogin: true,
              showRegistration: true
            });
      });

  // Route to /profile (only if authenticated).
  app.route('/profile')
      .get(ensureAuthenticated, (req,res) => {
        res.render(process.cwd() + '/views/pug/profile',
            {
              title: 'Profile Page',
              message: 'Please login',
              username: req.user.username
            });
      });

  // Route to /login.
  app.route('/login')
      .post(passport.authenticate('local', { failureRedirect: '/' }),
          (req, res) => {
            res.redirect('/profile');
          });
  // Route to /logout.
  app.route('/logout')
      .get((req, res) => {
        req.logout();
        res.redirect('/');
      });
  app.route('/drop')
      .get((req, res) => {
        req.logout();
        db.collection('users').deleteMany( { } );
        res.redirect('/');
      });
  // Register route.
  app.route('/register')
      .post((req, res, next) => {
            db.collection('users').findOne({ username: req.body.username }, function (err, user) {
              if(err) {
                next(err);
              }
              // Comment this out, if second registration challenge fails.
              else if (user) {
                res.redirect('/');
              }
              else {
                let hash = bcrypt.hashSync(req.body.password, 12);
                db.collection('users').insertOne(
                    {
                      username: req.body.username,
                      password: hash
                    },
                    (err, doc) => {
                      if(err) {
                        res.redirect('/');
                      } else {
                        next(null, user);
                      }
                    }
                )
              }
            })},
          passport.authenticate('local', { failureRedirect: '/' }),
          (req, res, next) => {
            res.redirect('/profile');
          }
      );
};