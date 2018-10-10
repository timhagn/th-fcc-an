'use strict';
require('dotenv').config();
const routes = require('./routes.js');
const auth = require('./auth.js');

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
const bcrypt = require('bcrypt');

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

mongo.connect(process.env.DATABASE, {useNewUrlParser: true}, (err, client) => {
  if(err) {
    console.log('Database error: ' + err);
  } else {
    console.log('Successful database connection');
    let db = client.db('user_auth');

    auth(app, db);
    routes(app, db);

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

