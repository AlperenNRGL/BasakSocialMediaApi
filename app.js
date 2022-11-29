const express = require('express');
const mongoose = require('mongoose');
const app = express();

require("express-async-errors")

const User = require("./models/user-model");
const Post = require("./models/post-model");
const Message = require("./models/message-model");
const FriendRequest = require("./models/friends-request");

const fs = require("fs")

var cors = require('cors');
const Nofication = require('./models/nofication-models');
const logger = require('./helpers/winston');


const transporter = require("./helpers/mailer");

app.use(express.json())
app.use(cors())

app.get("/", cors(), (req, res) => {
    res.send("Home Page")
})

//? User Sorgulama
app.get("/users/:name", cors(), async (req, res) => {
    const users = await User.find().or(
        { firstName: { $regex: req.params.name, $options: "i" } },
        { username: { $regex: req.params.name, $options: "i" } },
        { lastName: { $regex: req.params.name, $options: "i" } },
    )
        .limit(4)
        .select(["profilImage", "username", "firstName", "lastName"]);
    res.send(users);
})

//? Arkaşlık bitirme
app.get("/remove-friend/:userid/:friendid", cors(), async (req, res) => {
    let user = await User.findById(req.params.userid)
        .select("friends");

    const index1 = user.friends.indexOf(req.params.friendid);
    if (index1 == -1)
        return res.status(500).send("Bu bişi arkadaşınız değil")
    user.friends.splice(index1, 1);
    await user.save();
    await Nofication({ bildirimiyapan: req.params.userid, aitolan: req.params.friendid, worktype: "unrequest" }).save()

    res.send("remove friends")
})

//? İstek Gönderme
//! Artık kullanılmıyor.
app.get("/friend-request/:gonderen/:alici", cors(), async (req, res) => {
    const istek = FriendRequest({ istekuser: req.params.gonderen, aliciuser: req.params.alici });
    const varmi = await FriendRequest.find()
        .or({ istekuser: req.params.gonderen, aliciuser: req.params.alici },
            { istekuser: req.params.alici, aliciuser: req.params.gonderen });

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
app.get("/add-friend/:gonderen/:alici", cors(), async (req, res) => {

    const user1 = await User.findById(req.params.gonderen)
        .select("friends");

    if (user1.friends.indexOf(req.params.alici) != -1)
        return res.status(500).send("Bu kişi zaten arkdaşınız");

    await Nofication({ bildirimiyapan: req.params.gonderen, aitolan: req.params.alici, worktype: "request" }).save()
    user1.friends.push(req.params.alici);
    await user1.save()
    res.send("Arkadaşlık Sağlandı");
})

//? İstek İptal Etme
//! Artık kullanılmıyor.
app.get("/remove-request/:gonderen/:alici", cors(), async (req, res) => {
    const request = await FriendRequest.deleteOne({ istekuser: req.params.gonderen, aliciuser: req.params.alici });
    await Nofication.deleteOne({ _id: request.noficationid });
    res.send("İstek Silindi");
})

//? Fotoları Gönder
app.get("/get-photos/:id", cors(), async (req, res) => {
    const photos = await Post.find({ user: req.params.id, image: { $ne: null } }).select("img");
    res.send(photos);
})

//? Arkadaşları Gönderme
//! Kullanılmıyor
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
        .populate({ path: "user", select: "_id" })
        .select("comments");
    post.comments.push({ post: req.params.postid, text: req.body.text, user: req.params.userid });
    await post.save();

    const newnofication = Nofication({ bildirimiyapan: req.params.userid, aitolan: post.user._id, worktype: "comment" })
    await newnofication.save();

    res.send(post)
})

//? Alt Comment Add
app.post("/add-alt-comment/:postid/:userid/:commentid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
        .populate({ path: "user", select: "_id" })
        .select("comments");
    const comment = post.comments.id(req.params.commentid);
    comment.altcomment.push({ user: req.params.userid, text: req.body.text })
    await post.save();

    const newnofication = Nofication({ bildirimiyapan: req.params.userid, aitolan: post.user._id, worktype: "comment" })
    await newnofication.save();
    res.send(post)
})

//? Get Comment
//! Kullanılmıyor
app.get("/get-comment/:postid", cors(), async (req, res) => {
    const comment = await Comment.find({ post: req.params.postid })
        .populate({ path: "user", select: { profilImageData: 0, coverImage: 0 } })
        .populate({ path: "altcomments.user", select: { profilImageData: 0, coverImage: 0 } });
    res.send(comment)
})

