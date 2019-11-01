require('dotenv').config();

module.exports = {
    client: 'mysql',
    connection: {
        host: process.env.MYSQL_HOST,
        port: +process.env.MYSQL_PORT,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    },
    pool: {
        min: +process.env.MYSQL_POOL_MIN,
        max: +process.env.MYSQL_POOL_MAX
    }
}