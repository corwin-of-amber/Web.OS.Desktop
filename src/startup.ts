import { Core as CoreImpl, Application } from '@osjs/client';
//import { Resource, ResourceBundle } from 'basin-shell/src/package-mgr';
import { Resource, ResourceBundle } from 'wasi-kernel/src/kernel/services/package-mgr';
import { WASITerminal } from './wasi-terminal';

import './apps/xterm-app/index.scss';
import 'xterm/css/xterm.css';


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

    var xterm = new WASITerminal(osjs, packageBundles);
    Object.assign(window, {xterm});

    //var fm = await osjs.run('FileManager', {path: {path: 'wasi:/home'}});
    //fm.windows[0].setPosition({left: 620, top: 36});
    //Object.assign(window, {fm});

    //setActiveInterval((<any>fm).refresh, 2500);
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
        '/bin/ocaml':            `#!/bin/ocaml/ocamlrun.wasm ${ocaml}ocaml`,
        '/bin/ocamlc':           `#!/bin/ocaml/ocamlrun.wasm ${ocaml}ocamlc`,
        [ocaml+'camlheader']:    '#!/bin/ocaml/ocamlrun.wasm\n',
        [ocaml+'/']:             new Resource('/bin/ocaml/base.zip')
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
        '/home/a.py':          'import sys; print("hello", sys.version); print(list(5 * x + y for x in range(10) for y in [4, 2, 1]));\n',
        '/home/doc.tex':       '\\medskip \n\nhello $x^2$ \n\n \\bye\n',
        '/home/arrows.tex':    new Resource('/bin/tex/sample-tikz.tex')
    }
}


export { startx }
