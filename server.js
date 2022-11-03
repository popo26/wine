require('dotenv').config();
// const apiKey = process.env.API_KEY;

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs")

const app = express();

app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

const dislikes = []

app.get("/", function(req, res){
    res.render("home", {dislikeList: dislikes});
});

app.post("/", function(req, res){
    let item = req.body.wine;
    dislikes.push(item)
    res.redirect("/");
})

app.listen(3000, function(){
    console.log ("Server started on port 3000")
})