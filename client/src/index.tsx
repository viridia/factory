import * as dateformat from 'dateformat';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import Page from './components/Page';
import './components/styles/bootstrap.scss';
import store from './store';

document.addEventListener('DOMContentLoaded', () => {
  dateformat.masks.brief = 'm/d/yy h:MM TT';
  ReactDOM.render(
    <Provider store={store}><Page /></Provider>,
    document.getElementById('react-root'));
});
