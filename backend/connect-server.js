var mysql = require("mysql")
require("dotenv/config")

// https://www.npmjs.com/package/mysql#connection-flags
const mysql_config = {
    host: process.env.MARIADB_HOST,
    port: process.env.MARIADB_PORT,
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    connectionLimit: 10,
    multipleStatements: true,
    debug: process.env.DEBUG_SQL === "true" ?? false,
};
// console.log(mysql_config)

// var connection = mysql.createConnection(mysql_config);
// connection.queryProm = util.promisify(connection.query);

let pool = mysql.createPool(mysql_config)
module.exports = { pool, mysql_config }