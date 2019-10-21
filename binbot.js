const moment = require('moment-timezone');
const {truncateOrders, insertOrder} = require('./database');

require('dotenv').config();

const binance = require( './node-binance-api' )().options({
    APIKEY: process.env.API_KEY,
    APISECRET: process.env.API_SECRET,
    recvWindow: 60000,
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
global.usdtProfit={};
global.totalUsdtProfit =0;
global.compare ={};
global.statistics = {};
for(let pair of usePairs){
    global.compare[pair]= 0;
    global.statistics[pair] ={};
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
                    fillable.apiKey = process.env.API_KEY;
                    fillable.symbol = lastOrder.symbol;
                    fillable.orderId = lastOrder.orderId;
                    fillable.origQty = parseFloat(lastOrder.origQty);
                    fillable.executedQty = parseFloat(lastOrder.executedQty);
                    fillable.cummulativeQuoteQty = parseFloat(lastOrder.cummulativeQuoteQty);
                    fillable.side = lastOrder.side;
                    fillable.price = lastOrder.price;
                    fillable.transactTime = lastOrder.transactTime;
                    global.orderFilled[obj.symbol] = fillable;
                }else{
                    global.orderFilled[obj.symbol] = {};
                }
            }
            let current = parseFloat(obj.bidPrice);
            let average = parseFloat(obj.weightedAvgPrice);
            if(current <= average){
                if(global.compare[obj.symbol] >= 0) {
                    if( typeof(global.orderFilled[obj.symbol]) != 'undefined' ) {
                        /* Check previous order history */
                        if ( global.orderFilled[obj.symbol].side == 'SELL'){
                            /* check symbol price is defined */
                            if(typeof global.symbolPrices[obj.symbol] != 'undefined' && global.totalUsdtd > 0){
                                let perUsdtQuantity = parseFloat(global.totalUsdtd)/parseInt(usePairs.length);
                                let stepSize = Math.abs(Math.log10(global.filters[obj.symbol].stepSize));
                                let execQuantity = parseFloat(FixedToDown(perUsdtQuantity/current, stepSize));
                                if(execQuantity < global.filters[obj.symbol].minQty) execQuantity = global.filters[obj.symbol].minQty;
                                /* Market sell buy */
                                // binance.marketBuy(obj.symbol, execQuantity, (error, response) => {
                                //     if(error) {return console.error(error)};
                                //     let fillable = {};
                                //     fillable.apiKey = process.env.API_KEY;
                                //     fillable.symbol = response.symbol;
                                //     fillable.orderId = response.orderId;
                                //     fillable.origQty = parseFloat(response.origQty);
                                //     fillable.executedQty = parseFloat(response.executedQty);
                                //     fillable.cummulativeQuoteQty = parseFloat(response.cummulativeQuoteQty);
                                //     fillable.side = response.side;
                                //     fillable.price = parseFloat(response.cummulativeQuoteQty)/parseFloat(response.origQty);
                                //     fillable.transactTime = moment.utc(response.transactTime).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');;
                                //     global.orderFilled[obj.symbol] = fillable;
                                //     console.log(global.orderFilled[obj.symbol]);
                                // });
                            }
                        }
                    } 
                }
                global.compare[obj.symbol] = -1;
            }
            else if(current > average){
                /* Process Order when server start */
                if(global.compare[obj.symbol] = 0) {
                    if( typeof(global.orderFilled[obj.symbol]) != 'undefined' ) {
                        /* Check previous order history */
                        if ( global.orderFilled[obj.symbol].side == 'SELL'){
                            /* check symbol price is defined */
                            if(typeof global.symbolPrices[obj.symbol] != 'undefined' && global.totalUsdtd > 0){
                                let perUsdtQuantity = parseFloat(global.totalUsdtd)/parseInt(usePairs.length);
                                let stepSize = Math.abs(Math.log10(global.filters[obj.symbol].stepSize));
                                let execQuantity = parseFloat(FixedToDown(perUsdtQuantity/current, stepSize));
                                if(execQuantity < global.filters[obj.symbol].minQty) execQuantity = global.filters[obj.symbol].minQty;
                                /* Market sell buy */
                                // binance.marketBuy(obj.symbol, execQuantity, (error, response) => {
                                //     if(error) {return console.error(error)};
                                //     let fillable = {};
                                //     fillable.apiKey = process.env.API_KEY;
                                //     fillable.symbol = response.symbol;
                                //     fillable.orderId = response.orderId;
                                //     fillable.origQty = parseFloat(response.origQty);
                                //     fillable.executedQty = parseFloat(response.executedQty);
                                //     fillable.cummulativeQuoteQty = parseFloat(response.cummulativeQuoteQty);
                                //     fillable.side = response.side;
                                //     fillable.price = parseFloat(response.cummulativeQuoteQty)/parseFloat(response.origQty);
                                //     fillable.transactTime = moment.utc(response.transactTime).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
                                //     global.orderFilled[obj.symbol] = fillable;
                                //     console.log(global.orderFilled[obj.symbol]);
                                // });
                            }
                        }
                    } 
                }
                global.compare[obj.symbol] = 1;
            }

            /* Market sell part */
            if( typeof global.orderFilled[obj.symbol] != 'undefined'){
                /* Check previous order history */
                if( global.orderFilled[obj.symbol].length != 0 && global.orderFilled[obj.symbol].side == 'BUY'){
                    let diffLoss = parseFloat(global.orderFilled[obj.symbol].price)-parseFloat(current);
                    let diffProfit = parseFloat(current)-parseFloat(global.orderFilled[obj.symbol].price);
                    /* Check it meets Stoploss and take profit condition */
                    if( (diffLoss >= parseFloat(global.orderFilled[obj.symbol].price)*parseFloat(process.env.STOP_LOSS)/100 || 
                        diffProfit >= parseFloat(global.orderFilled[obj.symbol].price)*parseFloat(process.env.TAKE_PROFIT)/100)){
                        /* Check symbol price is defined */
                        if(typeof global.symbolPrices[obj.symbol] !== 'undefined'){
                            let stepSize = Math.abs(Math.log10(global.filters[obj.symbol].stepSize));
                            let quantity = parseFloat(FixedToDown(global.balance[obj.symbol.replace('USDT','')].available, stepSize));
                            /* Market sell order */
                            // binance.marketSell(obj.symbol, quantity, (error, response)=>{
                            //     if(error) {console.log(error.body); return};
                            //     let fillable = {};
                            //     fillable.apiKey = process.env.API_KEY;
                            //     fillable.symbol = response.symbol;
                            //     fillable.orderId = response.orderId;
                            //     fillable.origQty = parseFloat(response.origQty);
                            //     fillable.executedQty = parseFloat(response.executedQty);
                            //     fillable.cummulativeQuoteQty = parseFloat(response.cummulativeQuoteQty);
                            //     fillable.side = response.side;
                            //     fillable.price = parseFloat(response.cummulativeQuoteQty)/parseFloat(response.origQty);
                            //     fillable.transactTime = moment.utc(response.transactTime).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');;
                            //     global.orderFilled[obj.symbol] = fillable;
                            //     console.log(global.orderFilled[obj.symbol]);
                            // });
                        }
                    }
                }
            }
        }
        useBalance();
      });
}, 10000);

