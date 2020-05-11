const moment = require('moment-timezone');
const {truncateOrders, insertOrder, getOrder, deleteOrder} = require('./database');
const {postMessage} = require('./discord.js');
const {sendMessage} = require('./telegram');
require('dotenv').config();

const {prevDayTickers, defaultPairs, filters, lossSteps, profitSteps, initialMaxTrading} = require('./utils.js');

const Binance = require( './node-binance-api' );

class BinBot{
    constructor(){
        this.balance ={};
        this.totalUsdtd = 0;
        this.symbolPrices = {};
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
        this.getBalanceHandle = '';
        this.intervalHandle = '';
        this.usePairs = defaultPairs;
        this.maxTrading = initialMaxTrading;
        this.ErrCode = '';
        this.subscribeEndpoint = '';
        this.tradingLog = [];
        this.longSignal = {};
        this.firstLoop = {};

        this.stop_loss = 4;

        this.binapi = new Binance();
        this.binapi.options({
            APIKEY: process.env.API_KEY,
            APISECRET: process.env.API_SECRET,
            recvWindow: 6000,
            verbose:true,
            useServerTime: true, // If you get timestamp errors, synchronize to server time at startup
          });
        
        for(let pair of this.usePairs){
            this.statistics[pair] = {};
            this.usdtProfit[pair] = {};
            this.currentStep[pair] = 0;
            this.stopPrice[pair] = 0;
            this.profitStep[pair] = -1;
            this.lockProfitStep[pair] = -1;
            this.longSignal[pair] = false;
            this.firstLoop[pair] = true;
        }
    }

    subscribe(){
        // this.updateOrders();

        /*Websocket communication*/
        this.binapi.websockets.userData(this.balance_update.bind(this), this.execution_update.bind(this), this.subscribe_endpoint.bind(this));

        this.lastStep();
        this.getBalanceHandle = setTimeout(()=>{
            // this.getAllOrders();
            this.useBalance();
        }, 2000);
        this.intervalHandle = setInterval(()=>{
            this.bot_process();
        }, 7000);
    }

    unsubscribe(){
        clearTimeout(this.getBalanceHandle);
        clearInterval(this.intervalHandle);
        let endpoints = this.binapi.websockets.subscriptions();
        for ( let endpoint in endpoints ) {
            this.binapi.websockets.terminate(endpoint);
        }
        updateUserByApi(this.apiKey, {lastQty: this.totalUsdtd}).then(res=>{}).catch(err=>console.log(err));
    }

