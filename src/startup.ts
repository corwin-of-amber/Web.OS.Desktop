import { Core as CoreImpl, Application } from '@osjs/client';
//import { WASITerminal } from './wasi-terminal';
//import distro from './distro';

import './apps/xterm-app/index.scss';
import 'xterm/css/xterm.css';

import { DummyTerminal } from './shell/wasi-bindings';
import { TerminalApplication } from './apps/xterm-app';
import { Terminal } from 'xterm';


declare interface Core extends CoreImpl {
    make(key: string): any
    run(app: string, args?: {}, options?: any): Promise<Application>
}


async function startx(osjs: Core) {
    const locale = osjs.make('osjs/locale');
    if (locale.getLocale() === 'he_HE') locale.setLocale('en_EN');

    await import('./apps/xterm-app');
    //await import('./apps/preview-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    //var xterm = new WASITerminal(osjs, distro);
    //Object.assign(window, {xterm});

    let term = await osjs.run('Terminal') as TerminalApplication,
        termRect = term.windows[0].$element.getBoundingClientRect(),
        fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});

    fm.windows[0].setPosition({left: termRect.right, top: termRect.top - 33});
        
    Object.assign(window, {term, fm});

    let d = new DummyTerminal;
    (async (term: Terminal) => {
        term.onData(data => d.write(data));
        for await (let data of d.read()) term.write(data);
    })(term.windows[0].term);
    Object.assign(window, {d});

    //await new Promise(r => setTimeout(r, 1500));
    osjs.on('wasi/login', async () => {
        var fm = await osjs.run('FileManager'); //, {path: {path: 'wasi:/home'}});
        fm.windows[0].setPosition({left: 620, top: 36});
        Object.assign(window, {fm});

        //let refresh = () => fm.windows[0].emit('filemanager:refresh');
        //setActiveInterval(refresh, 2500);
    });
}

/**
 * Runs a function every ms, but only when the window is active
 */
function setActiveInterval(func: () => void, ms: number) {
    var intervalId = setInterval(func, ms);

    window.focus();

    window.addEventListener('focus', () => {
        if (!intervalId) {
            func();
            intervalId = setInterval(func, ms);
        }
    });

    window.addEventListener('blur', () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
        }
    });
}




export { startx }
