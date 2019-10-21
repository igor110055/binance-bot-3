const knex = require('knex')(require('./knexfile'));

const insertUser = function insertUser (user) {
    return knex('users').insert(user);
};

const updateUser = function updateUser (apiKey, user) {
    return knex('users')
        .where({apiKey})
        .update(user);
};

const truncateUsers = function truncateUsers () {
    return knex('users').truncate();
};

const truncateOrders = function truncateOrders () {
    return knex('orders').truncate();
};

const insertOrder = function insertOrder (order) {
    return knex('orders').insert(order);
};

const getOrder = function getOrder(apiKey, symbol, startTime, endTime) {
    let query = knex
        .select('*')
        .from('orders')
        .where('symbol', symbol)
        .orderBy('transactTime', 'desc')
    if (startTime)
        query = query.andWhere('transactTime', '>=', startTime);
    if (endTime)
        query = query.andWhere('transactTime', '<=', endTime);
    return query;
}

const getDeals = function getDeals(apiKey, startTime, endTime) {
    let query = knex
        .select('side', 'symbol', 'quantity', 'entryPrice', 'exitPrice', 'realizedPnL', 'realizedPnLPercent', 'openDateTime', 'closeDateTime', 'fee')
        .from('deals')
        .where({
            apiKey,
            deleted: 0
        })
        .orderBy('closeDateTime', 'desc')
        .limit(20);

    if (startTime)
        query = query.andWhere('closeDateTime', '>=', startTime);
    if (endTime)
        query = query.andWhere('closeDateTime', '<=', endTime);
    
    return query;
};

const getTotalRealizedPnL = function getTotalRealizedPnL(apiKey, startTime, endTime) {
    let query = knex
        .sum('realizedPnL', {as: 'val'})
        .sum('fee', {as: 'fee'})
        .from('deals')
        .where({
            apiKey,
            symbol: 'BTCUSD',
            deleted: 0
        });
    
    if (startTime)
        query = query.andWhere('closeDateTime', '>=', startTime);
    if (endTime)
        query = query.andWhere('closeDateTime', '<=', endTime);
    
    return query;
};

const getTotalTrades = function getTotalTrades(apiKey, startTime, endTime) {
    let query = knex
        .count('apiKey', {as: 'val'})
        .from('deals')
        .where({
            apiKey,
            symbol: 'BTCUSD',
            deleted: 0
        });

    if (startTime)
        query = query.andWhere('closeDateTime', '>=', startTime);
    if (endTime)
        query = query.andWhere('closeDateTime', '<=', endTime);

    return query;
};

const getTotalOrders = async function getTotalOrders(apiKey, startTime, endTime) {
    let query = knex
        .count('apiKey', {as: 'val'})
        .from('orders')
        .where({
            apiKey,
            symbol: 'BTCUSD'
        });

    if (startTime)
        query = query.andWhere('openDateTime', '>=', startTime);
    if (endTime)
        query = query.andWhere('openDateTime', '<=', endTime);

    return query;
};

const getMarginExist = async function getMarginExist(apiKey) {
    return knex
        .count('apiKey', {as: 'val'})
        .from('margins')
        .where({
            apiKey,
            symbol: 'BTCUSD'
        });
};

const getMarginBefore = function getMarginBefore(apiKey, time) {
    let query = knex
        .select('balance')
        .from('margins')
        .orderBy('date', 'desc').limit(1)
        .where({
            apiKey,
            symbol: 'BTCUSD'
        });
    if (time)
        query = query.andWhere('date', '<=', time);
    
    return query;
};

const getMarginAfter = function getMarginAfter(apiKey, time) {
    let query = knex
        .select('balance')
        .from('margins')
        .orderBy('date', 'asc').limit(1)
        .where({
            apiKey,
            symbol: 'BTCUSD'
        });
    if (time)
        query = query.andWhere('date', '>=', time);
    
    return query;
};


module.exports.knex = knex;
module.exports.insertUser = insertUser;
module.exports.updateUser = updateUser;
module.exports.truncateUsers = truncateUsers;
module.exports.truncateOrders = truncateOrders;
module.exports.insertOrder = insertOrder;
module.exports.getOrder = getOrder;
module.exports.getDeals = getDeals;
module.exports.getTotalRealizedPnL = getTotalRealizedPnL;
module.exports.getTotalTrades = getTotalTrades;
module.exports.getTotalOrders = getTotalOrders;
module.exports.getMarginExist = getMarginExist;
module.exports.getMarginBefore = getMarginBefore;
module.exports.getMarginAfter = getMarginAfter;
