import { ConvertToEthiopic , EtDatetime, ETC, BahireHasab } from 'abushakir'
const Twitter = require('twitter');
const fsPromise = require('fs/promises');
const fs = require('fs');

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

function ትዊት() {
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
            client.post('statuses/update', { status }, (error, tweet, response) => {
                if(error) throw error;
            })        
        } else {
            console.log('Progress didn\'t change')
        }
    })
}

ትዊት()