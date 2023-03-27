const telegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const token = process.env.token;
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const mongoose = require("mongoose");
const url = "https://www.flipkart.com/apple-iphone-14-blue-128-gb/p/itmdb77f40da6b6d";
const CronJob = require('cron').CronJob;

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
        console.log(price);
        sendNotifications();
    })
}

async function tracking() {
    const page = await configureBrowser();
    let job = new CronJob('00 00 08 * * *', function () {
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

async function newUser(name,chat_id){
    if(await User.findOne({ chat_id: chat_id }).exec()===null){
        const user1 = new User({
            name: name ,
            chat_id: chat_id
        });
        user1.save();
        bot.sendMessage(chat_id, "Successfully Subscribed. You will be notified iPhone's Price every day.");
    }
    else
    {
        bot.sendMessage(chat_id, "You are already subscribed.");
    }
}
connectDb();



const bot = new telegramBot(token, { polling: true });

bot.onText(/\/start/, (message) => {
    let chat_id = message.chat.id;
    bot.sendMessage(chat_id, "Welcome " + message.chat.first_name)
});

bot.onText(/\/subscribe/, (msg) => {
    // console.log(msg);
    let chat_id = msg.chat.id;
    newUser(msg.chat.first_name+ " " + msg.chat.last_name,chat_id);
});

bot.onText(/\/end/, (msg) => {
    let chat_id = msg.chat.id;
    bot.sendMessage(chat_id, "👍")
});

