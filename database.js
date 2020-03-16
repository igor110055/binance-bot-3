const knex = require('knex')(require('./knexfile'));
const setupPaginator = require('knex-paginator');
setupPaginator(knex);

const insertUser = function insertUser (user) {
    return knex('users').insert(user);
};

const updateUser = function updateUser (apiKey, user) {
    return knex('users')
        .where({apiKey})
        .update(user);
};

const getUsers = function getUsers(perPage, currentPage, orderBy = 'id', search){
    let query = knex
            .select('*')
            .from('users');
    if(orderBy){
        query = query.orderBy(orderBy, 'asc');
    }
    if(search){
        query = query.where('accountName', 'like', `%${search}%`).orWhere('accountEmail', 'like', `%${search}%`);
    }
    if(perPage && currentPage){
        query = query.paginate(perPage, currentPage, true);
    }
    return query;
}

const truncateUsers = function truncateUsers () {
    return knex('users').truncate();
};

const truncateOrders = function truncateOrders () {
    return knex('orders').truncate();
};

const insertOrder = function insertOrder (order) {
    return knex('orders').insert(order);
};

const getOrder = function getOrder(apiKey, symbol, startTime, endTime, limit) {
    let query = knex
        .select('*')
        .from('orders')
        .orderBy('transactTime', 'desc');
    if(limit){
        query = query.limit(limit);
    }
    if(symbol){
        query = query.where('symbol', 'like', `%${symbol}%`);
    }
    if (startTime)
        query = query.andWhere('transactTime', '>', startTime);
    if (endTime)
        query = query.andWhere('transactTime', '<=', endTime);
    return query;
}

const deleteOrder = function deleteOrder(symbol) {
    let query = knex('orders')
    .where('symbol', symbol)
    .del();
    return query;
}

const insertTotalusdt = function insertTotalusdt(total){
    return knex('totals').insert(total);
}

const getTotalusdt = function getTotalusdt(startTime, endTime){
    let query = knex
                .select('*')
                .from('totals');

    if (startTime)
        query = query.where('time', '>=', startTime);
    if (endTime)
        query = query.andWhere('time', '<', endTime);
    
    return query;
}

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


module.exports.knex = knex;
module.exports.insertUser = insertUser;
module.exports.updateUser = updateUser;
module.exports.truncateUsers = truncateUsers;
module.exports.getUsers = getUsers;
module.exports.truncateOrders = truncateOrders;
module.exports.insertOrder = insertOrder;
module.exports.getOrder = getOrder;
module.exports.deleteOrder = deleteOrder;
module.exports.getTotalRealizedPnL = getTotalRealizedPnL;
module.exports.getTotalTrades = getTotalTrades;
module.exports.getTotalOrders = getTotalOrders;
module.exports.insertTotalusdt = insertTotalusdt;
module.exports.getTotalusdt = getTotalusdt;
