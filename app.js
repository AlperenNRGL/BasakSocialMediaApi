const express = require('express');
const mongoose = require('mongoose');
const app = express();

require("express-async-errors")

const User = require("./models/user-model");
const Post = require("./models/post-model");
const Message = require("./models/message-model");
const FriendRequest = require("./models/friends-request");
const { Comment, altcomment } = require("./models/comment-models");

const fs = require("fs")
const sharp = require("sharp")

var cors = require('cors');
const Nofication = require('./models/nofication-models');
const logger = require('./helpers/winston');

app.use(express.json())
app.use(cors())

app.get("/", cors(), (req, res) => {
    res.send("Home Page")
})

//? User Sorgulama
app.get("/users/:name", cors(), async (req, res) => {
    const users = await User.find().or(
        { username: { $regex: req.params.name, $options: "i" } },
        { lastName: { $regex: req.params.name, $options: "i" } },
        { firstName: { $regex: req.params.name, $options: "i" } })
        .limit(4)
        .select(["-profilImageData", "-coverImage"]);
    res.send(users);
})

//? Arkaşlık bitirme
app.get("/remove-friend/:userid/:friendid", cors(), async (req, res) => {
    const user = await User.findById(req.params.userid)
    .select(["-profilImageData", "-coverImage"]);

    const index1 = user.friends.indexOf(req.params.friendid);
    user.friends.splice(index1, 1);
    await user.save();

    const user2 = await User.findById(req.params.friendid)
    .select(["-profilImageData", "-coverImage"]);

    const index2 = user.friends.indexOf(req.params.userid);
    user2.friends.splice(index2, 1);
    await user2.save();

    res.send("remove friends")
})

//? İstek Gönderme
app.get("/friend-request/:gonderen/:alici", cors(), async (req, res) => {
    const istek = FriendRequest({ istekuser: req.params.gonderen, aliciuser: req.params.alici });
    const varmi = await FriendRequest.find()
        .or({ istekuser: req.params.gonderen, aliciuser: req.params.alici }, { istekuser: req.params.alici, aliciuser: req.params.gonderen });

    if (varmi.length != 0) {
        return res.send("Arkadaşlık isteği zaten gönderilmiş")
    }

    const newNofication = Nofication({ bildirimiyapan: req.params.gonderen, aitolan: req.params.alici, worktype: "request" })

    istek.noficationid = newNofication._id;
    await newNofication.save();
    await istek.save()

    res.send("Arkadaşlık İsteği gönderildi");
})

//? Arkadaş Olma
app.get("/add-friend/:gonderen/:alici/:noficationid", cors(), async (req, res) => {

    const user1 = await User.findById(req.params.gonderen)
    .select(["-profilImageData", "-coverImage"]);
    const user2 = await User.findById(req.params.alici)
    .select(["-profilImageData", "-coverImage"]);

    const result = user1.friends.findIndex(u => u == req.params.alici);
    if (result != -1) {
        await Nofication.deleteOne({ _id: req.params.noficationid });
        return res.send("Bu kullanıcılar zaten arkadaş");
    }
    await FriendRequest.deleteOne().or([{ istekuser: req.params.gonderen, aliciuser: req.params.alici }, { istekuser: req.params.alici, aliciuser: req.params.gonderen }]);
    user1.friends.push(user2._id);
    user2.friends.push(user1._id);


    await user1.save()
    await user2.save()

    await Nofication.deleteOne({ _id: req.params.noficationid });

    res.send("Arkadaşlık Sağlandı");
})

//? İstek İptal Etme
app.get("/remove-request/:gonderen/:alici", cors(), async (req, res) => {
    const request = await FriendRequest.findOneAndRemove({ istekuser: req.params.gonderen, aliciuser: req.params.alici });
    await Nofication.deleteOne({ _id: request.noficationid });
    res.send("İstek Silindi");
})

//? Fotoları Gönder
app.get("/get-photos/:id", cors(), async (req, res) => {
    const photos = await Post.find({ user: req.params.id, image: { $ne: null } }).select("img");
    res.send(photos);


})

//? Arkadaşları Gönderme
app.get("/get-friends/:id/:userid", cors(), async (req, res) => {
    const youfriends = await User.findById(req.params.id)
    .select("_id")
    .populate("friends", ["profilImage", "firstName", "lastName", "username"]);
    const myFriends = await User.findById(req.params.userid)
    .select("_id")
    .populate("friends", ["username"]);
    for (let i = 0; i < youfriends.friends.length; i++) {
        let arkadasmi = myFriends.friends.find(myf => myf.username == youfriends.friends[i].username);
        if (arkadasmi) {
            youfriends.friends[i].username = true
        }
    }
    res.send(youfriends)
})

