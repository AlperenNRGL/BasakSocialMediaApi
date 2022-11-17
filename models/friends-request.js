const {mongoose, Schema} = require('mongoose');


const request = Schema({
    istekuser : {type : Schema.Types.ObjectId, ref : "user"},
    alıcıuser : {type : Schema.Types.ObjectId, ref : "user"},
    date : {
        type : Date,
        default : Date.now,
    },
    noficationid : {type : Schema.Types.ObjectId, ref : "nofication"}
})


const FriendRequest = mongoose.model("request", request);

module.exports = FriendRequest;