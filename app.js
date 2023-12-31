//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: 'This is my secret',
  resave: false,
  saveUninitialized: false

}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://127.0.0.1:27017/campusDB");

const userSchema=new mongoose.Schema({
  firstname:String,
  lastname:String,
  username:String,
  password:String,
  googleId:String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      fname:user.firstname,
      lname:user.lastname,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/campus",
  userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.use(express.static("public"));
app.get("/",function(req,res){
  res.render("home");
})

app.get("/auth/google",
passport.authenticate('google', { scope: ["profile"] }));

  app.get("/auth/google/campus", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });  

app.get("/register",function(req,res){
  res.render("register");
})

app.get("/login",function(req,res){
  res.render("login");
})
app.get("/about",function(req,res){
  res.render("about");
})
app.get("/account",function(req,res){
  res.render("account",{name:User.fname+" "+User.lname});
})
app.get("/successregisterd",function(req,res){
  if(req.isAuthenticated()){
    res.render("account");
  }else{
    res.redirect("/login");
  }
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/login");
      })
    }
  })
  
});

app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.body.password
  });
  req.login(user,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){

        res.redirect("/account");
        // res.render("account",{ name: user.username});
        
      })
    }
  })
});

app.get("/logout",function(req,res){
  req.logout(function(err){
      if(err){
          return next(err);
      }else{
          res.redirect("/");
      }
  });
  
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
