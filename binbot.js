const moment = require('moment-timezone');
const {truncateOrders, insertOrder, getOrder} = require('./database');
const {postMessage} = require('./discord.js');
require('dotenv').config();

const binance = require( './node-binance-api' );

const usePairs = process.env.PAIRS.replace(/\s/g,'').split(',');
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

class BinBot{
    constructor(){
        this.price = {};
        this.ticker = {};
        this.balance ={};
        this.totalUsdtd = 0;
        this.symbolPrices = {};
        this.orders = {};
        this.symbolInfo = {};
        this.filters = {};
        this.usdtProfit= {};
        this.totalUsdtProfit = 0;
        this.statistics = {};
        this.currentStep = {};
        this.profitStep = {};
        this.lockProfitStep = {};
        this.currentPercent = {};
        this.cummulativeSum = {};
        this.executedSum = {};
        this.finalStep = {};
        this.priceAverage= {};
        this.stopPrice= {};
        this.entryTime = {};
        this.profitPercent = {};
        this.intervalHandle = '';

        this.stop_loss = 6;

        this.binapi = binance();
        this.binapi.options({
            APIKEY: process.env.API_KEY,
            APISECRET: process.env.API_SECRET,
            recvWindow: 6000,
            verbose:true,
            useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
          });
        
        for(let pair of usePairs){
            this.statistics[pair] = {};
            this.filters[pair] = {};
            this.usdtProfit[pair] = {};
            this.currentStep[pair] = 0;
            this.stopPrice[pair] = 0;
            this.profitStep[pair] = -1;
            this.lockProfitStep[pair] = -1;
        }
    }

    subscribe(){
        this.updateOrders();
        this.exchangeInfo();
        this.binapi.prices((error, ticker) => {
            if ( error ) console.log(error.body);
            for ( let symbol in ticker ) {
                if(!usePairs.includes(symbol)) continue;
                this.symbolPrices[symbol] = parseFloat(ticker[symbol]);
            }
            this.useBalance();
            // console.log(this.symbolPrices);
            // console.log(this.totalUsdtd);
        });
        /*Websocket communication*/
        this.binapi.websockets.userData(this.balance_update.bind(this), this.execution_update);
        setTimeout(()=>{
            this.getAllOrders();
            this.lastStep();
        }, 3000);
        this.intervalHandle = setInterval(()=>{
            this.bot_process();
        }, 10000);
    }

