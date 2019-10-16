/* eslint-disable no-console */
const axios = require('axios');
// const {Global} = require('./global');
// const {signKey} = require('./utils');
// const {getParamStr} = require('./utils');
// const {WebSocketClient} = require('./WebSocketClient');
// const moment = require('moment-timezone');
// const {postMessage} = require('./discord');

class BybitBot {
    constructor (apiKey, secret, id) {
        this.apiKey = apiKey.trim();
        this.secret = secret.trim();
        this.id = id;

        this.symbols = ["BTCUSD","ETHUSD","XRPUSD"];

        this.settingData = {};

        let symbol = '';

        this.settingData.bio = `Shadow 30 minutes\
            Signals 2 hour once per bar / will be confirmed from 3 minutes signal once per bar close\
            Shadow red and short 10% Balance\
            Shadow red and long 5% Balance`;
        
        // BTC

        // eslint-disable-next-line prefer-destructuring
        symbol = this.symbols[0];

        this.settingData[symbol] = {};

        this.settingData[symbol].isPercentStop = (process.env.BTC_PERCENT_STOP === "1");

        this.settingData[symbol].quantityPercent = parseFloat(process.env.BTC_QUANTITY_PERCENT);
        this.settingData[symbol].leverage = parseFloat(process.env.BTC_LEVERAGE);
        this.settingData[symbol].takeProfit = parseFloat(process.env.BTC_TAKE_PROFIT);
        this.settingData[symbol].trailingStop = parseFloat(process.env.BTC_TRAILING_STOP);
        this.settingData[symbol].stopLoss = parseFloat(process.env.BTC_STOP_LOSS);
        this.settingData[symbol].additionalPercent = parseFloat(process.env.BTC_ADDITIONAL_PERCENT);

        this.settingData[symbol].stopLossPercent = parseFloat(process.env.BTC_STOP_LOSS_PERCENT);

        this.settingData[symbol].price = 0;

        this.settingData[symbol].trailingStopEnabled = false;
        this.settingData[symbol].closedByTrigger = false;
        this.settingData[symbol].closingPosition = false;
        this.settingData[symbol].actualStopPrice = 0;

        this.settingData[symbol].selectedStop = 0;
        this.settingData[symbol].triggeredStop = -1;
        this.settingData[symbol].lastSide = '';

        this.settingData[symbol].shadow = '';
        this.settingData[symbol].signal = '';

        // will calculate `this.settingData[symbol].stopValues` runtime
        this.settingData[symbol].stopSteps = [[
            { price: 50, stop: 30 },
            { price: 100, stop: 50 },
            { price: 130, stop: 60 },
            { price: 200, stop: 70 },
            { price: 250, stop: 90 },
            { price: 300, stop: 100 },
            { price: 350, stop: 125 },
            { price: 400, stop: 150 },
            { price: 500, stop: 175 }
        ]];


     // ETH

        // eslint-disable-next-line prefer-destructuring
        symbol = this.symbols[1];

        this.settingData[symbol] = {};

        this.settingData[symbol].isPercentStop = (process.env.ETH_PERCENT_STOP === "1");

        this.settingData[symbol].quantityPercent = parseFloat(process.env.ETH_QUANTITY_PERCENT);
        this.settingData[symbol].leverage = parseFloat(process.env.ETH_LEVERAGE);
        this.settingData[symbol].takeProfit = parseFloat(process.env.ETH_TAKE_PROFIT);
        this.settingData[symbol].trailingStop = parseFloat(process.env.ETH_TRAILING_STOP);
        this.settingData[symbol].stopLoss = parseFloat(process.env.ETH_STOP_LOSS);
        this.settingData[symbol].additionalPercent = parseFloat(process.env.ETH_ADDITIONAL_PERCENT);

        this.settingData[symbol].stopLossPercent = parseFloat(process.env.ETH_STOP_LOSS_PERCENT);

        this.settingData[symbol].price = 0;

        this.settingData[symbol].trailingStopEnabled = false;
        this.settingData[symbol].closedByTrigger = false;
        this.settingData[symbol].closingPosition = false;
        this.settingData[symbol].actualStopPrice = 0;

        this.settingData[symbol].selectedStop = 0;
        this.settingData[symbol].triggeredStop = -1;
        this.settingData[symbol].lastSide = '';

        // this.settingData[symbol].row2 = ['', '', '', ''];
        // this.settingData[symbol].row3 = ['', '', '', ''];
        this.settingData[symbol].shadow = '';
        this.settingData[symbol].signal = '';

        this.settingData[symbol].stopSteps = [[
            { price: 1, stop: 0.6 },
            { price: 2, stop: 1 },
            { price: 2.6, stop: 1.2 },
            { price: 4, stop: 1.4 },
            { price: 5, stop: 1.8 },
            { price: 6, stop: 2 },
            { price: 7, stop: 2.5 },
            { price: 8, stop: 3 },
            { price: 10, stop: 3.5 }
        ]];
        
        /*
        // will calculate `this.settingData[symbol].stopValues` runtime
        this.settingData[symbol].stopSteps = [[
            { price: 0.4, stop: 0.05 },
            { price: 0.45, stop: 0.15 },
            { price: 0.60, stop: 0.25 },
            { price: 0.85, stop: 0.1 },
            { price: 0.90, stop: 0.40 },
            { price: 1.3, stop: 0.55 },
            { price: 1.6, stop: 0.60 },
            { price: 2, stop: 0.75 },
            { price: 2.5, stop: 0.80 },
            { price: 3, stop: 1 },
            { price: 3.5, stop: 1 }
        ], [
            { price: 0.6, stop: 0.25 },
            { price: 0.85, stop: 0.1 },
            { price: 1, stop: 0.50 },
            { price: 1.5, stop: 0.60 },
            { price: 2.3, stop: 1.1 },
            { price: 3, stop: 1.5 },
            { price: 4, stop: 1.65 },
            { price: 4.5, stop: 1.5 },
            { price: 5.7, stop: 1.2 },
            { price: 8, stop: 1.5 }
        ], [
            { price: 0.75, stop: 0.25 },
            { price: 1.5, stop: 0.75 },
            { price: 2.5, stop: 1.0 },
            { price: 3.5, stop: 1.5 },
            { price: 5, stop: 1.5 },
            { price: 6, stop: 1.5 },
            { price: 7, stop: 2 },
            { price: 8, stop: 2 },
            { price: 9, stop: 2 },
            { price: 10, stop: 1 },
        ]];
        */

        // XRP

        // eslint-disable-next-line prefer-destructuring
        symbol = this.symbols[2];

        this.settingData[symbol] = {};

        this.settingData[symbol].isPercentStop = (process.env.XRP_PERCENT_STOP === "1");

        this.settingData[symbol].quantityPercent = parseFloat(process.env.XRP_QUANTITY_PERCENT);
        this.settingData[symbol].leverage = parseFloat(process.env.XRP_LEVERAGE);
        this.settingData[symbol].takeProfit = parseFloat(process.env.XRP_TAKE_PROFIT);
        this.settingData[symbol].trailingStop = parseFloat(process.env.XRP_TRAILING_STOP);
        this.settingData[symbol].stopLoss = parseFloat(process.env.XRP_STOP_LOSS);
        this.settingData[symbol].additionalPercent = parseFloat(process.env.XRP_ADDITIONAL_PERCENT);

        this.settingData[symbol].stopLossPercent = parseFloat(process.env.XRP_STOP_LOSS_PERCENT);

        this.settingData[symbol].price = 0;

        this.settingData[symbol].trailingStopEnabled = false;
        this.settingData[symbol].closedByTrigger = false;
        this.settingData[symbol].closingPosition = false;
        this.settingData[symbol].actualStopPrice = 0;

        this.settingData[symbol].selectedStop = 0;
        this.settingData[symbol].triggeredStop = -1;
        this.settingData[symbol].lastSide = '';

        this.settingData[symbol].shadow = '';
        this.settingData[symbol].signal = '';

        this.settingData[symbol].stopSteps = [[
            { price: 0.0015, stop: 0.0009 },
            { price: 0.003, stop: 0.0015 },
            { price: 0.004, stop: 0.0018 },
            { price: 0.006, stop: 0.002 },
            { price: 0.0075, stop: 0.0027 },
            { price: 0.009, stop: 0.003 },
            { price: 0.01, stop: 0.0038 },
            { price: 0.012, stop: 0.0045 },
            { price: 0.015, stop: 0.0053 }
        ]];

        this.accountData = {};

        this.webSocket = new WebSocketClient();
        this.pingInterval = 30000;
        this.socketDuration = 100000000;
        this.intervalId = null;
    }

