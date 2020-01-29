import { Core, Window } from '@osjs/client';
import { Terminal } from 'xterm';
import { Shell, TtyShell } from 'basin-shell/src/shell';
import { Resource, ResourceBundle } from 'basin-shell/src/package-mgr';



async function startx(osjs: Core) {
    await import('./apps/xterm-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    runWASITerminal(osjs);
}

async function runWASITerminal(osjs: Core) {
    var proc = await osjs.run('Terminal');
    proc.on('create-window', (win: Window & {term: Terminal, shell: Shell}) => {
        win.on('render', async () => {
            var term = win.term;
            var shell = new TtyShell();
            for (let pkg of Object.values(packageBundles))
                shell.packageManager.install(pkg);
            shell.attach(term);
            shell.start();
            win.shell = shell;
        });
    });
    Object.assign(window, {xterm: proc});
}

const ocaml = '/usr/local/lib/ocaml/';

var packageBundles: {[name: string]: ResourceBundle} = {
    'coreutils': {
        '/bin/ls':               '#!/bin/coreutils/ls.wasm',
        '/bin/touch':            '#!/bin/coreutils/touch.wasm',
        '/bin/cat':              '#!/bin/coreutils/cat.wasm',
        '/bin/cut':              '#!/bin/coreutils/cut.wasm',
        '/bin/env':              '#!/bin/coreutils/env.wasm',
        '/bin/cksum':            '#!/bin/coreutils/cksum.wasm',
        '/bin/mkdir':            '#!/bin/coreutils/mkdir.wasm',
        '/bin/rm':               '#!/bin/coreutils/rm.wasm',
        '/bin/date':             '#!/bin/coreutils/date.wasm'
    },

    'gnu-base': {
        '/bin/grep':             '#!/bin/grep.wasm',
        '/bin/make':             '#!/bin/make.wasm'
    },

    'nano': {
        '/bin/nano':             '#!/bin/nano.wasm'
    },

    'micropython': {
        '/bin/mpy':              '#!/bin/micropython.wasm'
    },

    'ocaml': {
        '/bin/ocamlrun':         '#!/bin/ocaml/ocamlrun.wasm',
        '/bin/ocaml':            `#!/bin/ocaml/ocamlrun.wasm ${ocaml}ocaml.byte`,
        '/bin/ocamlc':           `#!/bin/ocaml/ocamlrun.wasm ${ocaml}ocamlc.byte`,
        [ocaml+'camlheader']:    '#!/bin/ocaml/ocamlrun.wasm\n',
        [ocaml+'ocaml.byte']:    new Resource('/bin/ocaml/ocaml.byte'),
        [ocaml+'ocamlc.byte']:   new Resource('/bin/ocaml/ocamlc.byte'),
        [ocaml+'stdlib.cmi']:    new Resource('/bin/ocaml/stdlib.cmi'),
        [ocaml+'stdlib.cma']:    new Resource('/bin/ocaml/stdlib.cma'),
        [ocaml+'std_exit.cmo']:  new Resource('/bin/ocaml/std_exit.cmo'),
    },

    'tex': {
        '/bin/tex':              '#!/bin/tex/tex.wasm',
        '/bin/pdftex':           '#!/bin/tex/pdftex.wasm',
        '/usr/tex/dist/':        new Resource('/bin/tex/dist.zip'),
        '/bin/texmf.cnf':        new Resource('/bin/tex/texmf.cnf')
    },

    'sample-programs': {
        '/home/a.ml':          'let _ = print_int @@ 4 + 5;\nprint_string "\\n"\n',
        '/home/Makefile':      'hello: a.cmo\n\tocamlc $^ -o $@\n' +
                               'a.cmo: a.ml\n\tocamlc -c $^ -o $@',
        '/home/a.py':          'import sys; print("hello", sys.version)',
        '/home/doc.tex':       '\\medskip \n\nhello $x^2$ \n\n \\bye\n',
        '/home/arrows.tex':    new Resource('/bin/tex/sample-tikz.tex')
    }
}


export { startx }
