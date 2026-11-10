const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function init() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = init;

if (require.main === module) {
  init()
    .then(() => console.log('✔ Database schema is ready'))
    .catch((err) => {
      console.error('✖ Could not initialise the database:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