    unsubscribe(){
        clearInterval(this.intervalHandle);
        this.forceSellAll();
    }
    bot_process(){
        for(let pair of usePairs){
            this.binapi.prevDay(pair, (error, response) => {
                if (error) console.log(error);
                let obj = response;
                let symbol = obj.symbol;
                let current = parseFloat(obj.bidPrice);
                this.symbolPrices[symbol] = current;
                let average = parseFloat(obj.weightedAvgPrice);
                let tickerPercent = current/average;
                // let Epsillon = this.filters[symbol].tickSize/10;

                /* Restore steps when server starts up */
                if(this.finalStep[symbol] > 0){
                    let finalStep = this.finalStep[symbol];
                    if(finalStep == 1){
                        /* Sync step */
                        this.currentPercent[symbol] = current/this.stopPrice[symbol];
                        this.currentStep[symbol] = 1;
                    }else if(finalStep >= 2){
                        this.currentPercent[symbol] = current/this.stopPrice[symbol];
                        this.currentStep[symbol] = 2;
                    }
                }
                // console.log(`${symbol} minNotional: ${this.filters[symbol].minNotional} Step: ${this.currentStep[symbol]}, tickerPercent: ${tickerPercent}, currentPercent: ${this.currentPercent[symbol]}, current:${current}`);
                if(this.stopPrice[symbol]>0){
                    this.currentPercent[symbol] = current/this.stopPrice[symbol];
                    this.profitPercent[symbol] = current/this.priceAverage[symbol];
                    /* Set profit step */
                    for (let profitStep of profitSteps){
                        if(this.profitPercent[symbol]>=(100+profitStep.percent)/100){
                            this.profitStep[symbol] = profitStep.step;
                        }
                    }
                }
                console.log(`${symbol} final Step: ${this.finalStep[symbol]} current: ${current} priceAverage: ${this.priceAverage[symbol]} profitPercent: ${this.profitPercent[symbol]} profitStep: ${this.profitStep[symbol]}`)
                if(this.currentStep[symbol] == 0 && tickerPercent<=1 && tickerPercent>0.99){
                    // Do step 0
                    console.log(`${symbol}: Do step 0 BUY TickerPercent: ${tickerPercent}`);
                    this.stopPrice[symbol] = current;
                    this.entryTime[symbol] = moment.utc(Date.now()).tz('Europe/Berlin').format('YYYY-MM-DD HH:mm:ss');
                    this.priceAverage[symbol] = current;
                    this.market_Buy(symbol, current, lossSteps[0].orderPercent);
                    this.currentStep[symbol] = 1;
                }else if(this.currentStep[symbol]==1 && this.currentPercent[symbol]<=lossSteps[1].percent && this.currentPercent[symbol]>(100-this.stop_loss)/100){
                    //Do step 1
                    console.log(`${symbol}: Do step 1 BUY CurrentPercent ${this.currentPercent[symbol]}`);
                    /* Calculate the priceAverage to calculate the takeprofitPrice */
                    let perUsdtQuantity = parseFloat(this.totalUsdtd)/parseInt(usePairs.length)*lossSteps[1].orderPercent;
                    let stepSize = Math.abs(Math.log10(this.filters[symbol].stepSize));
                    let execQuantity = parseFloat(this.FixedToDown(perUsdtQuantity/current, stepSize));
                    this.entryTime[symbol] = moment.utc(Date.now()).tz('Europe/Berlin').format('YYYY-MM-DD HH:mm:ss');
                    this.priceAverage[symbol] = (this.cummulativeSum[symbol]+perUsdtQuantity)/(this.executedSum[symbol]+execQuantity);
                    this.market_Buy(symbol, current, lossSteps[1].orderPercent);
                    this.currentStep[symbol] = 2;
                }else if(this.currentStep[symbol]>0 && this.currentPercent[symbol]<=(100-this.stop_loss)/100){
                    /* Do Market Sell */
                    console.log(`${symbol}: Stop loss SELL CurrentPercent: ${this.currentPercent[symbol]}`);
                    this.currentStep[symbol] = 0;
                    this.stopPrice[symbol] = 0;
                    this.currentPercent[symbol] = 0;
                    this.market_Sell(symbol, current);
                }else if(this.currentStep[symbol]>0){
                    // console.log(`${symbol} ProfitStep:${this.profitStep[symbol]} lockProfitStep: ${this.lockProfitStep[symbol]}`);
                    if(this.profitStep[symbol] >= this.lockProfitStep[symbol]){
                        this.lockProfitStep[symbol] = this.profitStep[symbol];
                    }else if(this.profitStep[symbol] < this.lockProfitStep[symbol] || this.profitStep[symbol] == (profitSteps.length-1)){
                        /* Market sell */
                        console.log(`${symbol}: Take profit SELL TakeProfitStep: ${this.lockProfitStep[symbol]}`);
                        this.currentStep[symbol] = 0;
                        this.stopPrice[symbol] = 0;
                        this.currentPercent[symbol] = 0;
                        this.lockProfitStep[symbol] = -1;
                        this.market_Sell(symbol, current);
                    }
                }
            });
        }
        /* Update Statistics Values */
        this.getAllOrders();
        /* Update cummulativeSum and executedSum */
        this.lastStep();
    }

    market_Buy(symbol, symbolPrice, orderPercent){
        let perUsdtQuantity = parseFloat(this.totalUsdtd)/parseInt(usePairs.length)*orderPercent;
        if(perUsdtQuantity < this.filters[symbol].minNotional){
            perUsdtQuantity = this.filters[symbol].minNotional;
        }
        let stepSize = Math.abs(Math.log10(this.filters[symbol].stepSize));
        let execQuantity = parseFloat(this.FixedToDown(perUsdtQuantity/symbolPrice, stepSize));
        if(this.balance['USDT'] < perUsdtQuantity){
            console.log(`USDT Balance is insufficient to buy ${symbol}`);
            return;
        }
        if(execQuantity < this.filters[symbol].minQty) {
            console.log(`ExecQuantity is smaller than filter MinQty.`);
            return;
        }
        if(this.finalStep[symbol] >=2){
            console.log(`Maximum step 2 reached.`);
            return;
        }
        /* Market buy */
        // this.binapi.marketBuy(symbol, execQuantity, (error, response) => {
        //     if(error) {console.log(error.body)};
        //     console.log(response);
        // });
    }