    getStates() {
        return this.accountData;
    }

    getSettings() {
        return this.settingData;
    }

    setSettings(settings) {
        // eslint-disable-next-line no-unused-expressions
        settings && settings.forEach(obj => {
            if (obj.leverage && this.settingData[obj.symbol].leverage !== obj.leverage) {
                this.applyLeverage({
                    symbol: obj.symbol,
                    leverage: obj.leverage
                }).then(result => {
                    if (result === 'success')
                        this.settingData[obj.symbol].leverage = obj.leverage;
                    else
                        this.writeLog(`updating leverage failure`);
                });
            }

            if (obj.isPercentStop && this.settingData[obj.symbol].isPercentStop !== obj.isPercentStop) {
                this.settingData[obj.symbol].isPercentStop = obj.isPercentStop;
            }

            if (obj.quantityPercent && this.settingData[obj.symbol].quantityPercent !== obj.quantityPercent) {
                this.settingData[obj.symbol].quantityPercent = obj.quantityPercent;
            }

            if (obj.stopLoss && this.settingData[obj.symbol].stopLoss !== obj.stopLoss) {
                this.settingData[obj.symbol].stopLoss = obj.stopLoss;
            }

            if (obj.takeProfit && this.settingData[obj.symbol].takeProfit !== obj.takeProfit) {
                this.settingData[obj.symbol].takeProfit = obj.takeProfit;
            }

            if (obj.stopSteps && this.settingData[obj.symbol].stopSteps !== obj.stopSteps) {
                if (obj.stopSteps.length)
                    this.settingData[obj.symbol].stopSteps = obj.stopSteps;
            }
        });

        return this.getSettings();
    }

