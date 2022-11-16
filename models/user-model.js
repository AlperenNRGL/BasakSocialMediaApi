const { mongoose, Schema } = require("mongoose");

const message = Schema({
    user : {type: Schema.Types.ObjectId, ref: "user"},
    messages :{type: Schema.Types.ObjectId, ref: "message"}
})


const userSchema = Schema({
    firstName : {required : true,type : String,},
    lastName : {required : true,type : String,},
    username : {required : true,type : String,},
    email : {required : true,type : String,unique : true,},
    password : {type : String,required : true,},
    // cinsiyet : {type : Boolean,required : true,},
    dataOfBirth : {type : Date},
    city : {type : String,},
    country : {type : String,},
    token : {type : String,},
    profilImageData : {
        data: {
            type : Buffer,
            // default : fs.readFileSync(path.join(__dirname + '/../doc/uploads/icons8-person-64.png')),  
        },
        contentType: {
            type : String,
            default : "image/png"
        }
    },
    profilImage : {
        type : String,
        default : "icons8-person-64.png"
    },
    coverImage : {
        data: { 
            type : Buffer,
        },
        contentType: String,
    },
    friends : [{type : Schema.Types.ObjectId, ref : "user"}],
    messages : [message],
    biyografi : {type : String, default : null},
})




const User = mongoose.model("user", userSchema);


module.exports = User