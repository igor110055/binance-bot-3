
exports.up = function(knex) {
    return knex.schema.createTable('orders', function (t) {
        t.increments('id').primary().unsigned()
        t.text('apiKey', 'longtext').notNullable()
        t.string('symbol', 45).notNullable()
        t.integer('orderId').notNullable()
        t.float('origQty', 45,8)
        t.float('executedQty', 45,8)
        t.float('cummulativeQuoteQty', 45,8)
        t.string('side', 45,8)
        t.float('price',45,8).notNullable()
        t.timestamp('transactTime')
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('orders')
};
