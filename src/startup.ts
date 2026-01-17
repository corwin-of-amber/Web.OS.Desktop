import { Core as CoreImpl, Application } from '@osjs/client';
//import { WASITerminal } from './wasi-terminal';
//import distro from './distro';

import './apps/xterm-app/index.scss';
import 'xterm/css/xterm.css';


declare interface Core extends CoreImpl {
    make(key: string): any
    run(app: string, args?: {}, options?: any): Promise<Application>
}


async function startx(osjs: Core) {
    const locale = osjs.make('osjs/locale');
    if (locale.getLocale() === 'he_HE') locale.setLocale('en_EN');

    await import('./apps/xterm-app/index.js');
    //await import('./apps/preview-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    //var xterm = new WASITerminal(osjs, distro);
    //Object.assign(window, {xterm});

    let term = await osjs.run('Terminal'),
        termRect = term.windows[0].$element.getBoundingClientRect(),
        fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});

    fm.windows[0].setPosition({left: termRect.right, top: termRect.top - 33});
        
    Object.assign(window, {term, fm});


    //await new Promise(r => setTimeout(r, 1500));
    osjs.on('wasi/login', async () => {
        var fm = await osjs.run('FileManager'); //, {path: {path: 'wasi:/home'}});
        fm.windows[0].setPosition({left: 620, top: 36});
        Object.assign(window, {fm});

        let refresh = () => fm.windows[0].emit('filemanager:refresh');
        setActiveInterval(refresh, 2500);
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
