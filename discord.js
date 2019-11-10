const axios = require('axios');
require('dotenv').config();

const postMessage = function postMessage(msg) {
    axios.post(process.env.DISCORD_URL, {
        content: msg
    }).then (response => {
        console.log('posting to discord success');
    }).catch (err => {
        console.log(err);
    });
};

module.exports.postMessage = postMessage;