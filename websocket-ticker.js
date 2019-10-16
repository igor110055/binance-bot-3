require('dotenv').config();

const binance = require( './node-binance-api' )().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
  });
// const binance = new Binance();
global.ticker = {};



