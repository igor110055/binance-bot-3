
exports.up = function(knex) {
    return knex.schema.createTable('users', function (t) {
        t.increments('id').primary().unsigned()
        t.string('apiKey', 45).notNullable()
        t.string('secretKey', 45).notNullable()
        t.integer('isMaster').notNullable()
        t.string('masterApiKey', 45)
        t.string('accountName', 45)
        t.integer('accountId').unsigned()
        t.integer('status').unsigned()
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users')
};
