const express = require('express');
var exec = require('child_process').exec;
const moment = require('moment-timezone');
const {BinBot} = require('./binbot.js');
const {getOrder} = require('./database');
const axios = require('axios');
require('dotenv').config();
require('log-timestamp');

const bot = new BinBot();

bot.subscribe();

const app =express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
app.use(express.json());
const port = +process.env.CONTROL_PORT;

app.get('/', (req, res) => res.send('server status okay'));

function apiResponse(data, stat = true) {
  return {
      status: stat,
      msg: stat ? "success" : "failure",
      data
  };
}

const binance = require('./node-binance-api')().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    verbose:true,
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
  });

app.get('/settings', (req, res) => {
    try{
        let result = {};
        result.totalUSDT = bot.totalUsdtd;
        result.currentUSDTBalance = (!bot.isEmpty(bot.balance))?bot.balance['USDT'].available:0;
        result.totalUSDTProfit = bot.totalUsdtProfit;
        result.totalUSDTProfitPercentage = bot.totalUsdtProfit/Math.abs(bot.totalUsdtd-bot.totalUsdtProfit)*100;
        result.stoploss = process.env.STOP_LOSS;
        result.takeprofit = process.env.TAKE_PROFIT;
        res.json(apiResponse({
            result: result
        }));
    } catch (error){
        console.log(error);
    }
});

app.get('/symbolInfo', (req, res) => {
    try{
        let result = bot.usdtProfit;
        res.json(apiResponse({
            result: Object.keys(result).map(key => ({
                ...result[key],
                asset: (!bot.isEmpty(bot.balance)) ? bot.balance[key.replace('USDT', '')].available : {},
                assetUsdtValue: (!bot.isEmpty(bot.balance))?bot.balance[key.replace('USDT', '')].usdtTotal:0,
                currentPricePercent: bot.currentPercent[key],
                usdtProfit: result[key].value,
                usdtProfitPercent: (result[key].value/Math.abs(bot.totalUsdtd-bot.totalUsdtProfit)*100).toFixed(2)
            }))
        }));
    } catch (error){
        console.log(error);
    }
});

/**
 * Get balance of the symbol
 */
app.get('/get_balance', (req, res) => {
    let {asset} = req.body;
    binance.balance((error, balances) => {
        // if ( error ) console.error(error);
        res.json(apiResponse({
            result: balances[asset]
        }));
      });
});

app.get('/get_balances', (req, res) => {
    binance.balance((error, balances) => {
        if ( error ) console.error(error.body);
        let results = bot.balance;
        res.json(apiResponse({
            result: results
        }));
      });
});

/**
 * Get price of the symbol
 */
app.get('/get_price', (req, res) => {
    console.log(req.body);
    let {symbol} = req.body;
    // Get price from Binance api
    binance.prices(symbol, (error, ticker) => {
        console.log("Price of BNB: ", ticker.BNBBTC);
        const symbol_price = ticker[symbol];
        res.json(apiResponse({
            result: symbol_price
        }));
      });
});

/* Get orders */
app.get('/get_order', (req, res)=>{
    let{apiKey, pair, startTime, endTime, limit} = req.query;
    if(startTime){
        startTime = moment(startTime).format('YYYY-MM-DD HH:mm:ss');
    }
    if(endTime){
        endTime = moment(endTime).format('YYYY-MM-DD HH:mm:ss');
    }

    getOrder(apiKey, pair, startTime, endTime, limit).then(response=>{
        res.json(apiResponse({
            result: response
        }));
    }).catch(error=>{
        console.log(error);
    })
});

/* Get trade history */
app.get('/trade_history', (req, res) => {
    let {symbol} = req.body;
    // Get price from Binance api
    binance.trades(symbol, (error, trades, symbol) => {
        res.json(apiResponse({
            result: trades
        }));
      });
});

/* Get trade history */
app.get('/withdraw_history', (req, res) => {
    // Get price from Binance api
    binance.withdrawHistory((error, response) => {
        res.json(apiResponse({
            result: response
        }));
      }, "USDT");
});

/* Need test for live website */
app.get('/open_orders', (req, res) => {
    let {symbol} = req.body;
    binance.openOrders(symbol, (error, openOrders, symbol) => {
        res.json(apiResponse({
            result: openOrders
        }));
      });
});

app.post('/market_order', (req, res) => {
    let {symbol:symbol, quantity:quantity, side:side} = req.body;
    if(side === "BUY"){
        binance.marketBuy(symbol, quantity, (error, response) => {
            if(error) console.log(error);
            // Now you can limit sell with a stop loss, etc.
            res.json(apiResponse({
                result: response
            }));
          });
    }else if(side === "SELL"){
        binance.marketSell(symbol, quantity, (error, response) => {
            res.json(apiResponse({
                result: response
            }));
          });
    }
});

app.get('/uptime', (req, res) => {
    function format(seconds){
        function pad(s){
          return (s < 10 ? '0' : '') + s;
        }
        var hours = Math.floor(seconds / (60*60));
        var minutes = Math.floor(seconds % (60*60) / 60);
        var seconds = Math.floor(seconds % 60);
      
        return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
      }
      var uptime = format(process.uptime());
      res.json(apiResponse({
        result: uptime
    }));
});

app.post('/git_pull', (req, res) => {
    console.log('Push received');
    exec('./shell_scripts/gitpull.sh', function(error, stdout, stderr) {
        // Log success in some manner
        res.json({
        port: process.env.CONTROL_PORT,
        error: error,
        stdout: stdout,
        stderr: stderr
        });
    });
})

app.post('/server_restart', (req, res) => {
    console.log('Server restarting..');
    exec('./shell_scripts/restart.sh', function(error, stdout, stderr) {
        res.json({
            port: process.env.CONTROL_PORT,
            error: error,
            stdout: stdout,
            stderr: stderr
            });
    });
})

app.post('/process_stop', (req, res) => {
    console.log('bot process stop');
    bot.unsubscribe();
    res.json({
        result: "Success"
        });
})

app.post('/process_start', (req, res) => {
    console.log('bot process stop');
    bot.subscribe();
    res.json({
        result: "Success"
        });
})

app.listen(port, () => console.log(`bot app listening on port ${port}!`));