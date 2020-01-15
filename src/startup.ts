import { Core, Window } from '@osjs/client';
import { Terminal } from 'xterm';
import { Shell, TtyShell } from 'basin-shell/src/shell';
import { Resource } from 'basin-shell/src/package-mgr';



async function startx(osjs: Core) {
    await import('./xterm-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    runWASITerminal(osjs);
}

async function runWASITerminal(osjs: Core) {
    var proc = await osjs.run('Terminal');
    proc.on('create-window', (win: Window & {term: Terminal, shell: Shell}) => {
        win.on('render', async () => {
            var term = win.term;
            var shell = new TtyShell();
            shell.packageManager.install(packageBundles['ocaml']);
            shell.attach(term);
            shell.start();
            win.shell = shell;
        });
    });
    Object.assign(window, {xterm: proc});
}

var packageBundles = {
    'ocaml': {
        '/bin/ocamlrun':       '#!/bin/ocamlrun.wasm',
        '/bin/ocaml':          '#!/bin/ocamlrun.wasm /bin/ocaml.byte',
        '/bin/ocamlc':         '#!/bin/ocamlrun.wasm /bin/ocamlc.byte',
        '/home/camlheader':    '#!/bin/ocamlrun.wasm\n',
        '/bin/ocaml.byte':     new Resource('/bin/ocaml.byte'),
        '/bin/ocamlc.byte':    new Resource('/bin/ocamlc.byte'),
        '/home/stdlib.cmi':    new Resource('/bin/ocaml/stdlib.cmi'),
        '/home/stdlib.cma':    new Resource('/bin/ocaml/stdlib.cma'),
        '/home/std_exit.cmo':  new Resource('/bin/ocaml/std_exit.cmo'),
    }
}


export { startx }