    updateStopValues(symbol) {

        if (this.settingData[symbol].isPercentStop) {
            this.settingData[symbol].stopValues = 
                this.settingData[symbol].stopSteps[this.settingData[symbol].selectedStop].map(x => {
                    return {
                        price: (x.price * this.accountData[symbol].price / 100),
                        stop: (x.stop * this.accountData[symbol].price / 100)
                    };
                });
        }
        else
            this.settingData[symbol].stopValues = this.settingData[symbol].stopSteps[this.settingData[symbol].selectedStop];
    }

    subscribe() {
        this.updateInfo()
            .then(result => {
                if (result === 'success') {
                    this.writeLog(`update info success`);
                    
                    // eslint-disable-next-line no-unused-expressions
                    this.symbols && this.symbols.forEach(symbol => {
                        if (this.accountData[symbol] && this.settingData[symbol]) {
                            if (this.accountData[symbol].leverage !== this.settingData[symbol].leverage) {
                                this.applyLeverage({
                                    symbol,
                                    leverage: this.settingData[symbol].leverage
                                }).then(result => {
                                    if (result === 'success')
                                        this.writeLog(`apply leverage success: ${symbol} ${this.settingData[symbol].leverage}`);
                                });
                            }
                        }
                    });
                }
            })
        // A UNIX timestamp after which the request become invalid. This is to prevent replay attacks.
        // unit:millisecond
        const start = Date.now();
        const expires = start + this.socketDuration;

        // Signature
        const signature = signKey(this.secret, `GET/realtime${expires}`);

        // Parameters string
        const param = `apiKey=${this.apiKey}&expires=${expires}&signature=${signature}`;

        // Establishing connection
        this.webSocket.open(`${Global.wsUrl}?${param}`);

        // Open the socket
        this.webSocket.onopen = () => {
            this.intervalId = setInterval(() => {
                this.webSocket.send('{"op":"ping"}');
            }, this.pingInterval);

            const exp = Date.now() + this.socketDuration;
            const sign = signKey(this.secret, `GET/realtime${exp}`);

            this.webSocket.send(`{"op":"auth","args":["${this.apiKey}",${exp},"${sign}"]}`);

            this.webSocket.send('{"op":"subscribe","args":["position"]}');

            // eslint-disable-next-line no-unused-expressions
            this.symbols && this.symbols.forEach(symbol => {
                this.webSocket.send(`{"op":"subscribe","args":["instrument.${symbol}"]}`);
            });
        };

        this.webSocket.onmessage = (data,flags,number) => {
            const json = JSON.parse(data);
            if (json.ret_msg !== "pong" && json.topic) {
                // const start = Date.now();

                if (json.topic === 'position') {
                    this.writeLog(`WebSocketClient message #${number}: `, data);
                    this.processPosition(json);
                }
                else if (json.topic.includes(`instrument`)) {
                    this.processInstrument(json);
                }

                // const end = Date.now();
        
                // custom log function
                // this.writeLog(`Time: ${end - start} ms`);
            }
        };

        this.webSocket.onclose = () => {
            // custom log function
            this.writeLog('disconnected');
            clearInterval(this.intervalId);
        };
    }

    processPosition(json) {
        if (!json.data || json.data.length === 0) {
            // custom log function
            this.writeLog('invalid position data');
            return;
        }
        
        this.writeLog(`position update`);
        json.data.forEach(pos => {
            if (this.accountData[pos.symbol]){
                this.accountData[pos.symbol].leverage = +pos.leverage;

                this.accountData[pos.symbol].stopLoss = +pos.stop_loss;
                this.accountData[pos.symbol].takeProfit = +pos.take_profit;
                this.accountData[pos.symbol].trailingStop = +pos.trailing_stop;

                this.accountData[pos.symbol].side = pos.side;
                this.accountData[pos.symbol].size = +pos.size;

                this.accountData[pos.symbol].price = +pos.entry_price;
            }
            else {
                this.accountData[pos.symbol] = {};
                
                this.accountData[pos.symbol].leverage = +pos.leverage;

                this.accountData[pos.symbol].stopLoss = +pos.stop_loss;
                this.accountData[pos.symbol].takeProfit = +pos.take_profit;
                this.accountData[pos.symbol].trailingStop = +pos.trailing_stop;

                this.accountData[pos.symbol].side = pos.side;
                this.accountData[pos.symbol].size = +pos.size;

                this.accountData[pos.symbol].price = +pos.entry_price;
            }

            if (this.accountData[pos.symbol].side.toLowerCase() === 'none') {
                if (this.settingData[pos.symbol]) {
                    this.settingData[pos.symbol].closingPosition = false;
                }
            }
            else if (this.settingData[pos.symbol]) {
                this.updateStopValues(pos.symbol);
            }

            this.writeLog(`${pos.symbol}: balance-${this.accountData[pos.symbol].balance} leverage-${this.accountData[pos.symbol].leverage}, \
            side-${this.accountData[pos.symbol].side}, size-${this.accountData[pos.symbol].size}, price-${this.accountData[pos.symbol].price}, \
            SL-${this.accountData[pos.symbol].stopLoss}, TP-${this.accountData[pos.symbol].takeProfit}, TS-${this.accountData[pos.symbol].trailingStop}`);
        });
    }

