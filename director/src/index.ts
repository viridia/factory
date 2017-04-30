import App from './App';
import config from './config';

const app = new App();
app.express.listen(config.port);
