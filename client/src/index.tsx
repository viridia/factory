import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Page from './components/Page';
import store from './store';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <Provider store={store}><Page /></Provider>,
    document.getElementById('react-root'));
});
