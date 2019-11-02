const express = require('express');
const BinanceBot = require('./binbot.js');
if(process.env.BOT_NAME == 'main'){
    const Accounts = require('./account.js');
}
const {insertUser, getUsers} = require('./database');
const axios = require('axios');
require('dotenv').config();
require('log-timestamp');

const app =express();
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
app.use(express.json());
const port = +process.env.CONTROL_PORT;
const usePairs = process.env.PAIRS.replace(/\s/g,'').split(',');

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
    useServerTime: true // If you get timestamp errors, synchronize to server time at startup
  });

app.get('/settings', (req, res) => {
    try{
        let result = {};
        result.totalUSDT = global.totalUsdtd;
        result.currentUSDTBalance = global.balance['USDT'].available;
        result.totalUSDTProfit = global.totalUsdtProfit;
        result.totalUSDTProfitPercentage = global.totalUsdtProfit/(global.totalUsdtd+Math.abs(global.totalUsdtProfit))*100;
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
        let result = global.statistics;
        res.json(apiResponse({
            result: Object.keys(result).map(key => ({
                ...result[key],
                asset: (global.balance) ? global.balance[key.replace('USDT', '')].available : {},
                assetUsdtValue: global.balance[key.replace('USDT', '')].usdtTotal,
                currentPricePercent: global.currentPercent[key],
                usdtProfit: result[key].usdtProfit,
                usdtProfitPercent: (result[key].usdtProfit/Math.abs(global.totalAbsUsdtProfit)*100).toFixed(2)
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
        let results = global.balance;
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

/* Get trade history */
app.get('/trade_history', (req, res) => {
    console.log(req.body);
    let {symbol} = req.body;
    // Get price from Binance api
    binance.trades(symbol, (error, trades, symbol) => {
        res.json(apiResponse({
            result: trades
        }));
      });
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

app.post('/add_user', (req, res) => {
    let {api_key, secret_key, is_master, master_api_key, account_id, account_name, account_email, server_IP, port, status} = req.body;
    let fillable = {};
    fillable.apiKey = api_key;
    fillable.secretKey = secret_key;
    fillable.isMaster = is_master;
    fillable.masterApiKey = master_api_key;
    fillable.accountId = account_id;
    fillable.accountName = account_name;
    fillable.accountEmail = account_email;
    fillable.serverIP = server_IP;
    fillable.port = port;
    fillable.status = status;
    insertUser(fillable).then(resp=>{
        console.log(`New User Added. ${resp}`);
        res.json(apiResponse({
            result: resp
        }));
    }).catch(err=>{
        res.json(apiResponse({
            result: err
        }));
    })
});

app.get('/bots-list', (req, res)=>{
    if(process.env.BOT_NAME == 'main'){
        let{pageSize, currentPage, orderBy, search} = req.query;
        getUsers(pageSize, currentPage, orderBy, search).then(paginator=>{
            res.json(apiResponse({
                result: paginator
            }));
        }).catch(err=>{
            console.log(err);
        });
    }else{
        res.json(apiResponse({
            result: 'Not allowed'
        }));
    }
});

app.get('/binance_keys', (req, res)=>{
    if(!process.env.BEAR_TOKEN){
        res.json(apiResponse({
            result: "No Bear Token Found"
        }));
    }else{
        try{
            axios.post('https://moontrades.io/api/read/binance/keys',{
                api_token: process.env.BEAR_TOKEN
            }).then((response)=>{
                res.json(apiResponse({
                    result: response.data
                }));
              }).catch(error=>{
                  console.log(error);
              });
        }catch(err){
            console.log(err);
        }
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

app.listen(port, () => console.log(`bot app listening on port ${port}!`));