import { Core as CoreImpl, Application } from '@osjs/client';
import distro, { published } from './distro';

import './apps/xterm-app/index.scss';
import 'xterm/css/xterm.css';

import { PtyChildProcessStreamAdapter, wasik } from './shell/wasi-bindings';
import { TerminalApplication } from './apps/xterm-app';
import { PackageManager } from 'wasi-kernel/services';


declare interface Core extends CoreImpl {
    make(key: string): any
    run(app: string, args?: {}, options?: any): Promise<Application>
}


async function startx(osjs: Core) {
    const locale = osjs.make('osjs/locale');
    if (locale.getLocale() === 'he_HE') locale.setLocale('en_EN');

    await import('./apps/xterm-app');
    await import('./apps/codemirror-app');
    //await import('./apps/preview-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    //const busybox = 'file:///Users/corwin/var/ext/wasm/ports/busybox/busybox.wasm';

    await wasik.startup({log: "trace"});
    osjs.emit('wasi/login', {sys: wasik});

    let term = await osjs.run('Terminal') as TerminalApplication,
        termRect = term.windows[0].$element.getBoundingClientRect(),
        fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});

    fm.windows[0].setPosition({left: termRect.right, top: Math.max(33, termRect.top - 33)});
        
    Object.assign(window, {term, fm, wasik});

    let con = new PtyChildProcessStreamAdapter()
        .withTerminal(term.windows[0].term);

    Object.assign(window, {con});

    const PKGS = {
        ro: ['busybox', 'gnu', 'ocaml', 'ocaml-libs', 'rocq'],
        rw: ['sample-programs']
    };
    const repo = process.versions?.nw ? distro : published;

    let pm = new PackageManager(wasik.vfs),
        dt = term.windows[0].term;
    pm.on('progress', ev => {
        if (ev.done) dt.write(`${' '.repeat(40)}\r`);
        else if (ev.download) dt.write(`\x1b[0;37m downloading: ${Math.round(ev.download.downloaded / 1000)}KB\x1b[0m\r`);
    })

    for (let [k, pkgs] of Object.entries(PKGS)) {
        wasik.vfs.options.readonly = (k == 'ro');
        for (let pkg of pkgs)
            await pm.install(repo[pkg] ?? {});
    }

    con.withProcess(await wasik.runWasix('/usr/bin/busybox', {program: 'sh'}));

    fm.windows[0].emit('filemanager:refresh');
    /** @todo */

    let edit = await osjs.run('CodeMirror', {}, {open: false});

    Object.assign(window, {edit})

    /*
    //await new Promise(r => setTimeout(r, 1500));
    osjs.on('wasi/login', async () => {
        var fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});
        fm.windows[0].setPosition({left: 620, top: 36});
        Object.assign(window, {fm});

        //let refresh = () => fm.windows[0].emit('filemanager:refresh');
        //setActiveInterval(refresh, 2500);
    });*/
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
