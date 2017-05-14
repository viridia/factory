import { connect } from 'rethinkdb';

connect({
  host: process.env.RETHINKDB_PROXY_SERVICE_HOST,
  port: process.env.RETHINKDB_PROXY_SERVICE_PORT,
  db: 'Factory2',
}, (err, connection) => {
  if (err) {
    console.error('error!', err);
  } else {
    console.log('connected!');
  }
});
