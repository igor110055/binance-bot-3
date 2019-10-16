// require('./websocket-ticker.js');
// require('./account.js');
const async = require('async');
const util = require('util');

require('dotenv').config();

const binance = require( './node-binance-api' )().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
  });

const usePairs = process.env.PAIRS.replace(/\s/g,'').split(',');


global.price = {};
global.ticker = {};
global.balance ={};
global.totalUsdtd = 0;
global.symbolPrices = {};
global.orderFilled ={};
global.lastOrder = {};
global.orders = {};
global.symbolInfo = {};
global.filters ={};
global.compare ={};
for(let pair of usePairs){
    global.compare[pair]= 0
}

/* 24hr change
{ symbol: 'BTTUSDT',
  priceChange: '0.00000130',
  priceChangePercent: '0.297',
  weightedAvgPrice: '0.00043830',
  prevClosePrice: '0.00043760',
  lastPrice: '0.00043870',
  lastQty: '105874.00000000',
  bidPrice: '0.00043820',
  bidQty: '354742.00000000',
  askPrice: '0.00043870',
  askQty: '6261218.00000000',
  openPrice: '0.00043740',
  highPrice: '0.00044210',
  lowPrice: '0.00043350',
  volume: '5098557230.00000000',
  quoteVolume: '2234695.09158540',
  openTime: 1571063026371,
  closeTime: 1571149426371,
  firstId: 9797397,
  lastId: 9804097,
  count: 6701 } */

setInterval(() => {
    binance.prevDay(false, (error, prevDay) => {
        // if ( error ) return console.log(error.body);
        for ( let obj of prevDay ) {
            if(!usePairs.includes(obj.symbol)) continue;
            if(typeof global.orderFilled[obj.symbol] === 'undefined'){
                if(typeof global.lastOrder[obj.symbol] !== 'undefined'){
                    let lastOrder = global.lastOrder[obj.symbol];
                    let fillable = {};
                    fillable.symbol = lastOrder.symbol;
                    fillable.executedQty = lastOrder.executedQty;
                    fillable.origQty = lastOrder.origQty;
                    fillable.qty = lastOrder.origQty;
                    fillable.transactTime = lastOrder.time;
                    fillable.side = lastOrder.side;
                    fillable.price = lastOrder.price;
                    global.orderFilled[obj.symbol] = fillable;
                }else{
                    global.orderFilled[obj.symbol] = {};
                }
            }
            const current = parseFloat(obj.bidPrice);
            const average = parseFloat(obj.weightedAvgPrice);

            // console.log(global.orderFilled[obj.symbol]);
            // console.log(`Current: ${current}`);
            // console.log(`Average: ${average}`);
            if(current <= average){
                if(global.compare[obj.symbol] >= 0) {
                    if( typeof(global.orderFilled[obj.symbol]) != 'undefined' ) {
                        /* Check previous order history */
                        if ( isEmpty(global.orderFilled[obj.symbol]) || global.orderFilled[obj.symbol].side == 'SELL'){
                            /* check symbol price is defined */
                            if(typeof global.symbolPrices[obj.symbol] != 'undefined' && global.totalUsdtd > 0){
                                let perUsdtQuantity = parseFloat(global.totalUsdtd)/parseInt(usePairs.length);
                                let stepSize = Math.abs(Math.log10(global.filters[obj.symbol].stepSize));
                                let execQuantity = parseFloat(FixedToDown(perUsdtQuantity/current, stepSize));
                                if(execQuantity < global.filters[obj.symbol].minQty) execQuantity = global.filters[obj.symbol].minQty;
                                console.log(`FLAG: ${obj.symbol}`);
                                // console.log(`${obj.symbol} Execqty:${execQuantity}`);
                                // console.log(global.orderFilled[obj.symbol]);
                                binance.marketBuy(obj.symbol, execQuantity, (error, response) => {
                                    if(error) {console.log(error.body); return};
                                    let fillable = {};
                                    fillable.symbol = response.symbol;
                                    fillable.executedQty = response.executedQty;
                                    fillable.origQty = response.origQty;
                                    fillable.transactTime = response.transactTime;
                                    fillable.side = response.side;
                                    fillable.qty = response.origQty;
                                    fillable.price = global.symbolPrices[obj.symbol];
                                    global.orderFilled[obj.symbol] = fillable;
                                    console.log(`${obj.symbol} : Market Order Buy Placed.`);
                                    console.log(global.orderFilled[obj.symbol]);
                                });
                            }
                        }
                    } 
                }
                global.compare[obj.symbol] = -1;
            }
            else if(current > average){
                console.log(`${obj.symbol} Down, nothing!`);
                global.compare[obj.symbol] = 1;
            }

            /* Market sell part */
            if( typeof global.orderFilled[obj.symbol] != 'undefined'){
                /* Check previous order history */
                if( global.orderFilled[obj.symbol].length != 0 && global.orderFilled[obj.symbol].side == 'BUY'){
                    let diffLoss = parseFloat(global.orderFilled[obj.symbol].price)-parseFloat(current);
                    let diffProfit = parseFloat(current)-parseFloat(global.orderFilled[obj.symbol].price);
                    /* Check it meets Stoploss and take profit condition */
                    if( parseFloat(global.orderFilled[obj.symbol].price) == 0 || (diffLoss >= parseFloat(global.orderFilled[obj.symbol].price)*parseFloat(process.env.STOP_LOSS)/100 || 
                        diffProfit >= parseFloat(global.orderFilled[obj.symbol].price)*parseFloat(process.env.TAKE_PROFIT)/100)){
                        /* Check symbol price is defined */
                        if(typeof global.symbolPrices[obj.symbol] !== 'undefined'){
                            let stepSize = Math.abs(Math.log10(global.filters[obj.symbol].stepSize));
                            let quantity = parseFloat(FixedToDown(global.balance[obj.symbol.replace('USDT','')].available, stepSize));
                            // console.log(`Sell QTY: ${quantity}`);
                            /* Market sell order */
                            binance.marketSell(obj.symbol, quantity, (error, response)=>{
                                if(error) {console.log(error.body); return};
                                let fillable = {};
                                fillable.symbol = response.symbol;
                                fillable.executedQty = response.executedQty;
                                fillable.origQty = response.origQty;
                                fillable.transactTime = response.transactTime;
                                fillable.side = response.side;
                                fillable.qty = response.origQty;
                                fillable.price = global.symbolPrices[obj.symbol];
                                global.orderFilled[obj.symbol] = fillable;
                                console.log(`${obj.symbol} : Market Order Sell Placed.`);
                                console.log(global.orderFilled[obj.symbol]);
                            });
                        }
                    }
                }
            }
        }
      });
}, 10000);

