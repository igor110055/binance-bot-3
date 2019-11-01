
exports.up = function(knex) {
    return knex.schema.createTable('users', function (t) {
        t.increments('id').primary().unsigned()
        t.text('apiKey', 'longtext').notNullable()
        t.text('secretKey', 'longtext').notNullable()
        t.integer('isMaster')
        t.text('masterApiKey', 'longtext')
        t.integer('accountId').unsigned()
        t.string('accountName', 45)
        t.string('accountEmail', 45)
        t.string('serverIP', 45)
        t.integer('port').unsigned()
        t.integer('status').unsigned()
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('users')
};