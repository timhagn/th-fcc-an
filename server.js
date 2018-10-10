'use strict';
require('dotenv').config();

const express     = require('express');
const bodyParser  = require('body-parser');
const fccTesting  = require('./freeCodeCamp/fcctesting.js');
// Add express-session & passport.
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
// MongoDB.
const mongo = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add 'pug' as render plugin.
app.set('view engine', 'pug');

// Add session handling.
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user._id);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    console.log('authenticated');
    return next();
  }
  console.log('redirect');
  res.redirect('/');
}

mongo.connect(process.env.DATABASE, {useNewUrlParser: true}, (err, client) => {
  if(err) {
    console.log('Database error: ' + err);
  } else {
    console.log('Successful database connection');
    let db = client.db('user_auth');

    passport.deserializeUser((id, done) => {
      db.collection('users').findOne(
          {_id: new ObjectId(id)},
          (err, doc) => {
            done(null, doc);
          }
      );
    });

    passport.use(new LocalStrategy(
        function(username, password, done) {
          db.collection('users').findOne({ username: username }, function (err, user) {
            console.log('User '+ username +' attempted to log in.');
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            if (password !== user.password) { return done(null, false); }
            return done(null, user);
          });
        }
    ));

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
                title: 'Home page',
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
    // Register route.
    app.route('/register')
        .post((req, res, next) => {
            db.collection('users').findOne({ username: req.body.username }, function (err, user) {
              if(err) {
                next(err);
              } else if (user) {
                res.redirect('/');
              } else {
                db.collection('users').insertOne(
                    {username: req.body.username,
                      password: req.body.password},
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

    app.use((req, res, next) => {
      res.status(404)
          .type('text')
          .send('Not Found');
    });

    app.listen(process.env.PORT || 3000, () => {
      console.log("Listening on port " + process.env.PORT);
    });
  }
});

