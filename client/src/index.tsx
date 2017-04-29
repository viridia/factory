import * as React from 'react';
import * as ReactDOM from 'react-dom';
import Page from './components/Page';
import store from './store';

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<Page />, document.getElementById('react-root'));
});