subscribe();

function subscribe(){
    // updateOrders();
    lastOrder();
    binance.prices((error, ticker) => {
        if ( error ) console.error(error);
        for ( let symbol in ticker ) {
            if(!usePairs.includes(symbol)) continue;
            global.symbolPrices[symbol] = parseFloat(ticker[symbol]);
        }
        useBalance(); 
        // console.log(global.symbolPrices);
        // console.log(global.totalUsdtd);
    });
}

/* Get balance of usePairs Set global balance on server start up*/
function useBalance(){
        binance.balance((error, balances) => {
            if (error) console.log(error.body);
            let usdt = 0.00;
            /* Get symbol Price */
            if(typeof balances != 'undefined'){
                for (let pair of usePairs){
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
                }
                global.balance['USDT'] = balances.USDT;
                global.balance['USDT'].available = parseFloat(balances.USDT.available);
                global.balance['USDT'].onOrder = parseFloat(balances.USDT.onOrder);
                global.balance['USDT'].usdtValue = global.balance['USDT'].available;
                global.balance['USDT'].usdtTotal = global.balance['USDT'].available+global.balance['USDT'].onOrder;
                global.totalUsdtd = usdt + global.balance['USDT'].usdtTotal;
            }
            // console.log(global.balance);
        });
}

/* The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled */
function balance_update(data) {
    console.log("Balance Update");
    let usdt = 0;
	for ( let arr of data.B ) {
		let { a:asset, f:available, l:onOrder } = arr;
        if ( ! usePairs.includes(asset+"USDT") && asset != 'USDT' ) continue;
        let obj = {};
        obj.available = parseFloat(available);
        obj.onOrder = parseFloat(onOrder);
        obj.usdtValue = 0;
        obj.usdtTotal = 0;
        if ( asset == 'USDT' ) obj.usdtValue = parseFloat(available);
        else obj.usdtValue = parseFloat(available) * global.symbolPrices[asset+"USDT"];
        
        if ( asset == 'USDT' ) obj.usdtTotal = parseFloat(available) + parseFloat(onOrder);
        else obj.usdtTotal = (parseFloat(available) + parseFloat(onOrder)) * global.symbolPrices[asset+"USDT"];
        
        if ( isNaN(obj.usdtValue) ) obj.usdtValue = 0;
        if ( isNaN(obj.usdtTotal) ) obj.usdtTotal = 0;
        
        usdt += parseFloat(obj.usdtTotal);
        global.balance[asset] = obj;
    }
    global.totalUsdtd = usdt;
    // console.log(global.balance);
    // console.log(global.totalUsdtd);
}
function execution_update(data) {
    let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus, Z:cummulativeQuoteQty,
        T: transactTime, l:executedQty, L:lastExcecutedPrice} = data;
        // console.log(data);
        // console.log(executionType);
        // console.log(`price ${price}`);
        // console.log(`quantity ${quantity}`);
        // console.log(`orderId ${orderId}`);
        // console.log(`executedQty ${executedQty}`);
        // console.log(`cummulativeQuoteQty ${cummulativeQuoteQty}`);
        // console.log(`lastExcecutedPrice ${lastExcecutedPrice}`);
        // console.log(`transactTime ${transactTime}`);
        let fillable = {};
        if(executionType == 'TRADE'){
            if ( orderStatus == "REJECTED" ) {
                console.log("Order Failed! Reason: "+data.r);
            }
            fillable.apiKey = process.env.API_KEY;
            fillable.symbol = symbol;
            fillable.orderId = orderId;
            fillable.origQty = parseFloat(quantity);
            fillable.executedQty = parseFloat(executedQty);
            fillable.cummulativeQuoteQty = parseFloat(cummulativeQuoteQty);
            fillable.side = side;
            fillable.price = parseFloat(lastExcecutedPrice);
            fillable.transactTime = moment.utc(transactTime).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
            global.orderFilled[symbol] = fillable;
            insertOrder(fillable)
            .then(result=>{console.log(result);})
            .catch((error)=> console.log(error));
            console.log(`${symbol} : Market Order ${side} Placed.`);
            // console.log(global.orderFilled[symbol]);
        }
}
binance.websockets.userData(balance_update, execution_update);

