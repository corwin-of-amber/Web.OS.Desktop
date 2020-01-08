// build with
// parcel -p 8009 src/index.html
//
// This is the client bootstrapping script.
// Based on:
//   https://github.com/os-js/OS.js/blob/v3/src/client/index.js
//

import {
  Core,
  CoreServiceProvider,
  DesktopServiceProvider,
  VFSServiceProvider,
  NotificationServiceProvider,
  SettingsServiceProvider,
  AuthServiceProvider
} from '@osjs/client';

import {PanelServiceProvider} from '@osjs/panels';
import {GUIServiceProvider} from '@osjs/gui';
import {DialogServiceProvider} from '@osjs/dialogs';

import '@osjs/gui/index.scss';  // this is not loaded by default in @osjs/gui

import './index.css';
import config from './config.js';
import { startx } from './startup';



const init = async () => {
  const osjs = new Core(config, {});

  window.osjs = osjs;

  // Register your service providers
  osjs.register(CoreServiceProvider);
  osjs.register(DesktopServiceProvider);
  osjs.register(SettingsServiceProvider, {before: true});
  osjs.register(VFSServiceProvider);

  osjs.register(NotificationServiceProvider);
  osjs.register(AuthServiceProvider, {before: true});
  osjs.register(PanelServiceProvider);
  osjs.register(DialogServiceProvider);
  osjs.register(GUIServiceProvider);

  osjs.boot();

  //var xterm = import('./xterm-app');

  osjs.on('osjs/core:started', async () => {
    startx(osjs);/*
    await xterm;
    window.xterm = xterm = await osjs.run('Terminal');
    setTimeout(() => {
      console.log(xterm.windows[0].term);
      var t = new TtyShell();
      t.attach(xterm.windows[0].term);
      t.start();
    }, 1000);*/
  });
};


window.addEventListener('DOMContentLoaded', () => init());
