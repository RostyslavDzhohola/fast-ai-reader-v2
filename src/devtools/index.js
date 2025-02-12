import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DevTools } from './DevTools';
import './index.css';
ReactDOM.createRoot(document.getElementById('app')).render(_jsx(React.StrictMode, { children: _jsx(DevTools, {}) }));
chrome.devtools.panels.create('ReactCrx', '', '../../devtools.html', function () {
    console.log('devtools panel create');
});
