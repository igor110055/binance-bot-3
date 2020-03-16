
exports.up = function(knex) {
    return knex.schema.createTable('totals', function (t) {
        t.increments('id').primary().unsigned()
        t.float('totalUsdt', 45,8)
        t.timestamp('time')
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('totals')
};