    market_Sell(symbol, symbolPrice){
        console.log(symbol);
        let stepSize = Math.abs(Math.log10(this.filters[symbol].stepSize));
        let execQuantity = parseFloat(this.FixedToDown(this.balance[symbol.replace('USDT','')].available, stepSize));
        if(execQuantity > this.filters[symbol].minQty){
            /* Market sell order */
            // this.binapi.marketSell(symbol, execQuantity, (error, response)=>{
            //     if(error) {console.log(error.body);}
            //     console.log(response);
            // });
            if(process.env.DISCORD_URL && process.env.BOT_NAME == 'main'){
                let profitPercent = (symbolPrice-this.priceAverage[symbol])/this.priceAverage[symbol]*100;
                const msg = `-----------------------\n`
                + `Name: Binance Bot\n`
                + `PnL: ${profitPercent.toFixed(2)}%\n`
                + `Pair: ${symbol}\n`
                + `Entry Price: ${this.priceAverage[symbol]}\n`
                + `Exit Price: ${symbolPrice}\n`
                + `Opened at ${this.entryTime[symbol]} (UTC +2)\n`
                + `Closed at ${moment
                    .utc(Date.now())
                    .tz('Europe/Berlin')
                    .format('YYYY-MM-DD HH:mm:ss')} (UTC +2)\n`;
                postMessage(msg);
            }
        }else{
            console.log(`Sell Order not permitted.`);
            console.log(`${symbol} ExecQuantity: ${execQuantity} FilterMinQty: ${this.filters[symbol].minQty}`);
        }
    }

    forceSellAll(){
        let iteration = 0;
        let handle = setInterval(()=>{
            let symbol = usePairs[iteration];
            this.market_Sell(symbol, this.symbolPrices[symbol]);
            iteration += 1;
            if(iteration == usePairs.length){
                clearInterval(handle);
            }
        },1000);
    }

    /* Get balance of usePairs Set global balance on server start up*/
    useBalance(){
        let this_ = this;
        this.binapi.balance(function (error, balances) {
            try{
                if (error) console.log(error.body);
                let usdt = 0.00;
                /* Get symbol Price */
                if(this_.isEmpty(balances) == false){
                    for (let pair of usePairs){
                        let asset = pair.replace('USDT','');
                        let obj = balances[asset];
                        obj.available = parseFloat(obj.available);
                        obj.onOrder = parseFloat(obj.onOrder);
                        obj.usdtValue = 0;
                        obj.usdtTotal = 0;
                        // console.log(this_.symbolPrices[pair]);
                        if ( asset == 'USDT' ) obj.usdtValue = obj.available;
                        else obj.usdtValue = obj.available * this_.symbolPrices[pair];
                        
                        if ( asset == 'USDT' ) obj.usdtTotal = obj.available + obj.onOrder;
                        else obj.usdtTotal = (obj.available + obj.onOrder) * this_.symbolPrices[pair];
                        
                        if ( isNaN(obj.usdtValue) ) obj.usdtValue = 0;
                        if ( isNaN(obj.usdtTotal) ) obj.usdtTotal = 0;
                        
                        usdt += parseFloat(obj.usdtTotal);
                        this_.balance[asset] = obj;
                    }
                    this_.balance['USDT'] = balances.USDT;
                    this_.balance['USDT'].available = parseFloat(balances.USDT.available);
                    this_.balance['USDT'].onOrder = parseFloat(balances.USDT.onOrder);
                    this_.balance['USDT'].usdtValue = this_.balance['USDT'].available;
                    this_.balance['USDT'].usdtTotal = this_.balance['USDT'].available+this_.balance['USDT'].onOrder;
                    this_.totalUsdtd = usdt + this_.balance['USDT'].usdtTotal;
                }
                // console.log(this_.balance);
            }catch(error){
                console.log(error);
            }
        });
    }
    
