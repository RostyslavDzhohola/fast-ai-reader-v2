import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { NewTab } from './NewTab';
import './index.css';
ReactDOM.createRoot(document.getElementById('app')).render(_jsx(React.StrictMode, { children: _jsx(NewTab, {}) }));