//? Yorum Add
app.post("/add-comment/:postid/:userid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
    select("-img");
    post.comments.push({ post: req.params.postid, text: req.body.text, user: req.params.userid });
    await post.save();
    res.send(post)
})

//? Alt Comment Add
app.post("/add-alt-comment/:postid/:userid/:commentid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
    .select("-img");
    const comment = post.comments.id(req.params.commentid);
    comment.altcomment.push({ user: req.params.userid, text: req.body.text })
    // comment.altcomments.push({user : req.params.userid, text : req.body.text});
    await post.save();
    res.send(post)
})

//? Get Comment
app.get("/get-comment/:postid", cors(), async (req, res) => {
    const comment = await Comment.find({ post: req.params.postid })
    .populate({ path:  "user", select : {profilImageData :0 ,coverImage: 0}})
    .populate( { path : "altcomments.user", select : {profilImageData :0 ,coverImage: 0}});
    res.send(comment)
})

//? Like Atma
app.get("/add-like/:postid/:userid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
    .select("-img");

    const result = post.like.findIndex(l => l.user == req.params.userid)
    if (result != -1) {
        return res.send("Bu kullanıcı bu postu zaten beğenmiş")
    }
    post.like.push({ user: req.params.userid });
    await post.save();
    res.send(post)
})

//? Like'ı Geri Alma
app.get("/remove-like/:postid/:userid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
    .select("-img");
    post.like.find(l => l.user == req.params.userid).remove()
    await post.save();
    res.send(post)
})

//? Mesaj Atma
app.post("/sendmessage/:id/:from", cors(), async (req, res) => {
    const message = await Message.findById(req.params.id)
    const newmessage = { user: req.params.from, text: req.body.text }
    message.read = false;
    message.text.push(newmessage);
    await message.save()
    res.send(newmessage);
})

//? Mesaj Başlatma
app.get("/newmessage/:from/:to", cors(), async (req, res) => {

    const newMessage = Message();
    // await newMessage.save();
    const user1 = await User.findById(req.params.from)
    .select(["-profilImageData","-coverImage"]);

    const user2 = await User.findById(req.params.to)
    .select(["-profilImageData","-coverImage"]);


    user1.messages.push({ user: user2._id, messages: newMessage._id });
    user2.messages.push({ user: user1._id, messages: newMessage._id });


    await user1.save()
    await user2.save()
    await newMessage.save();

    res.send(newMessage);
})

//? Mesajları Alma
app.get("/getmessage/:id", cors(), async (req, res) => {
    const message = await Message.findById(req.params.id)
    .populate({ path: "text.user", select : {profilImageData : 0, coverImage : 0}});
    res.send(message)
})

//? Mesajlasacak Userları Arama
app.post("/getnewmessageusers/:id", cors(), async (req, res) => {

    const users = await User.find({ _id: { $ne: req.params.id } })
        .select(["username", "profilImage", "firstName", "lastName"])
        .or(
            { firstName: { $regex: req.body.name, $options: "i" } },
            { lastName: { $regex: req.body.name, $options: "i" } },
            { username: { $regex: req.body.name, $options: "i" } },
        )
    const varolanmesajlar = await User.findById(req.params.id)
        .populate("messages.user", "username")
        .select("messages.user");

    let datalist = [];
    for (let i = 0; i < users.length; i++) {
        let result = varolanmesajlar.messages.find(u => u.user.username == users[i].username)
        if (result == undefined) {
            datalist.push(users[i])
        }
    }
    if (datalist.length > 5) {
        datalist.splice(5, datalist.length)
    }

    res.send(datalist);
})

//? Get Nofications
app.get("/get-nofication/:aitolan", cors(), async (req, res) => {
    console.log("get-noficaton");
    const nofications = await Nofication.find({ aitolan: req.params.aitolan, worktype: ["like", "comment"] })
    .populate("bildirimiyapan", ["profilImage", "username"]);
    res.send(nofications)
})

//? Nofication Add
app.post("/add-nofication/:aitolan/:bildirimiyapan", cors(), async (req, res) => {
    console.log("add-nofication");
    const newNofication = Nofication({ worktype: req.body.type, aitolan: req.params.aitolan, bildirimiyapan: req.params.bildirimiyapan })
    await newNofication.save();
    res.send(newNofication);

})

