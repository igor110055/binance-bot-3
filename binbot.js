const moment = require('moment-timezone');
const {truncateOrders, insertOrder, getOrder} = require('./database');

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
global.currentStep = {};
for(let pair of usePairs){
    global.compare[pair]= 0;
    global.statistics[pair] ={};
    global.currentStep[pair] = 0;
}
const lossSteps=[
    {step: 0, percent: 1, stop:1, orderPercent:0.4},
    {step: 1, percent: 0.99, stop:0.995, orderPercent:0.05},
    {step: 2, percent: 0.98, stop:0.99, orderPercent:0.05},
    {step: 3, percent: 0.97, stop:0.985, orderPercent:0.15},
    {step: 4, percent: 0.96, stop:0.98, orderPercent:0.15},
    {step: 5, percent: 0.94, stop:0.9733, orderPercent:0.2}
];
global.stopPrice={};
global.takeProfitPrice = {};
global.serverStatus = 0;

setInterval(() => {
    binance.prevDay(false, (error, response) => {
        for (let obj of response){
            let symbol = obj.symbol;
            if(!usePairs.includes(symbol)) continue;
            let current = parseFloat(obj.bidPrice);
            let average = parseFloat(obj.weightedAvgPrice);
            let currentPercent = current/average;
            // let Epsillon = global.filters[symbol].tickSize/10;
            
            /* Set steps when server starts up */
            if(typeof global.takeProfitPrice[symbol] == 'undefined'){
                let lastOrderPrice = global.lastOrder[symbol].cummulativeQuoteQty/global.lastOrder[symbol].executedQty;
                global.takeProfitPrice[symbol] = lastOrderPrice*(1+process.env.TAKE_PROFIT/100);
                let checkPercent = lastOrderPrice/average;
                if(global.lastOrder[symbol].side=='BUY'){
                    // console.log(`${symbol} CheckPercent: ${checkPercent}`);
                    if(checkPercent<=lossSteps[0].percent && checkPercent>lossSteps[1].percent){
                        global.currentStep[symbol] = 1;
                    }else if(checkPercent<=lossSteps[1].percent && checkPercent>lossSteps[2].percent){
                        global.currentStep[symbol] = 2;
                    }else if(checkPercent<=lossSteps[2].percent && checkPercent>lossSteps[3].percent){
                        global.currentStep[symbol] = 3;
                    }else if(checkPercent<=lossSteps[3].percent && checkPercent>lossSteps[4].percent){
                        global.currentStep[symbol] = 4;
                    }else if(checkPercent<=lossSteps[4].percent && checkPercent>lossSteps[5].percent){
                        global.currentStep[symbol] = 5;
                    }else if(checkPercent<=lossSteps[5].percent){
                        global.currentStep[symbol] = 6
                    }else{
                        global.currentStep[symbol] = 6
                    }
                }
            }
            // console.log(`${symbol} step:${global.currentStep[symbol]}, Current Percent: ${currentPercent}, Current: ${current}, Average: ${average}`);
            // console.log(global.takeProfitPrice[symbol]);
            if(global.currentStep[symbol] == 0 && currentPercent<=lossSteps[0].percent && currentPercent>lossSteps[1].percent){
                // Do step 0
                console.log(`${symbol}: Do step 0 BUY`);
                market_Buy(symbol, current, lossSteps[0].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[0].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 1;
            }else if(global.currentStep[symbol]==1 && currentPercent<=lossSteps[1].percent && currentPercent>lossSteps[2].percent){
                //Do step 1
                console.log(`${symbol}: Do step 1 BUY`);
                market_Buy(symbol, current, lossSteps[1].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[1].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 2;
            }else if(global.currentStep[symbol]==2 && currentPercent<=lossSteps[2].percent && currentPercent>lossSteps[3].percent){
                //Do step 2
                console.log(`${symbol}: Do step 2 BUY`);
                market_Buy(symbol, current, lossSteps[2].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[2].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 3;
            }else if(global.currentStep[symbol]==3 && currentPercent<=lossSteps[3].percent && currentPercent>lossSteps[4].percent){
                //Do step 3
                console.log(`${symbol}: Do step 3 BUY`);
                market_Buy(symbol, current, lossSteps[3].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[3].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 4;
            }else if(global.currentStep[symbol]==4 && currentPercent<=lossSteps[4].percent && currentPercent>lossSteps[5].percent){
                //Do step 4
                console.log(`${symbol}: Do step 4 BUY`);
                market_Buy(symbol, current, lossSteps[4].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[4].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 5;
            }else if(global.currentStep[symbol]==5 && currentPercent<=lossSteps[5].percent){
                //Do step 5
                console.log(`${symbol}: Do step 5 BUY`);
                market_Buy(symbol, current, lossSteps[5].orderPercent);
                global.takeProfitPrice[symbol] = average*lossSteps[5].stop*(1+process.env.TAKE_PROFIT/100);
                global.currentStep[symbol] = 6
            }else if(currentPercent<=(100-process.env.STOP_LOSS)/100){
                /* Do Market Sell */
                console.log(`${symbol}: Stop loss SELL`);
                market_Sell(symbol);
                global.currentStep[symbol] = 0
            }else if(current>=global.takeProfitPrice[symbol]){
                /* Market sell */
                console.log(`${symbol}: Take profit SELL`);
                market_Sell(symbol);
                global.currentStep[symbol] = 0
            }
        }
        useBalance();
    });
}, 5000);


function market_Buy(symbol, symbolPrice, orderPercent){
    let perUsdtQuantity = parseFloat(global.totalUsdtd)/parseInt(usePairs.length)*orderPercent;
    let stepSize = Math.abs(Math.log10(global.filters[symbol].stepSize));
    let execQuantity = parseFloat(FixedToDown(perUsdtQuantity/symbolPrice, stepSize));
    if(execQuantity > global.filters[symbol].minQty) {
        /* Market sell buy */
        // binance.marketBuy(symbol, execQuantity, (error, response) => {
        //     if(error) {return console.error(error)};
        //     console.log(response);
        // });
    }else{
        console.log(`${symbol} BUY: Execution quantity ${execQuantity} should be bigger than minQty ${global.filters[symbol].minQty}`);
    }
}

function market_Sell(symbol){
    let stepSize = Math.abs(Math.log10(global.filters[symbol].stepSize));
    let execQuantity = parseFloat(FixedToDown(global.balance[symbol.replace('USDT','')].available, stepSize));
    if(execQuantity > global.filters[symbol].minQty){
        /* Market sell order */
        // binance.marketSell(symbol, execQuantity, (error, response)=>{
        //     if(error) {console.log(error.body); return};
        //     console.log(response);
        // });
    }else{
        console.log(`${symbol} SELL: Execution quantity ${execQuantity} should be bigger than minQty ${global.filters[symbol].minQty}`);
    }
}

subscribe();

function subscribe(){
    updateOrders();
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
    getAllOrders();
    // getOrderWithDate();
}, 3000);

function getAllOrders(){
    for (let pair of usePairs){
        getOrder(process.env.API_KEY, pair).then(orders=>{
            let orderCount = 0;
            let sum = 0;
            for (let order of orders){
                if(order.side == 'BUY'){
                    sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
                }else if(order.side == 'SELL'){
                    sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
                }
                orderCount += 1;
            }
            sum = sum+global.balance[pair.replace('USDT', '')].usdtTotal;
            global.statistics[pair].symbol = pair;
            global.statistics[pair].usdtProfit = sum;
            global.statistics[pair].orderCounts = orderCount;
            global.totalUsdtProfit += sum;
        });
    }
}

function getOrderWithDate(){
    let aYearAgo = moment(Date.now()).tz("Europe/Berlin").subtract(1,'y').format('YYYY-MM-DD HH:mm:ss');
    let aWeekAgo = moment(Date.now()).tz("Europe/Berlin").subtract(3,'d').format('YYYY-MM-DD HH:mm:ss');
    let aWeekAfterAgo = moment(Date.now()).tz("Europe/Berlin").subtract(3,'d').format('YYYY-MM-DD HH:mm:ss');
    let current = moment(Date.now()).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
    for (let pair of usePairs){
        getOrder(process.env.API_KEY, pair, aYearAgo, aWeekAgo).then(orders=>{
            let orderCount = 0;
            let sum = 0;
            for (let order of orders){
                if(order.side == 'BUY'){
                    sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
                }else if(order.side == 'SELL'){
                    sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
                }
                orderCount += 1;
            }
            sum = sum+global.balance[pair.replace('USDT', '')].usdtTotal;
            global.statistics[pair].symbol = pair;
            global.statistics[pair].usdtProfit = sum;
            global.statistics[pair].orderCounts = orderCount;
            global.totalUsdtProfit += sum;
            // console.log(`${pair}:${sum}`);
        });
    }
    for (let pair of usePairs){
        getOrder(process.env.API_KEY, pair, aWeekAfterAgo).then(orders=>{
            let orderCount = 0;
            let sum = 0;
            for (let order of orders){
                if(order.side == 'BUY'){
                    sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
                }else if(order.side == 'SELL'){
                    sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
                }
                orderCount += 1;
            }
            sum = sum+global.balance[pair.replace('USDT', '')].usdtTotal;
            global.statistics[pair].symbol = pair;
            global.statistics[pair].usdtProfit = sum;
            global.statistics[pair].orderCounts = orderCount;
            global.totalUsdtProfit += sum;
        });
    }
}

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