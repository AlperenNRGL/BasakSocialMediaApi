const {mongoose, Schema} = require("mongoose");

const text = Schema({
    user : {type : Schema.Types.ObjectId, ref : "user"},
    text : String,
    date : {
        type : Date,
        default : Date.now
    }
})



const message = Schema({
    text : [text],
    read : {
        type: Boolean,
        default : false,
    }
})


const Message = mongoose.model("message",message);

module.exports  = Message;