//? Get Request Nofication
app.get("/get-request-nofication/:userid", cors(), async (req, res) => {
    const nofications = await Nofication.find({ aitolan: req.params.userid, worktype: "request" })
        .populate("bildirimiyapan", ["profilImage", "firstName", "lastName"]);
    return res.send(nofications);
})

//? Delete Message
app.get("/delete-message/:userid/:touserid/:messageid", cors(), async (req, res) => {

    const user1 = await User.findById(req.params.userid)
    .select(["-profilImageData","-coverImage"]);

    const user2 = await User.findById(req.params.touserid)
    .select(["-profilImageData","-coverImage"]);

    const index1 = user1.messages.findIndex(u => u.messages == req.params.messageid)
    const index2 = user2.messages.findIndex(u => u.messages == req.params.messageid)

    user1.messages.splice(index1, 1)
    user2.messages.splice(index2, 1)

    await user1.save();
    await user2.save();

    return res.send([user1.messages, user2.messages]);
})

//? Anasayfada yeni postlar alma
app.get("/get-posts/:userid/:ofset", cors(), async (req, res) => {
    const user = await User.findById(req.params.userid)
        .populate("friends", "_id")
        .select(["-profilImageData", "-coverImage"]);


    let id_list = [];
    for (let i = 0; i < user.friends.length; i++) {
        id_list.push(user.friends[i]._id)
    }
    id_list.push(user._id)
    const posts = await Post.find({ user: id_list })
        .sort({ date: -1 })
        .populate({ path: "user", select: { profilImageData: 0, coverImage: 0 } })
        .populate("comments")
        .populate({ path: "comments.user", select: { profilImageData: 0, coverImage: 0 } })
        .populate({ path: "comments.altcomment.user", select: { profilImageData: 0, coverImage: 0 } })
        .populate({ path: "like.user", select: { profilImageData: 0, coverImage: 0 } })
        .skip(req.params.ofset)

    res.send(posts)
})





var Jimp = require('jimp');

//todo DENEME 
app.get("/deneme", cors(), async (req, res) => {

    const postlist = await Post.find({ "img.data": { $ne: null } }).select("_id")

    console.log(postlist);

    for (let i = 0; i < postlist.length; i++) {
        let post = await Post.findById(postlist[i]._id);

        fs.writeFileSync(__dirname + `/images/${post._id}.jpeg`, post.img.data);

        //? Fotoğraf kalitesi düşürme
        Jimp.read(__dirname + `/images/${post._id}.jpeg`)
            .then(lenna => {
                lenna
                    .resize((lenna.bitmap.width / 2), (lenna.bitmap.height / 2))
                    .quality(10) // set JPEG quality
                    .write(__dirname + `/images/${post._id}.jpeg`); // save
            })
            .catch(err => {
                console.error(err);
            });

        //? Fotoğrafı Veritabınana kayıt etme
        post.img.data = fs.readFileSync(__dirname + `/images/${post._id}.jpeg`);
        await post.save()
        console.log("Resim Veritabanına Kayıt Edildi");
    }

    return res.send(postlist)

})

//todo DENEME 2
app.get("/deneme2", cors(), async (req, res) => {

    const postlist = await Post.find({ "img.data": { $ne: null } }).select("_id")

    for (let i = 0; i < postlist.length; i++) {
        let post = await Post.findById(postlist[i]._id);

        //? Fotoğrafı Veritabınana kayıt etme
        post.img.data = fs.readFileSync(__dirname + `/images/${post._id}.jpeg`);
        await post.save()
        console.log("Resim Veritabanına Kayıt Edildi");
    }

    return res.send(postlist)

})




app.use((err, req, res, next) => {
    logger.error({ message: err })
    console.log(err);
    res.status(500).send("Hata meydana geldi.");
    next(err);
})

console.log("object");
(async () => {
    try {
        await mongoose.connect("mongodb+srv://alperen:135790@social-media.kttxyjd.mongodb.net/Social-Media?retryWrites=true&w=majority");
        console.log("MongoDb Connect");
        logger.info("MongoDb Database connect");

    } catch (err) {
        console.log(err);
        logger.error("MongoDb Database NOT connect");
    }
})()


app.listen(process.env.PORT || 3000, () => {
    console.log("3000 port listening");
})
