// const {winston, format} = require('winston');
// const { combine, timestamp, label, prettyPrint } = format;

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, prettyPrint } = format;
require('winston-mongodb').MongoDB;


const logger = createLogger({
    level: "info",
    format: combine(
        label({ label: "Loglama" }),
        timestamp(),
        prettyPrint(),
    ),
    transports: [
        
        new transports.Console({ level: "error" }),
        new transports.File({ level: "error", filename: "log/error.log",maxsize:'1MB', }),
        new transports.File({ filename: "log/info.log", maxsize:'1MB', }),
        new transports.MongoDB({
            level : "error",
            db: 'mongodb+srv://alperen:135790@social-media.kttxyjd.mongodb.net/Social-Media?retryWrites=true&w=majority',
            options: {
                useUnifiedTopology: true,
            },
            collection: 'log-api',
            handleExceptions : true

        })
    ]
})

module.exports = logger