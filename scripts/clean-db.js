const fs = require('fs');
const config = require('../backend/config');

try {
  fs.unlinkSync(config.dbPath);
  console.log('Database file removed:', config.dbPath);
} catch(e) {
  if(e.code !== 'ENOENT') throw e;
  console.log('Database file not found:', config.dbPath);
} 