//? Like Atma
app.get("/add-like/:postid/:userid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
        .populate({ path: "user", select: "_id" })
        .select("like");

    const result = post.like.findIndex(l => l.user == req.params.userid)
    if (result != -1) {
        return res.send("Bu kullanıcı bu postu zaten beğenmiş")
    }
    post.like.push({ user: req.params.userid });
    await post.save();

    const newNofication = Nofication({ worktype: "like", aitolan: post.user._id, bildirimiyapan: req.params.userid })
    await newNofication.save();

    res.send(post)
})

//? Like'ı Geri Alma
app.get("/remove-like/:postid/:userid", cors(), async (req, res) => {
    const post = await Post.findById(req.params.postid)
        .select("like");
    const like = post.like.find(l => l.user == req.params.userid)
    console.log(like);
    if (like == undefined) {
        return res.send("Bu kullanıcı zaten bu postu beğenmemiş");
    }
    like.remove()
    await post.save()
    res.send(post)
})

//? Mesaj Atma
app.post("/sendmessage/:id/:from", cors(), async (req, res) => {
    const message = await Message.findById(req.params.id).select("text")
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
        .select("messages");

    const user2 = await User.findById(req.params.to)
        .select("messages");


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
        .populate({ path: "text.user", select: { profilImage: 1, usename: 1, firstName: 1, lastName: 1 } });
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
    if (req.params.aitolan == req.params.bildirimiyapan) {
        return res.send("Kendine bildirim yapma")
    }
    const newNofication = Nofication({ worktype: req.body.type, aitolan: req.params.aitolan, bildirimiyapan: req.params.bildirimiyapan })
    await newNofication.save();
    res.send(newNofication);

})

//? Get Request Nofication
app.get("/get-request-nofication/:userid", cors(), async (req, res) => {
    const nofications = await Nofication.find({ aitolan: req.params.userid, $or: [{ worktype: "request" }, { worktype: "unrequest" }] })
        .populate("bildirimiyapan", ["profilImage", "firstName", "lastName"]);
    return res.send(nofications);
})

//? Delete Message
app.get("/delete-message/:userid/:touserid/:messageid", cors(), async (req, res) => {

    const user1 = await User.findById(req.params.userid)
        .select(["-profilImageData", "-coverImage"]);

    const user2 = await User.findById(req.params.touserid)
        .select(["-profilImageData", "-coverImage"]);

    const index1 = user1.messages.findIndex(u => u.messages == req.params.messageid)
    const index2 = user2.messages.findIndex(u => u.messages == req.params.messageid)

    user1.messages.splice(index1, 1)
    user2.messages.splice(index2, 1)

    await user1.save();
    await user2.save();

    return res.send([user1.messages, user2.messages]);
})

//? Anasayfada yeni postlar alma
//! Kullanılmıyor
app.get("/get-posts/:userid/:ofset", cors(), async (req, res) => {
    const user = await User.findById(req.params.userid)
        .populate("friends", "_id")
        .select("_id");

    let id_list = [];
    for (let i = 0; i < user.friends.length; i++) {
        id_list.push(user.friends[i]._id)
    }
    id_list.push(user._id)

    let posts = await Post.find({ user: id_list })
        .sort({ date: -1 })
        .populate({ path: "user", select: { profilImage: 1, username: 1 } })
        .populate("comments")
        .populate({ path: "comments.user", select: { profilImage: 1, username: 1 } })
        .populate({ path: "comments.altcomment.user", select: { profilImage: 1, username: 1 } })
        .populate({ path: "like.user", select: { profilImage: 1, username: 1 } })
        .skip(req.params.ofset)
        .select("-img");

    posts.splice(3, posts.length - 3)

    res.send(posts)
})

app.get("/delete-post/:id", async (req, res) => {
    await Post.deleteOne({ _id: req.params.id });
    res.send("Post Silindi");
})

app.get("/sikayet/:userid/:postid", async (req, res) => {

    const user = await User.findById(req.params.userid).select(["firstName", "lastName"]);
    const post = await Post.findById(req.params.postid)
    .populate({path : "user", select : ["firstName", "lastName"]})
    .select(["imgPath", "text"]);

    transporter.sendMail({
        from: 'alperen.nuroglu@yandex.com', // sender address
        to: 'alperen.nuroglu@yandex.com', // list of receivers
        subject: `Şikayet başvurusu ${post._id} `, // Subject line
        html: `
        <div><b>Post id : </b>${post._id}</div>
        <div><b>Post sahibi : </b>${post.user.firstName} ${post.user.lastName} </div>
        <div><b>Şikayet yapan : </b>${user.firstName} ${user.lastName} </div>
        <hr>
        <p>${post.text}</p>
        <img width="350px" height="350px" src="http://basaksocialmedia.herokuapp.com/static/uploads/${post.imgPath}">
        `,
    })
    return res.send("sikayet")
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
