import { Core as CoreImpl } from '@osjs/client';
import { Resource, ResourceBundle } from 'basin-shell/src/package-mgr';
import { WASITerminal } from './wasi-terminal';


declare interface Core extends CoreImpl {
    make(key: string): any
}


async function startx(osjs: Core) {
    const locale = osjs.make('osjs/locale');

    await import('./apps/xterm-app');
    await import('./apps/preview-app');

    await new Promise(resolve => window.requestAnimationFrame(resolve));

    var xterm = new WASITerminal(osjs, packageBundles);
    Object.assign(window, {xterm});

    var fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});
    fm.windows[0].setPosition({left: 620, top: 36});
    Object.assign(window, {fm});

    var intervalId = setInterval((<any>fm).refresh, 2500);

    window.focus();

    window.addEventListener('focus', () => {
        (<any>fm).refresh();
        intervalId = setInterval((<any>fm).refresh, 2500);
        console.log('---- focus ----');
    });

    window.addEventListener('blur', () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = undefined;
        }
        console.log('---- blur ----');
    });
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
        '/home/.dashrc':       'alias ls="ls --color"\n',
        '/home/a.ml':          'let _ = print_int @@ 4 + 5;\nprint_string "\\n"\n',
        '/home/Makefile':      'hello: a.cmo\n\tocamlc $^ -o $@\n' +
                               'a.cmo: a.ml\n\tocamlc -c $^ -o $@',
        '/home/a.py':          'import sys; print("hello", sys.version)',
        '/home/doc.tex':       '\\medskip \n\nhello $x^2$ \n\n \\bye\n',
        '/home/arrows.tex':    new Resource('/bin/tex/sample-tikz.tex'),
        '/home/a.pdf':         new Resource('/a.pdf')
    }
}


export { startx }
