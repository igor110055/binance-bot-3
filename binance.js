const express = require('express');
const BinanceBot = require('./binbot.js');
require('dotenv').config();
require('log-timestamp');

const app =express();
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

/**
 * Get balance of the symbol
 */
app.get('/get_balance', (req, res) => {
    let {asset} = req.body;
    let result = asset;
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

app.listen(port, () => console.log(`bot app listening on port ${port}!`));