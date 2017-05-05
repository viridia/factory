#!/usr/bin/node
// Utility used to upload recipes to the director server.
const dotenv = require('dotenv');
const fs = require('fs');
const http = require('http');
const path = require('path');

dotenv.config();
const args = process.argv.slice(2);
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 8087;
for (const p of args) {
  if (path.extname(p) !== '.json') {
    console.log('file', p, 'is not a JSON file.');
    continue;
  }
  console.log(`opening recipe file: [${p}]`);
  const name = path.basename(p, '.json');
  const recipe = fs.readFileSync(p);
  const req = http.request({
    host,
    port,
    method: 'PUT',
    path: `/api/v1/recipes/${name}`,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': recipe.length,
    },
  }, (res) => {
    console.log(`STATUS: ${res.statusCode} ${res.statusMessage}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
    });
  });
  req.write(recipe);
  req.end();
}
