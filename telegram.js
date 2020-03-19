/* eslint-disable no-console */
const axios = require('axios');

require('dotenv').config();

const sendMessage = function sendMessage(msg) {

    if(process.env.TELEGRAM_ALGO_CHANNEL) {
        axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_ALGO_CHANNEL,
            text: msg
        }).then (response => {
            // console.log(response.data.result.text);
            return;
        }).catch (err => {
            console.log(err);
            return;
        });
    }

    if(process.env.TELEGRAM_MOONMEDIA_CHANNEL) {
        axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_MOONMEDIA_CHANNEL,
            text: msg
        }).then (response => {
            // console.log(response.data.result.text);
            return;
        }).catch (err => {
            console.log(err);
            return;
        });
    }
};

module.exports.sendMessage = sendMessage;
