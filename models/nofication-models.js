const {mongoose, Schema} = require("mongoose");


const noficationSchema = Schema({

    aitolan : {type : Schema.Types.ObjectId, ref : "user"},
    bildirimiyapan : {type : Schema.Types.ObjectId, ref : "user"},
    worktype : String,
    text : String,
    date : {
        type : Date,
        default : Date.now,
    },

})




const Nofication = mongoose.model("nofication", noficationSchema);

module.exports  = Nofication;