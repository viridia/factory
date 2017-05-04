import * as dotenv from 'dotenv';
import * as Queue from 'rethinkdb-job-queue';
import Scheduler from './Scheduler';

dotenv.config();

const scheduler = new Scheduler();
scheduler.run();