setInterval(() => {
	binance.prices((error, ticker) => {
		if ( error ) console.error(error);
		for ( let symbol in ticker ) {
            if(!usePairs.includes(symbol)) continue;
            global.symbolPrices[symbol] = parseFloat(ticker[symbol]);
		}
        useBalance();
        // console.log(global.symbolPrices);
        console.log(global.balance);
        // console.log(global.totalUsdtd);
    });
    lastOrder();
    console.log(global.lastOrder);
    // allOrders('ONTUSDT');
    // console.log(global.orders['ONTUSDT']);
}, 5000);

function allOrders(symbol){ 
    binance.allOrders(symbol, (error, orders, symbol) => {
        if(error) console.log(error.body);
        /* Store all orders */
        global.orders[symbol] = orders;
    });
}

function lastOrder(){
    usePairs.forEach(symbol=>{
        binance.allOrders(symbol, (error, orders, symbol) => {
            if(error) console.log(error.body);
            for(let order of orders){
                if(order.status != 'FILLED') return;
                /* Store Last Order object*/
                global.lastOrder[symbol] = order;    
            }
        });
    });
}

/* Get exchange info for symbols like to meet order requirements */
//minQty = minimum order quantity
//minNotional = minimum order value (price * quantity)
binance.exchangeInfo(function(error, data) {
    let minimums = {};
    for ( let obj of data.symbols ) {
        if(!usePairs.includes(obj.symbol)) continue;
        let filters = {status: obj.status};
        for ( let filter of obj.filters ) {
            if ( filter.filterType == "MIN_NOTIONAL" ) {
                filters.minNotional = filter.minNotional;
            } else if ( filter.filterType == "PRICE_FILTER" ) {
                filters.minPrice = filter.minPrice;
                filters.maxPrice = filter.maxPrice;
                filters.tickSize = filter.tickSize;
            } else if ( filter.filterType == "LOT_SIZE" ) {
                filters.stepSize = filter.stepSize;
                filters.minQty = filter.minQty;
                filters.maxQty = filter.maxQty;
            }
        }
        //filters.baseAssetPrecision = obj.baseAssetPrecision;
        //filters.quoteAssetPrecision = obj.quoteAssetPrecision;
        filters.orderTypes = obj.orderTypes;
        filters.icebergAllowed = obj.icebergAllowed;
        minimums[obj.symbol] = filters;
    }
    // console.log(minimums);
    global.filters = minimums;
    //fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});

/* Get balance of usePairs */
function useBalance(){
    binance.balance((error, balances) => {
        if (error) console.error(error);
        let usdt = 0.00;
        /* Get symbol Price */
        usePairs.forEach((pair) => {
            let asset = pair.replace('USDT','');
            let obj = balances[asset];
            obj.available = parseFloat(obj.available);
            obj.onOrder = parseFloat(obj.onOrder);
			obj.usdtValue = 0;
            obj.usdtTotal = 0;
			if ( asset == 'USDT' ) obj.usdtValue = obj.available;
            else obj.usdtValue = obj.available * global.symbolPrices[pair];
            
			if ( asset == 'USDT' ) obj.usdtTotal = obj.available + obj.onOrder;
            else obj.usdtTotal = (obj.available + obj.onOrder) * global.symbolPrices[pair];
            
			if ( isNaN(obj.usdtValue) ) obj.usdtValue = 0;
            if ( isNaN(obj.usdtTotal) ) obj.usdtTotal = 0;
            
			usdt += parseFloat(obj.usdtTotal);
            global.balance[asset] = obj;
        });
        global.balance['USDT'] = balances.USDT;
        global.balance['USDT'].available = parseFloat(balances.USDT.available);
        global.balance['USDT'].onOrder = parseFloat(balances.USDT.onOrder);
        global.balance['USDT'].usdtValue = global.balance['USDT'].available;
        global.balance['USDT'].usdtTotal = global.balance['USDT'].available+global.balance['USDT'].onOrder;

        global.totalUsdtd = usdt + global.balance['USDT'].usdtTotal;
        
    });
}

function FixedToDown(val, fixedTo){
    let result = val.toString().substring(0, val.toString().indexOf(".") + fixedTo);
    return result;
}
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

/* Last Order Response Sample
VETUSDT:
{ symbol: 'VETUSDT',
  orderId: 44207295,
  orderListId: -1,
  clientOrderId: 'qd8sLsCRMlvuS2oi3GLuEf',
  price: '0.00000000',
  origQty: '10593.00000000',
  executedQty: '10593.00000000',
  cummulativeQuoteQty: '37.83025700',
  status: 'FILLED',
  timeInForce: 'GTC',
  type: 'MARKET',
  side: 'BUY',
  stopPrice: '0.00000000',
  icebergQty: '0.00000000',
  time: 1571112898253,
  updateTime: 1571112898253,
  isWorking: true } */

// function symbolPrice(symbol){
//     binance.prices(symbol, (error, ticker) => {
//         global.symbolPrice[symbol] = ticker[symbol];
//       });
// }

// binance.prices('BNBBTC', (error, ticker) => {
//     if(error) console.log(error);
//     this.symbolPrices['BNBBTC'] = ticker['BNBBTC'];
//     console.log(ticker['BNBBTC']);
//   });
// setInterval(() => {
//     let current = global.prevdayticker.ETHTUSD.bestBid;
//     let average = global.prevdayticker.ETHTUSD.averagePrice;
    
//     if(current < average){
//         if(global.compare > 0) {
//             console.log("Up, Make Order");
//             quantity = 0;
//             binance.marketBuy("ETHTUSD", quantity, (error, response) => {
//                 console.log("Market Buy response", response);
//                 setOpenOrderVariable(response);
//             });
//         }
//         global.compare = -1;
//     }
//     else if(current >= average){
//         if(global.compare < 0) {
//             console.log("Down, nothing!");
//         }
//         global.compare = 1;
//     }

//     function setOpenOrderVariable(response){
//         global.openOrders.symbol = response.symbol;
//         let obj = global.openOrders.symbol;
//         obj.orderID = response.orderID;
//         obj.fillPrice = response.fills[0].price;
//         obj.fillQty = response.fills[0].qty;
//         obj.transactTime = response.transactTime;
//     }
//     // console.log(global.openOrders);

// }, 2000);

/**
 * 
    var quantity = 0.1;
    binance.marketBuy("ETHTUSD", quantity, (error, response) => {
        console.log("Market Buy response", response);
        console.log(response.fills[0].price);
    });
 * 
* Market Buy response 
{ symbol: 'ETHTUSD',
orderId: 23375474,
orderListId: -1,
clientOrderId: 'hrR3Jf8qcfBx9c228viJ8v',
transactTime: 1570865910468,
price: '0.00000000',
origQty: '0.10000000',
executedQty: '0.10000000',
cummulativeQuoteQty: '18.33700000',
timeInForce: 'GTC',
type: 'MARKET',
side: 'BUY',
fills:
[ { price: '183.37000000',
    qty: '0.10000000',
    commission: '0.00010000',
    commissionAsset: 'ETH',
    tradeId: 713412 } ] 
}
 */

/* Get the balances of all pairs */
/* function balance() {
	binance.balance((error, balances) => {
		if ( error ) console.error(error);
		let usdt = 0.00;
		for ( let asset in balances ) {
			let obj = balances[asset];
			obj.available = parseFloat(obj.available);
			//if ( !obj.available ) continue;
			obj.onOrder = parseFloat(obj.onOrder);
			obj.usdtValue = 0;
			obj.usdtTotal = 0;
			if ( asset == 'USDT' ) obj.usdtValue = obj.available;
            else obj.usdtValue = obj.available * global.ticker[asset+'USDT'];
            
			if ( asset == 'USDT' ) obj.usdtTotal = obj.available + obj.onOrder;
            else obj.usdtTotal = (obj.available + obj.onOrder) * global.ticker[asset+'USDT'];
            
			if ( isNaN(obj.usdtValue) ) obj.usdtValue = 0;
            if ( isNaN(obj.usdtTotal) ) obj.usdtTotal = 0;
            
			usdt += parseFloat(obj.usdtTotal);
            global.balance[asset] = obj;
        }
        // console.log(global.balance);
        // console.log(usdt);
	});
} */
