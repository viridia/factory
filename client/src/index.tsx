import axios from 'axios';
import * as dateformat from 'dateformat';
import * as deepstream from 'deepstream.io-client-js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Page from './components/Page';
import './components/styles/bootstrap.scss';
import globals from './globals';
import store from './store';

document.addEventListener('DOMContentLoaded', () => {
  dateformat.masks.brief = 'm/d/yyyy h:MM TT';
  // TODO(talin) - get this URL from the backend.
  axios.get('/api/v1/config').then(resp => {
    globals.hosts = resp.data.hosts;
    // Most of the time we want to log in to the DS router hosted on the same domain, but for
    // local development we want to use a development router.
    globals.deepstream = deepstream(
        globals.hosts.deepstream || `wss://${window.location.hostname}`).login();
    ReactDOM.render(
      <Provider store={store}><Page /></Provider>,
      document.getElementById('react-root'));
  });
});