function updateOrders(){
    truncateOrders().then(() => {
        console.log('truncated orders table');
    }).catch(err => {
        console.log(err);
    });
    usePairs.forEach(symbol=>{
        binance.allOrders(symbol, (error, orders, symbol) => {
            if(error) console.log(error.body);
            /* Store all orders */
            if(orders.length>0){
                orders.forEach(order=>{
                    let fillable = {};
                    fillable.apiKey = process.env.API_KEY;
                    fillable.symbol = order.symbol;
                    fillable.orderId = order.orderId;
                    fillable.origQty = parseFloat(order.origQty);
                    fillable.executedQty = parseFloat(order.executedQty);
                    fillable.cummulativeQuoteQty = parseFloat(order.cummulativeQuoteQty);
                    fillable.side = order.side;
                    fillable.price = parseFloat(order.cummulativeQuoteQty)/parseFloat(order.executedQty);
                    fillable.transactTime = moment.utc(order.time).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
                    insertOrder(fillable)
                        .then()
                        .catch((error)=> console.log(error));
                });
            }
        });
    });
}

function lastOrder(){
    for (let pair of usePairs){
        binance.allOrders(pair, (error, orders, symbol) => {
            global.lastOrder[symbol] = orders[0];
          }, {limit:1});
    }
}

setTimeout(() => {
    for (let pair of usePairs){
        binance.allOrders(pair, (error, orders, symbol) => {
            if(error) console.log(error.body);
            global.statistics[symbol].symbol = pair;
            global.statistics[symbol].orderCounts = orders.length;
            let sum = 0;
            for (let order of orders){
                if(order.side == 'BUY'){
                    sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
                }else if(order.side == 'SELL'){
                    sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
                }
            }
            sum = sum+global.balance[symbol.replace('USDT', '')].usdtTotal;
            global.statistics[symbol].usdtProfit = sum;
            global.totalUsdtProfit += sum;
        });
    }
}, 3000);

function allOrders(symbol){ 
    binance.allOrders(symbol, (error, orders, symbol) => {
        if(error) console.log(error.body);
        // console.log(orders);
        /* Store all orders */
        global.orders[symbol] = orders;
    });
}

/** 
* Get exchange info for symbols like to meet order requirements
* minQty = minimum order quantity
* minNotional = minimum order value (price * quantity) 
*/
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
        filters.orderTypes = obj.orderTypes;
        filters.icebergAllowed = obj.icebergAllowed;
        minimums[obj.symbol] = filters;
    }
    global.filters = minimums;
    //fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});

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