    processInstrument(json) {
        if (!json.data || json.data.length === 0) {
            // custom log function
            this.writeLog('invalid instrument data');
            return;
        }

        json.data.forEach(instrument => {
            if (this.settingData[instrument.symbol]) {
            
                this.settingData[instrument.symbol].prevPrice = this.settingData[instrument.symbol].price;

                if (this.settingData[instrument.symbol].price > 0) {
                    if (process.env.PRICE_TYPE === 'market' && instrument.mark_price)
                        this.settingData[instrument.symbol].price = +instrument.mark_price;
                    else if (process.env.PRICE_TYPE === 'exchange' && instrument.last_price)
                        this.settingData[instrument.symbol].price = +instrument.last_price;
                }
                else if (instrument.mark_price)
                        this.settingData[instrument.symbol].price = +instrument.mark_price;
                    else if(instrument.index_price)
                        this.settingData[instrument.symbol].price = +instrument.index_price;
                    else if (instrument.last_price)
                        this.settingData[instrument.symbol].price = +instrument.last_price;
                
                if (!this.accountData[instrument.symbol])
                    return;
                
                if (this.accountData[instrument.symbol].side.toLowerCase() !== 'none') {
                    if (!this.settingData[instrument.symbol].trailingStopEnabled) {
                        if ((this.accountData[instrument.symbol].side.toLowerCase() === 'buy' 
                            && this.settingData[instrument.symbol].price >= 
                            this.accountData[instrument.symbol].price + this.settingData[instrument.symbol].stopValues[0].price)
                            || (this.accountData[instrument.symbol].side.toLowerCase() === 'sell' 
                                && this.settingData[instrument.symbol].price > 0 && this.settingData[instrument.symbol].price <= 
                                this.accountData[instrument.symbol].price - this.settingData[instrument.symbol].stopValues[0].price)) {
                                    this.writeLog(`${instrument.symbol}, ${this.accountData[instrument.symbol].side}, \
                                        ${this.accountData[instrument.symbol].price}, \
                                        ${this.accountData[instrument.symbol].price}, ${this.settingData[instrument.symbol].stopValues[0].price}, \
                                        ${this.settingData[instrument.symbol].price}`);
                                    this.writeLog(this.settingData[instrument.symbol].stopValues);
                                    
                                    // activate trailing stop
                                    this.settingData[instrument.symbol].trailingStopEnabled = true;
                                    if (this.accountData[instrument.symbol].side.toLowerCase() === 'buy')
                                        this.settingData[instrument.symbol].actualStopPrice = this.settingData[instrument.symbol].price - this.settingData[instrument.symbol].stopValues[0].stop;
                                    else if (this.accountData[instrument.symbol].side.toLowerCase() === 'sell')
                                        this.settingData[instrument.symbol].actualStopPrice = this.settingData[instrument.symbol].price + this.settingData[instrument.symbol].stopValues[0].stop;
                            }
                    }
                    else {
                        for (let i = this.settingData[instrument.symbol].stopValues.length - 1; i >= 0; i -= 1) {
                            if ((this.accountData[instrument.symbol].side.toLowerCase() === 'buy' && this.settingData[instrument.symbol].price >= this.accountData[instrument.symbol].price + this.settingData[instrument.symbol].stopValues[i].price)
                                || (this.accountData[instrument.symbol].side.toLowerCase() === 'sell' && this.settingData[instrument.symbol].price <= this.accountData[instrument.symbol].price - this.settingData[instrument.symbol].stopValues[i].price)) {
                                    this.settingData[instrument.symbol].trailingStop = this.settingData[instrument.symbol].stopValues[i].stop;
                                    break;
                                }
                        }

                        if (this.accountData[instrument.symbol].side.toLowerCase() === 'buy' && this.settingData[instrument.symbol].price > this.settingData[instrument.symbol].actualStopPrice + this.settingData[instrument.symbol].trailingStop) {
                            this.settingData[instrument.symbol].actualStopPrice = this.settingData[instrument.symbol].price - this.settingData[instrument.symbol].trailingStop;
                        }
                        else if (this.accountData[instrument.symbol].side.toLowerCase() === 'sell' && this.settingData[instrument.symbol].price < this.settingData[instrument.symbol].actualStopPrice - this.settingData[instrument.symbol].trailingStop) {
                            this.settingData[instrument.symbol].actualStopPrice = this.settingData[instrument.symbol].price + this.settingData[instrument.symbol].trailingStop;
                        }

                        if ((this.settingData[instrument.symbol].price > this.settingData[instrument.symbol].actualStopPrice && this.settingData[instrument.symbol].prevPrice <= this.settingData[instrument.symbol].actualStopPrice)
                            || (this.settingData[instrument.symbol].price < this.settingData[instrument.symbol].actualStopPrice && this.settingData[instrument.symbol].prevPrice >= this.settingData[instrument.symbol].actualStopPrice)) {
                                if (!this.settingData[instrument.symbol].closingPosition) {
                                    this.settingData[instrument.symbol].closingPosition = true;
                                    this.closePosition({
                                        side: this.accountData[instrument.symbol].side,
                                        symbol: instrument.symbol,
                                        size: this.accountData[instrument.symbol].size
                                    }).then(result => {
                                        if (result !== null) {
                                            // custom log function
                                            this.writeLog(`position closed by trailing stop, order_id: ${result.order_id}`);
                                            this.settingData[instrument.symbol].trailingStopEnabled = false;
                                            this.settingData[instrument.symbol].closedByTrigger = true;
                                            this.settingData[instrument.symbol].triggeredStop = this.settingData[instrument.symbol].selectedStop;
                                            this.settingData[instrument.symbol].lastSide = this.accountData[instrument.symbol].side;
                                        }
                                    });
                                } // close if
                        } // close if
                    } // close else
                } // close else
            }
        }); // close forEach
    }

