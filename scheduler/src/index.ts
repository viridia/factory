import * as dotenv from 'dotenv';
import Scheduler from './Scheduler';

dotenv.config();

const scheduler = new Scheduler();
scheduler.run();
