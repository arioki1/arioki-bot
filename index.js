const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config()
const app = express()
const {CHAT_ID_TEST, TELEGRAM_BOT_TOKEN, WEBHOOK_NEWSPAPER_URL} = process.env
const BASE_URL_TELEGRAM = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
const { Webhook } = require('discord-webhook-node');

const instance = axios.create({
    baseURL: BASE_URL_TELEGRAM,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 10000,
});

const rgGeturl = new RegExp(
    "https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|www\\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\\.[^\\s]{2,}|https?:\\/\\/(?:www\\.|(?!www))[a-zA-Z0-9]+\\.[^\\s]{2,}|www\\.[a-zA-Z0-9]+\\.[^\\s]{2,}"
    , "gm"
);

const rgInsidelearn = new RegExp("insidelearn\.com", "gm");

app.use(bodyParser.json({strict: false}));

app.all('/bot', async (req, res) => {
    let {message} = req.body
    let {message_id, from, chat, date, text} = message || {}
    let {id: chatId, first_name, last_name, type} = chat || {}
    if (text) {
        if (text.toLowerCase() === 'test') {
            await sendMessageText(chatId, text)
        }
    }

    let messageStr = ''
    if (message) {
        messageStr = JSON.stringify(message)
        messageStr = messageStr.replace(/{|}|"|'|]|\[|\\n|,/g, ' ');
        messageStr = messageStr.replace(/,/g, ' ');
    }

    let listUrl = messageStr.match(rgGeturl)
    if (listUrl) {
        if (listUrl.length > 0) {
            let insider = listUrl[0].match(rgInsidelearn)
            if (insider) {
                if (insider.length > 0) {
                    await getUrlUdemy(chatId, listUrl[0])
                }
            }
        }
    }

    res.send('Hello World!')
})

app.post('/rss', async (req, res) => {
    const {title, link, description} = req.body
    let text = `Update Erepublik Newspaper from eIndonesia\n\n ${title} \n${description}`
    let button = [[{
        "text": 'READ ARTICLE',
        "url": link
    }]]
    await sendMessageText(CHAT_ID_TEST, text, button)
    await sendDiscordWebHook(title, description, link)
    res.send('Hello World!')
})

app.all('/test', async (req, res) => {
    let text = `Update Erepublik Newspaper from eIndonesia`
    let button = [[{
        "text": 'READ ARTICLE',
        "url": "google.com"
    }]]
    await sendMessageText(CHAT_ID_TEST, text, button)
    await sendDiscordWebHook('test', text, "http://google.com")
    res.send('Hello World!')
})

const sendMessageText = (chatId, text, button) => {
    let data = {
        chat_id: chatId,
        text: text,
    }

    if (button) {
        data['reply_markup'] = {
            "inline_keyboard": button
        }
    }

    return instance.post('/sendMessage', data)
}

async function fetchHTML(url) {
    const {data} = await axios.get(url)
    return cheerio.load(data)
}

const getUrlUdemy = async (chatId, url) => {
    const $ = await fetchHTML(url)
    await sendMessageText(chatId, 'data sedang di proses untuk mengambil url udemy')
    let data1 = $('a.btn-purplex')
    let data2 = $('a.btn-primary')
    let title = $('div.job-company-info').find('h1').text()
    console.log(title)
    let data = []
    let button = null
    let name = ''
    let link = ''

    if (data1.length > 0) {
        data = data1
    }

    if (data2.length > 0) {
        data = data2
    }

    if (data.length > 0) {
        data.each(async function () {
            name = $(this).text();
            link = $(this).attr('href');
        })

        button = [[{
            "text": name,
            "url": link
        }]]

        let text = `${title} \n\nEnroll Now : ${link}`
        await sendMessageText(chatId, text, button)
    }

    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve()
        }, 1500);
    })
}

const sendDiscordWebHook = async (title, message, url) => {
    const hook = new Webhook(WEBHOOK_NEWSPAPER_URL);
    await hook.info(title, message, url);
}

module.exports.handler = serverless(app);
