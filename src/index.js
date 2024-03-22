import { ConvertToEthiopic , EtDatetime, ETC, BahireHasab } from 'abushakir'
const Twitter = require('twitter');
const fsPromise = require('fs/promises');
const fs = require('fs');
const axios = require("axios")

require('dotenv').config();

function progress() {
    let nowInEt = new EtDatetime()
    let firstDayOfNextYear = new EtDatetime(nowInEt.date.year +1 , 1, 1)
    let diff = firstDayOfNextYear.difference(nowInEt).inDays;

    return {
        progress: 100 - (diff / 365) * 100,
        ascii: getASCIIProgressFromPt(100 - (diff / 365) * 100),
        daysRemaining: diff,
        daysRemainingAm: ConvertToEthiopic(diff),
        progressAm: ConvertToEthiopic(Math.round(100 - (diff / 365) * 100)) + '%'
    };
}

function getASCIIProgressFromPt(pt) {
    const nil = '░';
    const nnil = '▓';
    let finalResult = '';

    if (!Number.parseFloat(pt) || pt > 100 || pt < 0) return '░░░░░░░░░░░░░░░░'

    let filledCount = Math.ceil(pt / 6.25);
    let nonFilledCount = Math.ceil(16 - filledCount);

    while (filledCount > 0) {
        finalResult += nnil;
        --filledCount;
    }

    while (nonFilledCount > 0) {
        finalResult += nil;
        --nonFilledCount;
    }

    return finalResult;
}

async function shouldItTweet(progress) {
    const fileExist = fs.existsSync('./progress.txt')
    if (!fileExist) {
        await fsPromise.writeFile('./progress.txt' , progress.toString())
        return true; // File didn't exist
    } else {
        const fileContent = Number.parseInt(await fsPromise.readFile('./progress.txt'))
        await fsPromise.writeFile('./progress.txt' , progress.toString())
        return (progress > fileContent)
    }
}

function sendToTelegram(botToken, text) {
    axios.get(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=@yearprogresset&text=${text}`).then(r => console.dir(r))
        .catch(e => {
            console.error(e)
        })
}

function sendToMultipleTelegramGroups(botToken, text, groupIds) {
    for (let groupId of groupIds) {
        let url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${groupId}&text=${text}`
        if (groupId.match(/@/g).length > 1) {
            url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=@${groupId.split('@')[1]}&text=${text}&message_thread_id=${groupId.split('@')[2]}`
        }
        axios.get(url).then(r => console.dir(r))
            .catch(e => {
                console.error(`Failed to send message to group ${groupId}:`, e);
            })
    }
}

function publish() {
    let client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });

    const data = progress()
    const status = data.ascii + ' ' + data.progressAm + ' (' + Math.round(data.progress) + '%)'

    console.dir({ status })

    shouldItTweet(Math.round(data.progress)).then(result => {
        if (result) {
            client.post('statuses/update', { status: status + '\n\nYou can also find us on telegram ' + process.env.TELEGRAM_LINK }, (error, tweet, response) => {
                if(error) console.error(error);
            })

            sendToTelegram(process.env.TELEGRAM_BOT_TOKEN, status)
            
            // for forum support add the group username with @groupname@threadid
            const groupIds = ["@dagmawibabichat"];
            sendToMultipleTelegramGroups(process.env.TELEGRAM_BOT_TOKEN, status, groupIds);
        } else {
            console.log('Progress didn\'t change')
        }
    })
}

publish()