    bot_process(){
        for(let symbol of this.usePairs){
            if (!prevDayTickers[symbol]) continue;
            this.symbolPrices[symbol] = prevDayTickers[symbol].bestBid;
            // console.log(`${symbol}: Final Step: ${this.finalStep[symbol]}`)
            /* Restore steps when server starts up */
            if(this.finalStep[symbol] > 0 && this.firstLoop[symbol] === true){
                let finalStep = this.finalStep[symbol];
                if(finalStep == 1){
                    /* Sync step */
                    this.currentPercent[symbol] = this.symbolPrices[symbol]/this.stopPrice[symbol];
                    this.currentStep[symbol] = 1;
                }else if(finalStep >= 2){
                    this.currentPercent[symbol] = this.symbolPrices[symbol]/this.stopPrice[symbol];
                    this.currentStep[symbol] = 2;
                }
                this.firstLoop[symbol] = false;
            }
            
            // console.log(`${symbol} Step: ${this.currentStep[symbol]}, currentPercent: ${this.currentPercent[symbol]}, current:${this.symbolPrices[symbol]}`);
            if(this.stopPrice[symbol]>0){
                this.currentPercent[symbol] = this.symbolPrices[symbol]/this.stopPrice[symbol];
                this.profitPercent[symbol] = this.symbolPrices[symbol]/this.priceAverage[symbol];
                /* Set profit step */
                for (let profitStep of profitSteps){
                    if(this.profitPercent[symbol]>=(100+profitStep.percent)/100){
                        this.profitStep[symbol] = profitStep.step;
                    }
                }
                if(this.profitPercent[symbol] < (100+profitSteps[0].percent)/100){
                    this.profitStep[symbol] = -1;
                }
            }

            // console.log(`${symbol} currentPercent: ${this.currentPercent[symbol]} profitPercent: ${this.profitPercent[symbol]} currentStep: ${this.currentStep[symbol]} profitStep:${this.profitStep[symbol]}`)
            
            if(this.currentStep[symbol] == 0 && this.longSignal[symbol]){
                // Do step 0
                this.stopPrice[symbol] = this.symbolPrices[symbol];
                // this.entryTime[symbol] = moment.utc(Date.now()).tz('Europe/Berlin').format('YYYY-MM-DD HH:mm:ss');
                this.priceAverage[symbol] = this.symbolPrices[symbol];
                this.currentStep[symbol] = 1;
                this.market_Buy(symbol, this.symbolPrices[symbol], lossSteps[0].orderPercent);
            }else if(this.currentStep[symbol]==1 && this.currentPercent[symbol]<=lossSteps[1].percent && this.currentPercent[symbol]>(100-this.stop_loss)/100 ){
                //Do step 1
                console.log(`${symbol}: Current Step ${this.currentStep[symbol]}`)
                console.log(`${symbol}: Do step 1 BUY CurrentPercent ${this.currentPercent[symbol]}`);
                /* Calculate the priceAverage to calculate the takeprofitPrice */
                if(this.totalUsdtd >= this.maxTrading){
                   var perUsdtQuantity = parseFloat(this.maxTrading)/parseInt(this.usePairs.length)*lossSteps[1].orderPercent;
                }else{
                   var perUsdtQuantity = parseFloat(this.totalUsdtd)/parseInt(this.usePairs.length)*lossSteps[1].orderPercent;
                }
                let stepSize = Math.abs(Math.log10(filters[symbol].stepSize));
                let execQuantity = parseFloat(this.FixedToDown(perUsdtQuantity/this.symbolPrices[symbol], stepSize));
                // this.entryTime[symbol] = moment.utc(Date.now()).tz('Europe/Berlin').format('YYYY-MM-DD HH:mm:ss');
                this.priceAverage[symbol] = (this.cummulativeSum[symbol]+perUsdtQuantity)/(this.executedSum[symbol]+execQuantity);
                this.currentStep[symbol] = 2;
                this.market_Buy(symbol, this.symbolPrices[symbol], lossSteps[1].orderPercent);
            }else if(this.currentStep[symbol]>0 && this.currentPercent[symbol]<=(100-this.stop_loss)/100 && this.currentPercent[symbol] > 0){
                /* Do Market Sell */
                console.log(`${symbol}: Stop loss SELL CurrentPercent: ${this.currentPercent[symbol]}`);
                this.market_Sell(symbol);
            }else if(this.currentStep[symbol]>0){
                // console.log(`${symbol} ProfitStep:${this.profitStep[symbol]} lockProfitStep: ${this.lockProfitStep[symbol]}`);
                if(this.profitStep[symbol] >= this.lockProfitStep[symbol]){
                    this.lockProfitStep[symbol] = this.profitStep[symbol];
                }else if(this.profitStep[symbol] < this.lockProfitStep[symbol] || this.profitStep[symbol] == (profitSteps.length-1)){
                    /* Market sell */
                    console.log(`${symbol}: Take profit SELL TakeProfitStep: ${this.lockProfitStep[symbol]}`);
                    this.market_Sell(symbol);
                }
            }
        }
        /* Update Statistics Values */
        // this.getAllOrders();
        /* Update cummulativeSum and executedSum */
        this.lastStep();
    }

    setInitialValues(symbol){
        this.currentStep[symbol] = 0;
        this.currentPercent[symbol] = 0;
        this.lockProfitStep[symbol] = -1;
        this.profitStep[symbol] = -1;
        this.stopPrice[symbol] = 0;
        this.longSignal[symbol] = false;
    }

