const fs = require('fs');
const Binance = require( './node-binance-api' );
const binance = new Binance()
const prevDayTickers = {};

const filters = JSON.parse( fs.readFileSync('minimums.json') );

const defaultPairs = [ 'BTCUSDT','ALGOUSDT','ZRXUSDT', 'BNBUSDT',
                       'DASHUSDT','ONTUSDT','ATOMUSDT','XMRUSDT',
                       'FETUSDT','DOGEUSDT','XLMUSDT','ETCUSDT',
                       'ADAUSDT','MATICUSDT','TRXUSDT','LTCUSDT',
                       'BCHUSDT','EOSUSDT','XRPUSDT', 'ETHUSDT' ];

const defaultMgpairs = ['BNBUSDT','BTCUSDT','ETHUSDT','TRXUSDT','XRPUSDT',
                      'EOSUSDT','LINKUSDT','ONTUSDT','ADAUSDT','ETCUSDT',
                      'LTCUSDT','XLMUSDT','USDCUSDT','XMRUSDT','NEOUSDT',
                      'ATOMUSDT','DASHUSDT','ZECUSDT','MATICUSDT','BATUSDT',
                      'IOSTUSDT','VETUSDT','QTUMUSDT','IOTAUSDT','XTZUSDT',
                      'BCHUSDT','RVNUSDT','BUSDUSDT'];

// For all symbols:
binance.websockets.prevDay(false, (error, obj) => {
    if (defaultPairs.includes(obj.symbol)){
        prevDayTickers[obj.symbol] = obj;
    }
});

const lossSteps=[
    {step: 0, percent: 1, orderPercent:0.6},
    {step: 1, percent: 0.97, orderPercent:0.4}
];

const profitSteps = [
    {step:0, percent: 2},
    {step:1, percent: 3},
    {step:2, percent: 4},
    {step:3, percent: 6},
    {step:4, percent: 8},
    {step:5, percent: 10}
];

/** Max Trading Value when creating account, used for trial version */
const initialMaxTrading = 250

module.exports.prevDayTickers = prevDayTickers;
module.exports.defaultPairs = defaultPairs;
module.exports.defaultMgpairs = defaultMgpairs;
module.exports.filters = filters;
module.exports.lossSteps = lossSteps;
module.exports.profitSteps = profitSteps;
module.exports.initialMaxTrading = initialMaxTrading;