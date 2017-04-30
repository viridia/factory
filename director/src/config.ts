import * as dotenv from 'dotenv';

dotenv.config();

export default {
  debug: process.env.DEBUG === 'true',
  port: parseInt(process.env.PORT, 10),
};
