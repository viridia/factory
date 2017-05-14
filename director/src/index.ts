import App from './App';
import config from './config';

const app = new App();
app.ready.then(() => {
  app.express.listen(config.port);
});
