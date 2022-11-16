const {mongoose, Schema} = require('mongoose');


const altcomment = Schema({
    user : {type : Schema.Types.ObjectId, ref : "user"},
    text : String,
    date : {
        type : Date,
        default : Date.now,
    },
})

const comment = Schema({
    post : {type : Schema.Types.ObjectId, ref : "post"},
    user : {type : Schema.Types.ObjectId, ref : "user"},
    text : String,
    date : {
        type : Date,
        default : Date.now,
    },
    altcomments : [altcomment]
})



const Comment = mongoose.model("comment", comment);

module.exports = {Comment, altcomment};