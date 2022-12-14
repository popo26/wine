require('dotenv').config();
const secret = process.env.SECRET;
const dbUrl = process.env.ATLAS_URL

const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const _ = require("lodash");
const oneDay = 1000 * 60 * 60 * 24;
const alert = require("alert");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
// const FacebookStrategy = strategy.Strategy;
const findOrCreate = require("mongoose-findorcreate");

// Authentication1-position important
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
// const LocalStrategy = require('passport-local').Strategy;

const app = express();

app.set("view engine", 'ejs');
app.use(express.static("public"));
app.use(bodyParser.json()); //Without this line it populate empty item at /wines
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());

// Authentication2 - position important
app.use(session({
    secret: secret,
    saveUninitialized: false,
    resave:false,
    cookie: { maxAge: oneDay },
}));

app.use(passport.initialize());
app.use(passport.session());

// +++++++++++++++create db if it exists, it will just use it+++++++++++++++
// mongoose.connect("mongodb://localhost:27017/wineDB")
mongoose.connect(dbUrl);



// +++++++++++++++ create new schema and add mongoose's built-in validation +++++++++++++++
//https://mongoosejs.com/docs/validation.html
const userSchema = new mongoose.Schema({
    // username: {
    //     type: String,
    //     unique:true,
    //     required: [true, "Email is required."]
    // },
    username: String,
    password: String, //passport will check anyway so no need to require.
    googleId: String
});

const wineSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Wine name is missing!"]
    },
    type: String,
    comment: String,
    price: Number,
    user: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
});

// Authentication3 - position important
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Authentication4 - position important
//+++++++++++++++create model+++++++++++++++
const User = mongoose.model("User", userSchema);
const Wine = mongoose.model("Wine", wineSchema);

// Authentication5 - position important
passport.use(User.createStrategy());
// passport.use(new LocalStrategy({
//     usernameField: 'email',
//     passwordField: 'password'
// }, User.authenticate()));

//This works only for local strategy (comes from passport-local-mongoose)
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//This works for all strategies not just for local strategy
passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

//Google OAuth2.0
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Facebook Oauth
passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: process.env.FACEBOOK_CALLBACK_URL,
        profileFields: ["email"]
      },
      function(accessToken, refreshToken, profile, done) {
        const { email, first_name, last_name } = profile._json;
        const userData = {
          email,
          firstName: first_name,
          lastName: last_name
        };
        new userModel(userData).save();
        done(null, profile);
      }
    )
  );


const dislikes = [];
const searchedList = [];
const title = "";
const wineName = "";

app.get("/", function(req, res){
    // console.log("Home page");
    const title = "Home";
    res.render("home", {title:title});
});

app.route('/auth/google')
  .get(passport.authenticate('google', {
    scope: ['profile']
  }));

app.route('/auth/facebook')
.get(passport.authenticate('facebook', {
scope: ['profile']
}));

app.get('/auth/google/wines',
passport.authenticate('google', {failureRedirect:'/login'}),
function(req, res){
    res.redirect("/wines");
});

app.get('/auth/facebook/wines',
passport.authenticate('facebook', {failureRedirect:'/login'}),
function(req, res){
    res.redirect("/wines");
});


//Step added for Oath redirection to work to /wines/:id
app.get("/wines", function(req,res){
    // console.log("Wines page without ID");
    user = req.user;
    id = req.user.id;
    res.redirect("/wines/" + id);
})


app.get("/register", function(req, res){
    // console.log("Register page");
    const title = "Register";
    res.render("register", {title:title});
});


app.post("/register", function(req, res){
   
    User.findOne({username:req.body.username}, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (!foundUser && req.body.password === req.body.confirmPassword){
                User.register({username:req.body.username}, req.body.password, function(err, foundUser){
                    if (err){
                        console.log(err);
                        alert("Make sure you entered same password twice.");
                        res.redirect("/register");
                    }else {
                        req.session.user = foundUser;
                        id = req.session.user._id;
                        passport.authenticate("local")(req, res, function(){
                            res.redirect("/wines/" + id);
                        })
                    }
                })
            } else if (!foundUser && req.body.password !== req.body.confirmPassword) {
                alert("Passwords don't match. Try again.")
            } else {
                alert("This email address has been taken.");
                res.redirect("/register");   
            }
        }
    });
});


app.get("/login", function(req,res) {
    // console.log("Login page");
    const title = "Login";
    res.render("login", {title:title});
});


