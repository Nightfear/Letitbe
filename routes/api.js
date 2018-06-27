var mongoose = require('mongoose');
var passport = require('passport');
var config = require('../config/database');
require('../config/passport')(passport);
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();
var User = require("../models/user");


router.post('/signup', function (req, res) {
  // Validation of data
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('email', 'Email is not valid').isEmail();
  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  var errors = req.validationErrors();

  if (errors) {
    return res.json({ success: false, msg: errors })
  } else {
    var newUser = new User({
      email: req.body.email,
      username: req.body.username,
      password: req.body.password,
      timeCreated: Date.now()
    });
  }
  // save the user
  newUser.save(function (err) {
    if (err) {
      return res.json({ success: false, msg: 'Username already exists or another error occurs: \n' + err });
    }
    res.json({ success: true, msg: 'Successful created new user.' });
  });
});

router.post('/signin', function (req, res) {
  User.findOne({
    username: req.body.username
  }, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function (err, isMatch) {
        if (isMatch && !err) {
          // if user is found and password is right create a token
          var token = jwt.sign(user.toObject(), config.secret);

          // return the information including token as JSON
          //res.json({ success: true, token: token });

          //! Updating "timeLastLogin" on sending token(login)
          User.update({_id: user._id}, {$set:{timeLastLogin: Date.now()}}, function(err, raw, next) {
            if (err) res.send(err);
            res.status(302).send({
              userid: user._id,
              userGoals: user.goals,
              success: true,
              token: token });
          });
        } else {
          res.status(401).send({ success: false, msg: 'Authentication failed. Wrong password.' });
        }
      });
    }
  });
});

// Post data to the server to be saved
router.post('/dashboard', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    console.log(req.body.goals);
    //! Saving prompted goal to the DB
    
    //! $set needs to be replaced
    User.update({_id: req.body.userid}, {$set:{goal: req.body.goals}}, function(err, raw){
      if (err) return res.send(err);
    })

    return res.status(302).send({ success: true, msg: 'You are in Dashboard' });
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

router.get('/dashboard', passport.authenticate('jwt', { session: false }), function (req, res) {
  var token = getToken(req.headers);
  if (token) {
    //Get user's Goals as JSON

    User.findOne({
    _id: req.body.userdata[0]
  }, function (err, user) {
    if (err) throw err;
    if (!user) {
      res.status(401).send({ success: false, msg: 'Authentication failed. User not found.' });
    } else {
      res.status(302).send({success: true, user_data: user });      
    }});
      
    
  } else {
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});

router.post('/dashboard', passport.authenticate('jwt',  { session: false }), function (req, res){
  var token = getToken(req.headers);
  if (token) {
    
  }else{
    return res.status(403).send({ success: false, msg: 'Unauthorized.' });
  }
});


getToken = function (headers) {
  if (headers && headers.authorization) {
    var parted = headers.authorization.split(' ');
    if (parted.length === 2) {
      return parted[1];
    } else {
      return null;
    }
  } else {
    return null;
  }
};

module.exports = router;