// const  Joi  = require('joi');
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
    user : {type : Schema.Types.ObjectId, ref : "user"},
    date : {
        type : Date,
        default : Date.now,
    },
    text : String,
    altcomment : [altcomment],
});

const post = Schema({
    user : {type : Schema.Types.ObjectId, ref : "user"},
    text : String,
    img:{
        data: {
            type : Buffer,
        },
        contentType: String,
    },
        date : {
        type : Date,
        default : Date.now,
    },
    like : [{
        user : {type : Schema.Types.ObjectId, ref : "user"},
        date : {
            type : Date,
            default : Date.now,
        },
    }],
    comments : [comment]
})


// const postValidate = Joi.object({
//     user : Joi.string().required() ,
//     text : Joi.string(),
//     image : Joi.string(),
// })

const Post = mongoose.model("post", post);
// const Comment = mongoose.model("comment", );

module.exports = Post;