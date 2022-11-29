const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
    host: "smtp.yandex.com.tr",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: "alperen.nuroglu@yandex.com", // generated ethereal user
        pass: "ooiubalbvcnlkrnp", // generated ethereal password
    },
});


module.exports = transporter;