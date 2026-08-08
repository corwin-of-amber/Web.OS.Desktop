import { Core as CoreImpl, Application } from '@osjs/client';
import { PackageManager } from 'wasi-kernel/services';
import distro, { published } from './distro';

import './apps/xterm-app/index.scss';
import 'xterm/css/xterm.css';

import { PtyChildProcessStreamAdapter, wasik } from './shell/wasi-bindings';
import { TerminalApplication } from './apps/xterm-app';
import { LeanApplication } from './apps/lean-demo-app';

declare interface Core extends CoreImpl {
    make(key: string): any
    run(app: string, args?: {}, options?: any): Promise<Application>
}


Atomics.wait = (typedArray, index, value, timeout) => {
    if (timeout <= 0) return 'timed-out';
    if (Atomics.load(typedArray, index) !== value) return 'not-equal';
    let end = timeout < Infinity ? performance.now() + timeout : Infinity;
    while (Atomics.load(typedArray, index) === value) {
      if (performance.now() > end) return 'timed-out';
    }
    return 'not-equal';
};

async function startx(osjs: Core) {
    let accel = {};
    initializeKeyBindings(accel);

    const locale = osjs.make('osjs/locale');
    if (locale.getLocale() === 'he_HE') locale.setLocale('en_EN');

    await import('./apps/xterm-app');
    await import('./apps/codemirror-app');
    await import('./apps/lean-demo-app');
    //await import('./apps/preview-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    let term = await osjs.run('Terminal') as TerminalApplication,
        dt = term.windows[0].term;
          
    accel['1'] = term;
    dt.write(`\x1b[0;37mWait for it...\x1b[0m`);

    await wasik.startup({log: "warn"});
    Object.assign(wasik.env, {
        'PYTHONHOME': '/usr/local',
        'PYTHONPATH': '/usr/local/lib/python',
        'TERMINFO': '/usr/local/share/terminfo',
        'TERM': 'xterm-256color',
        'LEAN_PATH': '/usr/lib/lean',  // needed for stage-0 Lean
        'LEAN_NUM_THREADS': '1'
    })
    osjs.emit('wasik/boot', {sys: wasik});
    osjs.singleton('wasik', () => ({sys: wasik}));

    Object.assign(window, { wasik });

    let termRect = term.windows[0].$element.getBoundingClientRect(),
        fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});

    fm.windows[0].setPosition({left: termRect.right, top: Math.max(33, termRect.top - 33)});
    dt.write(`\r${' '.repeat(40)}\r`);

    Object.assign(window, {term, fm, wasik});

    let con = new PtyChildProcessStreamAdapter()
        .withTerminal(term.windows[0].term);

    Object.assign(window, {con});

    const PKGS = {
        ro: ['busybox', 'gnu', 'ocaml', 'ocaml-libs', 'rocq', 'python', 'lean'],
        rw: ['sample-programs']
    };
    const repo = process.versions?.nw ? distro : published;

    let pm = new PackageManager(wasik.vfs);
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

    //let lean = await osjs.run('Lean LSP (worker)') as LeanApplication;

    fm.windows[0].emit('filemanager:refresh');
    let refresh = () => fm.windows[0].emit('filemanager:refresh');
    setActiveInterval(refresh, 2500);

    let edit = await osjs.run('CodeMirror', {}, {open: false});

    Object.assign(window, { edit })
}

function initializeKeyBindings(accel: {[k: string]: any}) {
    window.addEventListener('keydown', (ev) => {
        if (ev.metaKey && ev.code == 'KeyR') (<any>window).k.reload();// typeof k !== 'undefined' ? k.reload() : location.reload();
        if (ev.metaKey && ev.code == 'Digit1') {
            let win = accel['1']?.windows[0];
            if (win) win.focus() || win.blur();
        }
    }, {capture: true});
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