    market_Buy(symbol, symbolPrice, orderPercent){
        let perUsdtQuantity = parseFloat(this.totalUsdtd)/parseInt(this.usePairs.length)*orderPercent;
        if(perUsdtQuantity < filters[symbol].minNotional){
            perUsdtQuantity = filters[symbol].minNotional;
        }
        let stepSize = Math.abs(Math.log10(filters[symbol].stepSize));
        let execQuantity = parseFloat(this.FixedToDown(perUsdtQuantity/symbolPrice, stepSize));
        if(this.balance['USDT'] < perUsdtQuantity){
            console.log(`USDT Balance is insufficient to buy ${symbol}`);
            return;
        }
        if(execQuantity < filters[symbol].minQty) {
            console.log(`ExecQuantity is smaller than filter MinQty.`);
            return;
        }
        if(this.finalStep[symbol] >=2){
            console.log(`Maximum step 2 reached.`);
            return;
        }
        /* Market buy */
        this.binapi.marketBuy(symbol, execQuantity, (error, response) => {
            if(error) {
                console.log(error.body);
                return;
            };
            if( process.env.BOT_NAME == 'ENLA'){
                const msg = `-----------------------\n`
                // + `Name: Binance Bot\n`
                + `Pair: ${symbol}\n`
                + `Side: BUY \n`
                + `Time: ${moment
                    .utc(Date.now())
                    .tz('Europe/Berlin')
                    .format('YYYY-MM-DD HH:mm:ss')} (UTC +2)\n`
                + `Price: ${this.symbolPrices[symbol]}\n`
                + `Name: ${process.env.BOT_NAME}`;
                // + `Entry Price: ${this.priceAverage[symbol]}\n`
                // + `Opened at ${this.entryTime[symbol]} (UTC +2)\n`;
                sendMessage(msg);
                // postMessage(msg);
            }
        });
    }

    market_Sell(symbol){
        let stepSize = Math.abs(Math.log10(filters[symbol].stepSize));
        let execQuantity = parseFloat(this.FixedToDown(this.balance[symbol.replace('USDT','')].available, stepSize));
        if(execQuantity > filters[symbol].minQty){
            /* Market sell order */
            this.binapi.marketSell(symbol, execQuantity, (error, response)=>{
                if(error) {
                    console.log(error.body);
                    let errCode = JSON.parse(error.body).code

                    /**Min notional error, remove min notional buys */
                    if(errCode === -1013){
                        this.deleteLastBuys(symbol)
                    }
                    return;
                }

                this.setInitialValues(symbol);

                if( process.env.BOT_NAME == 'ENLA'){
                    let profitPercent = (this.symbolPrices[symbol]-this.priceAverage[symbol])/this.priceAverage[symbol];
                    const msg = `-----------------------\n`
                    + `Exchange: Binance\n`
                    + `Pair: ${symbol}\n`
                    + `Side: SELL \n`
                    + `Time: ${moment
                        .utc(Date.now())
                        .tz('Europe/Berlin')
                        .format('YYYY-MM-DD HH:mm:ss')} (UTC +2)\n`
                    + `Price: ${this.symbolPrices[symbol]}\n`
                    + `PnL: ${(profitPercent*100).toFixed(2)}%\n`
                    + `Name: ${process.env.BOT_NAME}`;
                    // + `Entry Price: ${this.priceAverage[symbol]}\n`
                    // + `Opened at ${this.entryTime[symbol]} (UTC +2)\n`;
                    sendMessage(msg);
                    // postMessage(msg);
                }
            });
        }else{
            console.log(`Sell Order not permitted.`);
            console.log(`${symbol} ExecQuantity: ${execQuantity} FilterMinQty: ${filters[symbol].minQty}`);
        }
    }

    forceSellAll(){
        let iteration = 0;
        let handle = setInterval(()=>{
            let symbol = this.usePairs[iteration];
            this.market_Sell(symbol);
            iteration += 1;
            if(iteration == this.usePairs.length){
                clearInterval(handle);
            }
        },1000);
    }

