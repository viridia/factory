import * as dotenv from 'dotenv';
import App from './App';
import { logger } from './logger';

dotenv.config();

const app = new App();
app.ready.then(() => {
  const port = parseInt(process.env.PORT, 10) || 80;
  logger.info(`Listening on port: ${port}.`);
  app.express.listen(port);
});
