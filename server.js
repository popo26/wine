require('dotenv').config();
// const apiKey = process.env.API_KEY;

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs")
const mongoose = require("mongoose");


// +++++++++++++++create db if it exists, it will just use it+++++++++++++++
mongoose.connect("mongodb://localhost:27017/winesDB")

// +++++++++++++++create new schema and add mongoose's built-in validation+++++++++++++++
//https://mongoosejs.com/docs/validation.html
const winesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Wine name is missing!"]
    },
    type: String,
    comment: String,
    price: Number,
});

//+++++++++++++++create model+++++++++++++++
const Wine = mongoose.model("Wine", winesSchema);

//+++++++++++++++create wine document - single creation+++++++++++++++
// const wine = new Wine ({
//     name: "Wine1",
//     type: "Pinot Noir",
//     comment: "Bitter",
//     price: 12
// });

// wine.save();

// +++++++++++++++create wine documents - multiple creation+++++++++++++++
// const wine2 = new Wine({
//     name: "Wine2",
//     type: "Sav",
//     comment: "Too sweet",
//     price: 10,
// });

// const wine3 = new Wine({
//     name: "Wine3",
//     type: "Chardonnay",
//     comment: "No kick",
//     price: 14,
// });

// const wine4 = new Wine({
//     name: "Wine4",
//     type: "Sav",
//     comment: "Taste funny",
//     price: 10,
// });

// Wine.insertMany([wine2, wine3, wine4], function(err){
//     if (err){
//         console.log(err);
//     } else {
//         console.log("Succesfully saved all the wines to wineDB");
//     }
// });


//+++++++++++++++read mongodb+++++++++++++++

// Wine.find(function(err, wines){
//     if (err) {
//         console.log(err);
//     } else {
//         console.log(wines);
//     }
// });

//++++++++++++read only name of wines+++++++++++++++
// Wine.find(function(err, wines){
//     if (err) {
//         console.log(err);
//     } else {
//         mongoose.connection.close();
//         wines.forEach(function(wine){
//             console.log(wine.name);
//         });
//     }
// });

//+++++++++++++++update data+++++++++++++++
// Wine.updateOne({_id:"63642641bb985936584e8289"}, {price:20}, function(err){
//     if (err){
//         console.log(err);
//     } else {
//         console.log("Successfully updated the wine document.");
//     }
// });

//+++++++++++++++delete data -- Case sensitive+++++++++++++++
// Wine.deleteOne({name: "Wine3"}, function(err){
//     if (err){
//         console.log(err);
//     }else {
//         mongoose.connection.close(); //not so sure about how to use this line
//         console.log("Successfully deleted the wine document.");
        
//     }
// });



const app = express();

app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

const dislikes = [];

app.get("/", function(req, res){
    Wine.find({}, function(err, foundWines){
        if(err){
            console.log(err);
        } else {
            res.render("home", {dislikeList: foundWines});
        }  
    });  
});

app.post("/", function(req, res){
    const wineName = req.body.wineName;
    const wineType = req.body.wineType;
    const wineComment = req.body.wineComment;
    const winePrice = req.body.winePrice;

    const wine = new Wine({
        name: wineName,
        type: wineType,
        comment: wineComment,
        price: winePrice,
    })

    wine.save()

    res.redirect("/");
})

app.post("/delete", function(req, res){
    const deleteWineId = req.body.wineId;

    Wine.findByIdAndRemove(deleteWineId, function(err){
        if (!err) {
            console.log("Removed selected wine.");
            res.redirect("/");
        }
    });
});

app.listen(3000, function(){
    console.log ("Server started on port 3000")
})