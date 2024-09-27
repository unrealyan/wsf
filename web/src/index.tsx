/* @refresh reload */
import { render } from 'solid-js/web';
import StoreProvider from './lib/store'
import { Router, Route } from "@solidjs/router";

import './index.css';
import App from './App';

import Home from "./pages/home"
import Login from "./pages/login"
import Redirect from './pages/redirect'

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
  );
}

render(() => <StoreProvider>
  <Router root={App}>
    <Route path="/" component={Home} />
    <Route path="/signin" component={Login} />
    <Route path="/redirect" component={Redirect} />
  </Router>
</StoreProvider>, root!);