    /* Get balance of this.usePairs Set global balance on server start up*/
    useBalance(){
        let this_ = this;
        this.binapi.balance(function (error, balances) {
            try{
                if (error) console.log(error.body);
                let usdt = 0.00;
                /* Get symbol Price */
                if(this_.isEmpty(balances) == false){
                    for (let pair of this_.usePairs){
			            if(!prevDayTickers[pair]) continue;
                        let asset = pair.replace('USDT','');
                        let obj = balances[asset];
                        obj.available = parseFloat(obj.available);
                        obj.onOrder = parseFloat(obj.onOrder);
                        obj.usdtValue = 0;
                        obj.usdtTotal = 0;
                        // console.log(this_.symbolPrices[pair]);
                        if ( asset == 'USDT' ) obj.usdtValue = obj.available;

                        else obj.usdtValue = obj.available * prevDayTickers[pair].bestBid;
                        
                        if ( asset == 'USDT' ) obj.usdtTotal = obj.available + obj.onOrder;
                        else obj.usdtTotal = (obj.available + obj.onOrder) * prevDayTickers[pair].bestBid;
                        
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
                if(!this.usePairs.includes(symbol)) continue;
                this.symbolPrices[symbol] = parseFloat(ticker[symbol]);
            }
            let usdt = 0;
            for ( let arr of data.B ) {
                let { a:asset, f:available, l:onOrder } = arr;
                if ( ! this.usePairs.includes(asset+"USDT") && asset != 'USDT' ) continue;
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

    subscribe_endpoint(data){
        this.subscribeEndpoint = data;
    }

    deleteLastBuys(pair){
        getOrder(process.env.API_KEY, pair).then(orders=>{
            for (let order of orders){
                if (order.side === 'SELL') break;
                deleteOrder(order).then(res=>{}).catch(err=>{})
            }
        })
    }

    lastStep(){
        let this_ = this;
        for (let pair of this.usePairs){
            getOrder(process.env.API_KEY, pair,'','',profitSteps.length).then(function (orders){
                let step = 0;
                let stopPrice = 0;
                let orderOrigQty = 0;
                let cummulativeSum = 0;
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

                    /** Calculate the number of steps. Check partially filled order. if origQty same, its partially filled order*/
                    if(orderOrigQty && orderOrigQty == order.origQty) continue;
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

    /* Update database orders table from binance order history */
    updateOrders(){
        truncateOrders().then(() => {
            console.log('truncated orders table');
        }).catch(err => {
            console.log(err);
        });
        this.usePairs.forEach(symbol=>{
            this.binapi.allOrders(symbol, (error, orders, symbol) => {
                if(error) console.log(error.body);
                /* Store all orders */
                if(orders.length>0){
                    orders.forEach(order=>{
                        let fillable = {};
                        fillable.transactTime = moment.utc(order.time).tz("Europe/Berlin").format('YYYY-MM-DD HH:mm:ss');
                        if (fillable.transactTime < process.env.START_TIME ) return;
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
            }, {limit:10});
        });
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

    // getAllOrders(){
    //     let totalUsdtProfit = 0;
    //     for (let pair of this.usePairs){
    //         getOrder(process.env.API_KEY, pair, process.env.START_TIME).then(orders=>{
    //             let sum = 0;
    //             for (let order of orders){
    //                 if(order.side == 'BUY'){
    //                     sum -= parseFloat(order.cummulativeQuoteQty)+parseFloat(order.cummulativeQuoteQty)*0.001;
    //                 }else if(order.side == 'SELL'){
    //                     sum += parseFloat(order.cummulativeQuoteQty)-parseFloat(order.cummulativeQuoteQty)*0.001;
    //                 }
    //             }
    //             this.statistics[pair].usdtProfit = sum;
    //         });
    //         /* Profit by pair */
    //         this.usdtProfit[pair].symbol = pair;
    //         this.usdtProfit[pair].value = this.statistics[pair].usdtProfit+this.balance[pair.replace('USDT','')].usdtTotal;
    //         totalUsdtProfit += this.statistics[pair].usdtProfit;
    //     }
    //     this.totalUsdtProfit = totalUsdtProfit+(this.totalUsdtd-this.balance['USDT'].usdtTotal);
    // }

    /**
    * Get exchange info for symbols like to meet order requirements
    * minQty = minimum order quantity
    * minNotional = minimum order value (price * quantity) 
    */
    // exchangeInfo(){
    //     let minimums = {};
    //     let this_ = this;
    //     this.binapi.exchangeInfo(function(error, data) {
    //         for ( let obj of data.symbols ) {
    //             if(!this.usePairs.includes(obj.symbol)) continue;
    //             let filters = {status: obj.status};
    //             for ( let filter of obj.filters ) {
    //                 if ( filter.filterType == "MIN_NOTIONAL" ) {
    //                     filters.minNotional = filter.minNotional;
    //                 } else if ( filter.filterType == "PRICE_FILTER" ) {
    //                     filters.minPrice = filter.minPrice;
    //                     filters.maxPrice = filter.maxPrice;
    //                     filters.tickSize = filter.tickSize;
    //                 } else if ( filter.filterType == "LOT_SIZE" ) {
    //                     filters.stepSize = filter.stepSize;
    //                     filters.minQty = filter.minQty;
    //                     filters.maxQty = filter.maxQty;
    //                 }
    //             }
    //             filters.orderTypes = obj.orderTypes;
    //             filters.icebergAllowed = obj.icebergAllowed;
    //             minimums[obj.symbol] = filters;
    //         }
    //         this_.filters = minimums;
    //         //fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
    //     });
    // }
    
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