app.post("/login", function(req, res, next){

    // console.log("Posting login");

    const user = new User({
        username:req.body.username,
        password: req.body.password
    });

    passport.authenticate('local', function(err, user, info) {
        
        if (err) { 
            return next(err); 
        }
        if (!user) { 
            alert("Invalid email or password. Try again! Or not registered yet?")
            return res.redirect('/login'); 
        }
        req.logIn(user, function(err) {
        if (err) { 
            return next(err); 
        }
        req.session.user = user;
        id = user._id;
        return res.redirect('/wines/' + id);
        });
    })(req, res, next);
});


app.get("/wines/:id", function(req, res){

    // console.log("Wine GET page");
    const title = "Wine";

    userId = req.params.id;
    // console.log(userId);

    if (req.isAuthenticated()){
        User.findOne({_id: userId}, function(err, foundUser){
            if(err){
                console.log(err);
            } else {
                    req.user = foundUser;
                }
            });
    
        Wine.find({user:userId}, function(err, foundWines){
            if(err){
                console.log(err);
            } else {
                res.render("wines", {dislikeList: foundWines, userId:userId, title:title});
            } 
        });
    } else {
      res.redirect("/login");
    }      
});


app.post("/wines/:id", function(req, res){
    const wineName = _.capitalize(req.body.wineName);
    const wineType = req.body.wineType;
    const wineComment = req.body.wineComment;
    const winePrice = req.body.winePrice;
    const userId = req.body.userId;

    const wine = new Wine({
        name: wineName,
        type: wineType,
        comment: wineComment,
        price: winePrice,
        user:userId
    })

    wine.save(function(err){
        if (err){
            console.log(err);
            alert("Wine name is required.\nPrice should be number.");
            res.redirect("/wines/" + userId);
        } else {
            res.redirect("/wines/" + userId);
        }
    });
})


app.post("/delete", function(req, res){
    const deleteWineId = req.body.wineId;
    const userId = req.body.userId;

    Wine.findByIdAndRemove(deleteWineId, function(err){
        if (!err) {
            console.log("Removed selected wine.");
            res.redirect("/wines/" + userId);
        } else {
            console.log(err);
            alert('Error. Please try again.');
            res.redirect("/wines/" + userId);
        }
    });
});



app.post("/wines/:id/find", function(req, res){
    // console.log("Wine Result page");
    const title = "Found Wines";
    const wineName = _.capitalize(req.body.searchWine);
    userId = req.params.id;
    // console.log("search item is :"+ req.body.searchWine);
    
    if (req.isAuthenticated()){
            Wine.find({user:userId, name:{$regex:wineName}}, function(err, foundWines){
            if(err){
                console.log(err);
            } else {
                // console.log("foundWines: " + foundWines);
                res.render("wines", {dislikeList: foundWines, userId:userId, title:title});
            } 
        });
    } else {
      res.redirect("/login");
    }      
});

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });


app.listen(3000, function(){
    console.log ("Server started on port 3000")
});





/* MY REFERENCE:


===================== MongoDB CRUD Reference =====================

+++++++++++++++create wine document - single creation+++++++++++++++
const wine = new Wine ({
    name: "Wine1",
    type: "Pinot Noir",
    comment: "Bitter",
    price: 12
});

wine.save();

+++++++++++++++create wine documents - multiple creation+++++++++++++++
const wine2 = new Wine({
    name: "Wine2",
    type: "Sav",
    comment: "Too sweet",
    price: 10,
});

const wine3 = new Wine({
    name: "Wine3",
    type: "Chardonnay",
    comment: "No kick",
    price: 14,
});

const wine4 = new Wine({
    name: "Wine4",
    type: "Sav",
    comment: "Taste funny",
    price: 10,
});

Wine.insertMany([wine2, wine3, wine4], function(err){
    if (err){
        console.log(err);
    } else {
        console.log("Succesfully saved all the wines to wineDB");
    }
});


+++++++++++++++read mongodb+++++++++++++++

Wine.find(function(err, wines){
    if (err) {
        console.log(err);
    } else {
        console.log(wines);
    }
});

++++++++++++read only name of wines+++++++++++++++
Wine.find(function(err, wines){
    if (err) {
        console.log(err);
    } else {
        mongoose.connection.close();
        wines.forEach(function(wine){
            console.log(wine.name);
        });
    }
});

+++++++++++++++update data+++++++++++++++
Wine.updateOne({_id:"63642641bb985936584e8289"}, {price:20}, function(err){
    if (err){
        console.log(err);
    } else {
        console.log("Successfully updated the wine document.");
    }
});

+++++++++++++++delete data -- Case sensitive+++++++++++++++
Wine.deleteOne({name: "Wine3"}, function(err){
    if (err){
        console.log(err);
    }else {
        mongoose.connection.close(); //not so sure about how to use this line
        console.log("Successfully deleted the wine document.");
        
    }
});
*/
