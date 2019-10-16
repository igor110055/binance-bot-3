require('dotenv').config();

const binance = require('./node-binance-api')().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
  });

global.ticker = {};
global.balance = {};

// Get 24h price change statistics for all symbols
binance.websockets.prevDay( false, function ( error, obj ) {
    global.ticker[obj.symbol] = obj;
} );

// // Get your balances
// binance.balance((error, balances) => {
//     if ( error ) console.error(error);
//     let btc = 0.00;
//     for ( let asset in balances ) {
//         let obj = balances[asset];
//         obj.available = parseFloat(obj.available);
//         //if ( !obj.available ) continue;
//         obj.onOrder = parseFloat(obj.onOrder);
//         obj.btcValue = 0;
//         obj.btcTotal = 0;
//         if ( asset == 'BTC' ) obj.btcValue = obj.available;
//         else if ( asset == 'USDT' ) obj.btcValue = obj.available / global.ticker.BTCUSDT;
//         else obj.btcValue = obj.available * global.ticker[asset+'BTC'];

//         if ( asset == 'BTC' ) obj.btcTotal = obj.available + obj.onOrder;
//         else if ( asset == 'USDT' ) obj.btcTotal = (obj.available + obj.onOrder) / global.ticker.BTCUSDT;
//         else obj.btcTotal = (obj.available + obj.onOrder) * global.ticker[asset+'BTC'];

//         if ( isNaN(obj.btcValue) ) obj.btcValue = 0;
//         if ( isNaN(obj.btcTotal) ) obj.btcTotal = 0;

//         btc += obj.btcTotal;
//         global.balance[asset] = obj;
//     }
//     //fs.writeFile("json/balance.json", JSON.stringify(global.balance, null, 4), (err)=>{});
// });





