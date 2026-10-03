#!/bin/bash
cd /www/apps/strapi

echo "=== 1. Redis test ==="
node -e "
const Redis = require('ioredis');
const r = new Redis({host:'127.0.0.1',port:6379,password:'Joho@963963'});
r.ping().then(v => { console.log('PING OK:', v); return r.quit(); }).catch(e => { console.log('PING ERR:', e.message); });
"

echo ""
echo "=== 2. Bull test ==="
node -e "
try {
  const Queue = require('bull');
  const q = new Queue('test-queue', {
    redis: { host:'127.0.0.1', port:6379, password:'Joho@963963', db:0, maxRetriesPerRequest:1 },
  });
  q.on('ready', () => { console.log('QUEUE OK'); q.close().then(() => process.exit(0)); });
  q.on('error', (e) => { console.log('QUEUE ERR:', e.message); process.exit(1); });
} catch(e) {
  console.log('BULL SYNC ERR:', e.message);
  process.exit(1);
}
"

echo ""
echo "=== 3. pm2 logs last ==="
tail -30 /home/admin/.pm2/logs/strapi-out.log
echo "--- ERR ---"
tail -10 /home/admin/.pm2/logs/strapi-error.log