    async updateInfo() {
        try {
            await Promise.all([
                // this.updateLeverage(),
                // this.updateAvailableMargin(),
                // this.updateActiveOrders(),
                this.updatePosition()
            ]);

            return 'success';
        }
        catch (e) {
            this.writeLog(e);
        }

        return 'failure';
    }

    /*
    * @return
    {
       'ret_code':0,
       'ret_msg':'ok',
       'ext_code':'',
       'result':{
           'data':[
               {
                   'order_id': 'string',       //Unique order ID
                   'user_id': 0,               //User ID 
                   'symbol': 'string',         //Contract type
                   'side': 'string',           //Side
                   'order_type': 'string',     //Order type 
                   'price': 0,                 //Order price 
                   'qty': 0,                   //Order quantity
                   'time_in_force': 'string',  //Time in force
                   'order_status': 'string',   //Order status: Created: order created; Rejected: order rejected; New: order pending; PartiallyFilled: order filled partially; Filled: order filled fully, Cancelled: order cancelled 
                   'last_exec_time': 0.000000 , //Last execution time
                   'last_exec_price': 0,       //Last execution price
                   'leaves_qty': 0,            //Remaining order quantity
                   'cum_exec_qty': 0,          //Accumulated execution quantity
                   'cum_exec_value': 0,        //Accumulated execution value
                   'cum_exec_fee': 0,          //Accumulated execution fee
                   'reject_reason': 'string',  //Reason for rejection
                   'order_link_id': 'string',  //Agency customized order ID
                   'created_at':'2018-10-15T04:12:19.000Z',
                   'updated_at':'2018-10-15T04:12:19.000Z',
               }
           ],
           'current_page': 1,
           'total': 1
       },
       'time_now':'1539781050.462841'
    }
    * */
    async updateActiveOrders  () {
        const ts = Date.now();

        const body = {
            limit: 20,
            api_key: this.apiKey,
            timestamp: ts,
            sort: 'created_at',
            order: 'desc'
        };

        body.sign = signKey(this.secret, getParamStr(body));

        try {
            const response = await axios.get(`${Global.apiUrl}/open-api/order/list`, {
                params: body
            });

            const {data} = response;

            if (data.ret_code === 0) {
                // custom log function
                this.writeLog('get active orders success');
                this.activeOrders = data.result.data;
                return 'success';
            }
        }
        catch (error) {
            // custom log function
            this.writeLog(error);
        }

        return 'failure';
    }