    /* The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled */
    balance_update(data) {
        console.log("Balance Update");
        this.binapi.prices((error, ticker) => {
            if ( error ) console.error(error.body);
            for ( let symbol in ticker ) {
                if(!usePairs.includes(symbol)) continue;
                this.symbolPrices[symbol] = parseFloat(ticker[symbol]);
            }
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
                else obj.usdtValue = parseFloat(available) * this.symbolPrices[asset+"USDT"];
                
                if ( asset == 'USDT' ) obj.usdtTotal = parseFloat(available) + parseFloat(onOrder);
                else obj.usdtTotal = (parseFloat(available) + parseFloat(onOrder)) * this.symbolPrices[asset+"USDT"];
                
                if ( isNaN(obj.usdtValue) ) obj.usdtValue = 0;
                if ( isNaN(obj.usdtTotal) ) obj.usdtTotal = 0;
                
                usdt += parseFloat(obj.usdtTotal);
                this.balance[asset] = obj;
            }
            this.totalUsdtd = usdt;
            // console.log(this.balance);
            // console.log(this.totalUsdtd);
        });
    }

    execution_update(data) {
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
            insertOrder(fillable)
            .then(result=>{console.log(result);})
            .catch((error)=> console.log(error.body));
            console.log(`${symbol} : Market Order ${side} Placed.`);
        }
    }

    /* Update database orders table from binance order history */
    updateOrders(){
        truncateOrders().then(() => {
            console.log('truncated orders table');
        }).catch(err => {
            console.log(err);
        });
        usePairs.forEach(symbol=>{
            this.binapi.allOrders(symbol, (error, orders, symbol) => {
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
                        fillable.price = parseFloat(order.cummulativeQuoteQty)/parseFloat(order.origQty);
                        fillable.transactTime = moment.utc(order.time).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
                        insertOrder(fillable)
                            .then()
                            .catch((error)=> console.log(error));
                    });
                }
            });
        });
    }

    /**
    * Get exchange info for symbols like to meet order requirements
    * minQty = minimum order quantity
    * minNotional = minimum order value (price * quantity) 
    */
    exchangeInfo(){
        let minimums = {};
        let this_ = this;
        this.binapi.exchangeInfo(function(error, data) {
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
            this_.filters = minimums;
            //fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
        });
    }

    getAllOrders(){
        let startTime = '2019-10-25 08:15:00';
        let totalUsdtProfit = 0;
        for (let pair of usePairs){
            getOrder(process.env.API_KEY, pair, startTime).then(orders=>{
                let sum = 0;
                for (let order of orders){
                    if(order.side == 'BUY'){
                        sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
                    }else if(order.side == 'SELL'){
                        sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
                    }
                }
                this.statistics[pair].usdtProfit = sum;
            });
            /* Profit by pair */
            this.usdtProfit[pair].symbol = pair;
            this.usdtProfit[pair].value = this.statistics[pair].usdtProfit+this.balance[pair.replace('USDT','')].usdtTotal;
            totalUsdtProfit += this.statistics[pair].usdtProfit;
        }
        this.totalUsdtProfit = totalUsdtProfit+(this.totalUsdtd-this.balance['USDT'].usdtTotal);
    }
    
    lastStep(){
        let this_ = this;
        for (let pair of usePairs){
            getOrder(process.env.API_KEY, pair).then(function (orders){
                let step = 0;
                let stopPrice = 0;
                let orderOrigQty='';
                let cummulativeSum= 0;
                let executedSum = 0;
                let transactTime = '';
                for(let order of orders){
                    if(order.side == 'SELL') break;
                    stopPrice = order.price;
                    if(transactTime.length == 0){
                        transactTime = order.transactTime;
                    }
                    cummulativeSum += order.price * order.executedQty;
                    executedSum += order.executedQty;
                    if(orderOrigQty == order.origQty) continue;
                    step += 1;
                    orderOrigQty = order.origQty;
                }
                this_.cummulativeSum[pair] = cummulativeSum;
                this_.executedSum[pair] = executedSum;
                this_.priceAverage[pair] = cummulativeSum/executedSum; 
                this_.finalStep[pair] = step;
                this_.stopPrice[pair] = stopPrice;
                if(transactTime.length != 0){
                    this_.entryTime[pair] = moment(transactTime).format('YYYY-MM-DD HH:mm:ss');
                }
            }).catch(err=>{
                console.log(err);
            });
        }
    }

    /**
     * Cut off decimals to efficient number after dot
     * @param {*} val Decimal to be cut off
     * @param {*} fixedTo numbers after dot to cut off
     */
    FixedToDown(val, fixedTo){
        let result = Math.floor(val*Math.pow(10, fixedTo))/Math.pow(10, fixedTo);
        return result;
    }

    /**
     * Checks to see of the object is iterable
     * @param {object} obj - The object check
     * @return {boolean} true or false is iterable
     */
    isIterable(obj) {
        // checks for null and undefined
        if (obj === null) {
            return false;
        }
        return typeof obj[Symbol.iterator] === 'function';
    }

    /**
     * Check object is empty or not
     * @param {object} obj - The object 
     * @returns {boolean} true or false
     */
    isEmpty(obj) {
        for(var key in obj) {
            if(obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }
    
}
module.exports.BinBot = BinBot;

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
    this.binapi.marketBuy("ETHTUSD", quantity, (error, response) => {
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