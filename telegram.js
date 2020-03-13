/* eslint-disable no-console */
const axios = require('axios');

require('dotenv').config();

const sendMessage = function sendMessage(msg) {
    axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
        chat_id: process.env.TELEGRAM_CHANNEL,
        text: msg
    }).then (response => {
        console.log(response.data.result.text);
    }).catch (err => {
        console.log(err);
    });
};

module.exports.sendMessage = sendMessage;