    async updatePosition() {
        const positions = await this.getPosition();
        try {
            if (positions !== null) {
                // custom log function
                this.writeLog(`Account balance for ${this.apiKey}`);

                // eslint-disable-next-line no-unused-expressions
                positions && positions.forEach(pos => {
                    if (this.symbols.includes(pos.symbol)) {
                        if (this.accountData[pos.symbol]){
                            this.accountData[pos.symbol].balance = +pos.wallet_balance;
                            
                            this.accountData[pos.symbol].leverage = +pos.leverage;

                            this.accountData[pos.symbol].stopLoss = +pos.stop_loss;
                            this.accountData[pos.symbol].takeProfit = +pos.take_profit;
                            this.accountData[pos.symbol].trailingStop = +pos.trailing_stop;

                            this.accountData[pos.symbol].side = pos.side;
                            this.accountData[pos.symbol].size = +pos.size;

                            this.accountData[pos.symbol].price = +pos.entry_price;
                        }
                        else {
                            this.accountData[pos.symbol] = {};
                            
                            this.accountData[pos.symbol].balance = +pos.wallet_balance;
                            
                            this.accountData[pos.symbol].leverage = +pos.leverage;

                            this.accountData[pos.symbol].stopLoss = +pos.stop_loss;
                            this.accountData[pos.symbol].takeProfit = +pos.take_profit;
                            this.accountData[pos.symbol].trailingStop = +pos.trailing_stop;

                            this.accountData[pos.symbol].side = pos.side;
                            this.accountData[pos.symbol].size = +pos.size;

                            this.accountData[pos.symbol].price = +pos.entry_price;
                        }

                        this.updateStopValues(pos.symbol);

                        // custom log function
                        this.writeLog(pos.symbol, pos.wallet_balance);
                    }
                });
                // custom log function
                this.writeLog('-------------');
                
                // custom log function
                this.writeLog('updating position info success');	
            }
            else {
                // custom log function
                this.writeLog('updating position info failure');
            }
        }
        catch (error) {
            // custom log function
            this.writeLog(error);
        }

        return 'success';
    }

    async updateLeverage() {
        const leverage = await this.getLeverage();
        try {
            if (leverage !== null) {
                // eslint-disable-next-line no-unused-expressions
                this.symbols && this.symbols.forEach(symbol => {
                    if (leverage[symbol]) {
                        if (this.accountData[symbol]){
                            this.accountData[symbol].leverage = leverage[symbol].leverage;
                        }
                        else {
                            this.accountData[symbol] = {};
                            this.accountData[symbol].leverage = leverage[symbol].leverage;
                        }
                    }
                });
                // custom log function
                this.writeLog('updating leverage info success');
            }
            else {
                // custom log function
                this.writeLog('updating leverage info failure');
            }
        }
        catch (error) {
            // custom log function
            this.writeLog(error);
        }

        return 'success';
    }

    // eslint-disable-next-line class-methods-use-this
    async updateAvailableMargin() {
        return 'success';
    }

    /* 
    * @return
    'result': [
       {
           'id': 1,                //position ID
           'user_id': 1,           //user ID 
           'risk_id': 1,           //risk limit ID 
           'symbol': 'BTCUSD',     //Contract type (BTCUSD,ETHUSD)
           'side': 'None',         //position Side  (None, buy, sell)
           'size': 0,              //position size
           'position_value': 0,    //position value
           'entry_price': 0,       //entry price
           'leverage': 1,          //user leverage
           'auto_add_margin': 0,   //auto margin replenishment switch
           'position_margin': 0,   //position margin
           'liq_price': 999999,    //liquidation price
           'bust_price': 999999,   //bankruptcy price
           'occ_closing_fee': 0,   //position closing 
           'occ_funding_fee': 0,   //funding fee
           'take_profit': 0,       //take profit price
           'stop_loss': 0,         //stop loss price
           'trailing_stop': 0,     //trailing stop point 
           'position_status': 'Normal',   //Status Normal(normal), Liq(Liquidation in process), ADL(ADL in process) 
           'deleverage_indicator': 1,
           'oc_calc_data': '{\'blq\':\'0\',\'bmp\':\'0\',\'slq\':\'0\',\'smp\':\'0\'}',
           'order_margin': 0,      //Used margin by order
           'wallet_balance': 0,    //wallet balance
           'unrealised_pnl': 0,    //unrealised profit and loss
           'realised_pnl': 0,      //daily realized profit and loss
           'cum_realised_pnl': 0,  //Total realized profit and loss
           'cum_commission': 0,    //Total commissions
           'cross_seq': 0,         //
           'position_seq': 2,      //position sequence number
           'created_at': '2018-10-18T07:15:51.000Z',
           'updated_at': '2018-10-20T13:43:21.000Z'
       }
   ]
    * */
    async getPosition() {
        const ts = Date.now();

        const body = {
            api_key: this.apiKey,
            timestamp: ts,
        };

        body.sign = signKey(this.secret, getParamStr(body));

        try {
            const response = await axios.get(`${Global.apiUrl}/position/list`, {
                params: body
            });

            const {data} = response;

            if (data.ret_code === 0) {
                // custom log function
                this.writeLog('get position success');
                return data.result;
            }
        }
        catch (error) {
            // custom log function
            this.writeLog(error);
        }

        return null;
    }

