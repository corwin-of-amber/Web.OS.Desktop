/*
 * This implementation is based on
 * https://github.com/os-js/osjs-xterm-application
 */

import './index.scss';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
//import { AttachAddon } from 'xterm-addon-attach';
import * as clipboard from 'clipboard-polyfill';
import { name as applicationName } from './metadata.json';
import { Application, Core, Window } from '@osjs/client';


export interface TerminalApplication extends Application {
    windows: TerminalWindow[]
}

export interface TerminalWindow extends Window {
    term: Terminal
    $element: HTMLElement
    $content: HTMLElement
}

/*
 * Creates a new Terminal and Window
 */
const createTerminal = (core: Core, proc: Application, index: number) => {
    const term = new Terminal({
        allowTransparency: true,
        theme: {
            background: 'rgba(0, 0, 0, 0.3)'
        }
    });

    var fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    const fit = () => {
        setTimeout(() => {
            fitAddon.fit();
            term.focus();
            snap()
        }, 100);
    };

    function snap() {
        win.$element.style.height = '';
        win.$element.style.width = '';

        var box = term.element.querySelector('.xterm-screen').getBoundingClientRect();
        win.$content.style.width = `calc(${box.width + 6}px + 1em)`; // make room for padding and scrollbar

        win.resizeFit(win.$content);
        // Bug in resizeFit -- does not account for border
        win.setDimension({width: win.state.dimension.width + 2, height: win.state.dimension.height + 2});
    }

    const render = ($content: HTMLElement) => {
        term.open($content);
        fitAddon.fit();
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

    var win: TerminalWindow = proc.createWindow({
        id: 'Xterm_' + String(index),
        title: proc.metadata.title.en_EN,
        dimension: {width: 600, height: 340},
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
        .render(render) as TerminalWindow;

    core.on('osjs/window:change', (target) => {
        if (target === win)
            win.$content.style.width = '';
    });

    win.term = term;

    // sample output
    /*const fs = require('fs'), txt = fs.readFileSync('./src/index.js', 'utf-8');
    term.write(txt.replace(/\n/g, '\r\n'));*/
};

//
// Callback for launching application
//
OSjs.register(applicationName, (core: Core, args, options, metadata) => {

    const proc = core.make<Application>('osjs/application', {
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

    createWindow();
    proc.on('attention', () => createWindow());

    return proc;
});
