/*
 * This implementation is based on
 * https://github.com/os-js/osjs-xterm-application
 */

let osjs = window.OSjs;

import './index.scss';
import {Terminal} from 'xterm';
import * as fit from 'xterm/lib/addons/fit/fit';
import * as attach from 'xterm/lib/addons/attach/attach';
import * as clipboard from 'clipboard-polyfill';
import {name as applicationName} from './metadata.json';


/*
 * Creates a new Terminal and Window
 */
const createTerminal = (core, proc, index) => {
  const term = new Terminal({
    allowTransparency: true,
    theme: {
      background: 'rgba(0, 0, 0, 0.3'
    }
  });

  term.on('data', (d) =>  { console.log(d); term.write(d); });

  const fit = () => {
    setTimeout(() => {
      term.fit();
      term.focus();
      snap()
    }, 100);
  };

  function snap() {
    win.$element.style.height = '';
    win.$element.style.width = '';

    var box = term.element.querySelector('.xterm-screen').getBoundingClientRect();
    win.$content.style.width = `calc(${box.width + 2}px + 1em)`; // make room for scrollbar

    win.resizeFit(win.$content);
    // Bug in resizeFit -- does not account for border
    win.setDimension({width: win.state.dimension.width + 2, height: win.state.dimension.height + 2});
  }

  const render = ($content) => {
    term.open($content);
    term.fit();
    term.focus();

    $content.addEventListener('contextmenu', ev => {
      ev.preventDefault();

      core.make('osjs/contextmenu', {
        position: ev,
        menu: [{
          label: 'Copy text selection',
          onclick: () => clipboard.writeText(
            term.getSelection()
          )
        }, {
          label: 'Paste from clipboard',
          onclick: () => clipboard.readText()
            .then(data => term.write(data))
        }]
      });
    });
  };

  var win = proc.createWindow({
    id: 'Xterm_' + String(index),
    title: proc.metadata.title.en_EN,
    dimension: {width: 600, height: 288},
    attributes: {
      classNames: ['Window_Xterm']
    }
  })
    .on('resized', fit)
    .on('maximize', fit)
    .on('restore', fit)
    .on('moved', () => term.focus())
    .on('focus', () => term.focus())
    .on('blur', () => term.blur())
    .on('render', () => {
      snap();
      win.focus();
    })
    .render(render);

  core.on('osjs/window:change', (target) => {
    if (target === win)
      win.$content.style.width = '';
  });

  win.term = term;

  // sample output
  const fs = require('fs'), txt = fs.readFileSync('./src/index.js', 'utf-8');
  term.write(txt.replace(/\n/g, '\r\n'));
};

//
// Callback for launching application
//
osjs.register(applicationName, (core, args, options, metadata) => {
  Terminal.applyAddon(fit);
  Terminal.applyAddon(attach);

  const proc = core.make('osjs/application', {
    args,
    options,
    metadata
  });

  proc.on('destroy-window', () => {
    if (!proc.windows.length) {
      proc.destroy();
    }
  });

  const createWindow = () => createTerminal(core, proc, proc.windows.length);

  setTimeout(() => createWindow(), 10);

  proc.on('attention', () => createWindow());

  return proc;
});