    async getOrder() {
        const ts = Date.now();
        console.log("apiKEY::"+this.apiKey);
        const body = {
            limit: 20,
            api_key: this.apiKey,
            timestamp: ts,
            sort: 'created_at',
            order: 'desc',
            order_status: `Filled,Cancelled,Rejected`
        };
    
        // if (symbol)
        //     body.symbol = symbol;
    
        body.sign = signKey(this.secret, getParamStr(body));
    
        try {
            const response = await axios.get(`${Global.apiUrl}/open-api/order/list`, {
                params: body
            });
    
            const {data} = response;
    
            if (data.ret_code === 0 && data.result.data) {
                // custom log function
                console.log('get order list success');
                return data.result.data;
            }
            console.log(data);
        }
        catch (err) {
            console.log(err);
        }
    
        return null;
    }


    /*
    * @return
    'result': {
       'BTCUSD': {
           'leverage': 100
       },
       'ETHUSD': {
           'leverage': 1
       }
    }
    * */
    async getLeverage() {
        const ts = Date.now();
    
        const body = {
            api_key: this.apiKey,
            timestamp: ts,
        };
    
        body.sign = signKey(this.secret, getParamStr(body));
    
        try {
            const response = await axios.get(`${Global.apiUrl}/user/leverage`, {
                params: body
            });

            const {data} = response;

            if (data.ret_code === 0) {
                // custom log function
                this.writeLog('get leverage success');
                return data.result;
            }
        }
        catch (error) {
            // custom log function
            this.writeLog(error);
        }

        return null;
    }
    
    /*
    * @params
    * position 
    * e.g. {symbol: 'BTCUSD', leverage: 4, ...}
    * */
    async applyLeverage (position) {
        const ts = Date.now();
    
        const body = {
            api_key: this.apiKey,
            timestamp: ts,
            symbol: position.symbol,
            leverage: position.leverage,
        };
        
        body.sign = signKey(this.secret, getParamStr(body));
    
        const response = await axios.post(`${Global.apiUrl}/user/leverage/save`, body);
        try {
            if (response.data.ret_code === 0) {
                // custom log function
                this.writeLog('apply leverage success');
                return 'success';
            }
            this.writeLog(response.data);
        }
        catch(error) {
            // custom log function
            this.writeLog(error);
        }
        
        return 'failure';
    }

    /*
     * @required params
     * side, symbol, order_type, qty, price, time_in_force
     * 
     */
    async placeOrder (order, rate = 1) {
        const additionalProps = ['take_profit', 'stop_loss', 'reduce_only', 'close_on_trigger'];

        const ts = Date.now();

        this.writeLog(`${order.qty} ${rate} ${Math.floor(order.qty * rate)}`);

        const body = {
            side: order.side,
            symbol: order.symbol,
            order_type: order.order_type,
            qty: Math.floor(order.qty * rate),
            price: order.price,
            time_in_force: order.time_in_force,
            api_key: this.apiKey,
            timestamp: ts,
        };

        additionalProps.forEach(prop => {
            if (Object.prototype.hasOwnProperty.call(order, prop))
                body[prop] = order[prop];
        });
        
        body.sign = signKey(this.secret, getParamStr(body));

        try {
            const response = await axios.post(`${Global.apiUrl}/open-api/order/create`, body);
            if (response.data.ret_code === 0) {
                // custom log function
                this.writeLog(`creating order success, order_id: ${response.data.result.order_id}`);
                // save order info
                return response.data.result;
            }
            this.writeLog(response.data.ret_msg);
        }
        catch(error) {
            // custom log function
            this.writeLog(error);
        }

        return null;
    }

    cancelOrder(orderId, symbol) {
        const ts = Date.now();

        const body = {
            order_id: orderId,
            symbol,
            api_key: this.apiKey,
            timestamp: ts,
        };

        body.sign = signKey(this.secret, getParamStr(body));
 
        axios.post(`${Global.apiUrl}/open-api/order/cancel`, body)
            .then(response => {
                if (response.data.ret_code === 0) {
                    // custom log function
                    this.writeLog(`canceling order success, order_id: ${orderId}`);
                }
            })
            .catch(error => {
                // custom log function
                this.writeLog(error);
            });
    }

    onSignal(operation, symbol, isConfirm = false) {
        this.writeLog(`${operation} ${symbol} ${isConfirm}`);
        if (! isConfirm)
            this.settingData[symbol].signal = operation;
        else if (this.settingData[symbol].signal === operation)
            this.doOperation(operation, symbol);
            else
                this.settingData[symbol].signal = '';
    }

    onShadow(operation, symbol) {
        this.settingData[symbol].shadow = operation;
    }

