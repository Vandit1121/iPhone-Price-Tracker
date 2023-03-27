const telegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const token = process.env.token;
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const mongoose = require("mongoose");
const url = "https://www.flipkart.com/apple-iphone-14-blue-128-gb/p/itmdb77f40da6b6d";
const CronJob = require('cron').CronJob;
const keepAlive = require('./server');
// const express = require("express");


// const app = express();

// app.set('view engine', 'ejs');


// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.mongodbServer, { useNewUrlParser: true })

        console.info(`Connected to database on Worker process: ${process.pid}`)
        tracking();
    } catch (error) {
        console.error(`Connection error: ${error.stack} on Worker process: ${process.pid}`)
        process.exit(1)
    }
}

const User = require('./models/userModel');
const Admin = require('./models/adminModel');

let price;

async function configureBrowser() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    return page;
}

async function checkPrice(page) {
    await page.reload();
    let html = await page.evaluate(() => document.body.innerHTML);
    const $ = cheerio.load(html);
    // $(html);
    $("._30jeq3._16Jk6d", html).each(function () {
        price = $(this).text();
        // console.log(price);
        sendNotifications();
    })
}

async function tracking() {
    const page = await configureBrowser();
    let job = new CronJob('*/10 * * * * *', function () {
        checkPrice(page);
    }, null, true, null, null, true);
    job.start();
}

async function sendNotifications() {
    const users = await User.find();
    try {
        users.forEach(user => {
            bot.sendMessage(user.chat_id, "Today, iPhone 14's price is " + price + "\n" + url);
        });
        // console.log(users);
    }
    catch (error) {
        console.log(error);
    }
};

async function newUser(name, chat_id) {
    if (await User.findOne({ chat_id: chat_id }).exec() === null) {
        const user1 = new User({
            name: name,
            chat_id: chat_id
        });
        user1.save();
        return true;
    }
    else {
        return false;
    }
}

async function removeUser(name, chat_id) {
    // console.log(name);
    // console.log(chat_id);
    if (await User.deleteOne({ name: name, chat_id: chat_id }).then(()=>{
        bot.sendMessage(chat_id,"Successfully Unsubscribed.");
    }).catch(()=>{
        console.log(error);
    }));
}

async function checkAdmin(name, password) {
    if (await Admin.findOne({ name: name, password: password }).exec() === null) {
        return false;
    }
    else {
        return true;
    }
}
connectDb();
keepAlive();



const bot = new telegramBot(process.env.token, { polling: true });
let admin = 0;
bot.onText(/\/start/, (message) => {
    let chat_id = message.chat.id;
    // console.log(message);
    bot.sendMessage(chat_id, "Welcome " + message.chat.first_name)
});

bot.onText(/\/subscribe/, (msg) => {
    // console.log(msg);
    let chat_id = msg.chat.id;
    newUser(msg.chat.first_name + " " + msg.chat.last_name, chat_id).then(res => {
        if (res) {
            bot.sendMessage(chat_id, "Successfully Subscribed. You will be notified iPhone's Price every day.");
        }
        else {
            bot.sendMessage(chat_id, "Already subscribed for updates.");
        }
    });
});

bot.onText(/\/unsubscribe/, (msg) => {
    let chat_id = msg.chat.id;
    removeUser(msg.chat.first_name + " " + msg.chat.last_name, chat_id);
    // bot.sendMessage(chat_id, "Successfully Unsubscribed.");
});

bot.onText(/\/end/, (msg) => {
    let chat_id = msg.chat.id;
    bot.sendMessage(chat_id, "👍")
});

bot.onText(/\/create-admin(.+)/, (msg, match) => {
    const username = match[1].split(" ");
    const admin = new Admin({
        name: username[1],
        password: username[2]
    });
    admin.save();
    // console.log(username);
});

bot.onText(/\/admin(.+)/, (msg, match) => {
    // let text=match[1];
    const username = match[1].split(" ");
    checkAdmin(username[1], username[2]).then(res => {
        if (res) {
            bot.sendMessage(msg.chat.id, "Welcome admin.");
            admin = 1;
        }
        else {
            bot.sendMessage(msg.chat.id, "You are not eligible for this features.");
        }
    });
});

bot.onText(/\/add(.+)/, (msg, match) => {
    if (admin === 0) {
        bot.sendMessage(msg.chat.id, "You are not authorized for this features.");
    }
    else {
        const username = match[1].split(" ");
        newUser(username[1] + " " + username[2], username[3]).then(res => {
            if (res) {
                bot.sendMessage(chat_id, "New User successfully added.");
            }
            else {
                bot.sendMessage(chat_id, "Already subscribed for updates.");
            }
        });

    }
});

bot.onText(/\/remove(.+)/, (msg, match) => {
    if (admin === 0) {
        bot.sendMessage(msg.chat.id, "You are not authorized for this features.");
    }
    else {
        const username = match[1].split(" ");
        // console.log(username);
        removeUser(username[1] + " " + username[2], username[3]);
        // bot.sendMessage(chat_id, "Successfully Unsubscribed.");
    }
});
