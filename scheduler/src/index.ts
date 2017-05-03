import * as Queue from 'rethinkdb-job-queue';
import Scheduler from './Scheduler';

const scheduler = new Scheduler();
scheduler.run();