    doOperation(operation, symbol) {
        this.writeLog(`doOperation ${operation} ${symbol}`);

        if (this.settingData[symbol].shadow === operation)
            this.settingData[symbol].quantityPercent = process.env.BTC_QUANTITY_PERCENT_BOOST;
        else
            this.settingData[symbol].quantityPercent = process.env.BTC_QUANTITY_PERCENT;

        if (this.accountData[symbol]) {
            if (operation === 'close') {
                if (this.accountData[symbol].side.toLowerCase() !== 'none') {
                    this.closePosition({
                        side: this.accountData[symbol].side,
                        symbol,
                        size: this.accountData[symbol].size
                    }).then(result => {
                        if (result !== null) {
                            // custom log function
                            this.writeLog(`position closed, order_id: ${result.order_id}`);
                        }
                        else 
                            // custom log function
                            this.writeLog(`close position failure`);
                    });
                }
            }
            else if (this.accountData[symbol].side.toLowerCase() === 'none') {
                if (operation === 'buy' || operation === 'sell')
                    this.placeMarketOrder(operation, symbol);
            }
            else if (this.accountData[symbol].side.toLowerCase() === operation) {
                this.writeLog(`same side`);
            }
            else if (this.accountData[symbol].side.toLowerCase() !== operation) {
                this.closePosition({
                    side: this.accountData[symbol].side,
                    symbol,
                    size: this.accountData[symbol].size
                }).then(result => {
                    if (result !== null) {
                        // custom log function
                        this.writeLog(`position closed, order_id: ${result.oder_id}`);

                        this.placeMarketOrder(operation, symbol);
                    }
                    else 
                        // custom log function
                        this.writeLog(`close position failure`);
                });
            }
        }
    }

    async sendMsgDiscord(activeSymbol) {
        // const [positions, orders] = await Promise.all([this.getPosition(), this.getOrder()]);
        const positions = await this.getPosition();
        // const data = await this.getOrder();
        try{
            positions && positions.forEach(pos=>{
                if(pos.symbol == activeSymbol){
                    // Send message to Discord
                    let marker = `🔵`;
                    var msg = `${marker} Entry\n`
                    +`Name: Astronaut Tiny\n`;
                    msg += `Entry Price: ${pos.entry_price}\n`
                    + `Leverage: ${this.settingData[pos.symbol].leverage}\n`
                    + `Entry Time: ${moment
                        .utc(Date.now())
                        .tz('America/New_York')
                        .format('YYYY-MM-DD HH:mm:ss')}\n`
                    + `Balance: ${this.settingData[pos.symbol].quantityPercent} %\n`;
                    postMessage(msg, pos.side);
                    return true;
                }
            });

            /*
            data && data.forEach(order=>{
                console.log(order.side);
                console.log(order.order_type);
                console.log("price:"+order.price);
                console.log("last_exec_price:"+order.last_exec_price);
            });
            console.log(activeSymbol);
            */
        }
        catch(error){
            // custom log function
            this.writeLog(error);
        }
    }

    placeMarketOrder(side, symbol, size) {
        const order = {
            side: side === 'buy' ? 'Buy' : 'Sell',
            symbol,
            order_type: 'Market',
            price: 0,
            time_in_force: 'GoodTillCancel'
        };

        let orderValue = 0;
        if (size)
            order.qty = size;
        else {
            orderValue = this.accountData[symbol].balance * 
                        this.settingData[symbol].leverage * 
                        this.settingData[symbol].quantityPercent / 100;
            order.qty = orderValue * this.settingData[symbol].price;
        }

        if (this.settingData[symbol].takeProfit > 0) {
            order.take_profit = Math.floor(side === 'sell' ? (this.settingData[symbol].price - this.settingData[symbol].takeProfit) : (this.settingData[symbol].price + this.settingData[symbol].takeProfit));
        }

        if (this.settingData[symbol].stopLoss > 0) {
            order.stop_loss = Math.floor(side === 'sell' ? (this.settingData[symbol].price + this.settingData[symbol].stopLoss) : (this.settingData[symbol].price - this.settingData[symbol].stopLoss));
        }

        this.placeOrder(order)
            .then(result => {
                if (result !== null) {
                    this.writeLog(`successfully placed order, orderId: ${result.order_id}`);
                    this.settingData[symbol].trailingStopEnabled = false;
                    this.settingData[symbol].closedByTrigger = false;
                    this.sendMsgDiscord(symbol);
                }
            });
    }

    closePosition(position) {
        this.writeLog(`closePosition: ${position.side}`);
        const order = {
            side: position.side.toLowerCase() === 'buy' ? 'Sell' : 'Buy',
            symbol: position.symbol,
            order_type: 'Market',
            qty: position.size,
            price: 0,
            time_in_force: 'GoodTillCancel',
            close_on_trigger: true,
            reduce_only: true
        };
        return this.placeOrder(order);
    }

    // eslint-disable-next-line class-methods-use-this
    writeLog (str, data) {
        if (data)
            // eslint-disable-next-line no-console
            console.log(new Date(), str, data);
        else
            // eslint-disable-next-line no-console
            console.log(new Date(), str);
    }
}

module.exports.BybitBot = BybitBot;
