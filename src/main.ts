import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { startPersisting } from './state.svelte';

startPersisting();
mount(App, { target: document.getElementById('app')! });

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
