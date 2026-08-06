import { Lazily, Resource, ResourceBundle, Symlink } from 'wasi-kernel/services';



let expandUser = (fn: string) => fn.replace(/^~/, process.env['HOME']),
    rcsfile = (fn: string, ct?: string) => new Resource(`file://${expandUser(fn)}`, ct);

const PORTS_ROOT = '~/var/ext/wasm/ports',
      OCAML_ROOT = `${PORTS_ROOT}/ocaml/ocaml-4.14`,
      OCAML_LIBS_ROOT = `${PORTS_ROOT}/ocaml/libs`,
      JSCOQ_WORKDIR = `~/var/workspace/jscoq`;


const BUSYBOX_APPLETS = [...`
    awk, basename, cat, chgrp, chmod, chown, cp, cut, date, diff, dirname, du, echo, env, find, fold, grep,
    head, hexdump, less, ln, ls, mkdir, mv, printf, pwd, realpath, rm, rmdir, sed, sh, sleep, tail, tee,
    touch, vi, which
    `.trim().split(/,[\s\n]+/)]

const ul = '/usr/local';
const uls = '/usr/local/share';
const ocaml = '/usr/local/lib/ocaml';


const packageBundles: {[name: string]: ResourceBundle} = {

    'busybox': {
        '/usr/bin/busybox': rcsfile(`${PORTS_ROOT}/busybox/busybox.wasm`),
        ...Object.fromEntries(BUSYBOX_APPLETS.map(applet =>
            [`/usr/bin/${applet}`, new Symlink('/usr/bin/busybox')]))
    },

    'gnu': {
        '/usr/bin/make': rcsfile(`${PORTS_ROOT}/gnu/make/make.wasm`)
    },

    'ocaml': {
        '/usr/bin/ocamlrun': rcsfile(`${OCAML_ROOT}/runtime/ocamlrun.wasm`),
        '/usr/bin/ocaml': new Symlink(`${ocaml}/ocaml`),
        '/usr/bin/ocamlc': new Symlink(`${ocaml}/ocamlc`),
        '/usr/lib/dllcamlstr.so': rcsfile(`${OCAML_ROOT}/otherlibs/str/dllcamlstr.wasm`),
        '/usr/lib/dllunix.so': rcsfile(`${OCAML_ROOT}/otherlibs/unix/dllunix.wasm`),
        '/usr/lib/dllthreads.so': rcsfile(`${OCAML_ROOT}/otherlibs/systhreads/dllthreads.wasm`),
        '/usr/local/etc/findlib.conf': 'path="/usr/local/lib"',
        [`${ocaml}/`]: new Lazily({
            [`/`]: rcsfile(`${OCAML_ROOT}/base.tar`),
            [`/camlheader`]: '#!/usr/bin/ocamlrun\n',
        })
    },

    'ocaml-libs': {
        //[`${ocaml}/nums.cma`]: rcsfile(`${OCAML_LIBS_ROOT}/num/src/nums.cma`),
        '/usr/lib/dllnums.so': rcsfile(`${OCAML_LIBS_ROOT}/num/src/dllnums.wasm`),

        '/usr/lib/dllzarith.so': rcsfile(`${OCAML_LIBS_ROOT}/zarith/dllzarith.wasm`),

        /*
        [`${ocaml}/base.cma`]: rcsfile(`${OCAML_LIBS_ROOT}/janestreet/base/lib/base.cma`),
        [`${ocaml}/base_internalhash_types.cma`]: rcsfile(`${OCAML_LIBS_ROOT}/janestreet/base/lib/base_internalhash_types.cma`),
        [`${ocaml}/shadow_stdlib.cma`]: rcsfile(`${OCAML_LIBS_ROOT}/janestreet/base/lib/shadow_stdlib.cma`),
        */
        '/usr/lib/dllbase_stubs.so': rcsfile(`${OCAML_LIBS_ROOT}/janestreet/base/lib/dllbase_stubs.wasm`),
        '/usr/lib/dllbase_internalhash_types_stubs.so': rcsfile(`${OCAML_LIBS_ROOT}/janestreet/base/lib/dllbase_internalhash_types_stubs.wasm`),
    },

    'rocq': {
        '/usr/bin/rocq': '#!/usr/bin/sh\n\nOCAMLFIND_CONF=/usr/local/etc/findlib.conf ocamlrun /usr/local/lib/rocq-runtime/rocqworker.byte --kind=repl -boot -R /usr/local/lib/rocq-runtime "" "$@"\n',
        '/usr/lib/dlllib_stubs.so': rcsfile(`${JSCOQ_WORKDIR}/_build/wasm/dlllib_stubs.wasm`),
        '/usr/lib/dllcoqrun_stubs.so': rcsfile(`${JSCOQ_WORKDIR}/_build/wasm/dllcoqrun_stubs.wasm`),

        '/usr/local/lib/rocq-runtime/': new Lazily({
            //'/rocq.byte': rcsfile(`${JSCOQ_WORKDIR}/_build/install/jscoq+64bit/bin/rocq.byte`),
            '/rocqworker.byte': rcsfile(`${JSCOQ_WORKDIR}/_build/install/jscoq+64bit/lib/rocq-runtime/rocqworker.byte`),
            '/META': rcsfile(`${JSCOQ_WORKDIR}/_build/install/jscoq+64bit/lib/rocq-runtime/META`),
            '/': rcsfile(`${JSCOQ_WORKDIR}/coq-pkgs/init.coq-pkg`, 'application/zip')
        })
    },

    'python': {
        //'/usr/bin/python': rcsfile(`${PORTS_ROOT}/python/python-3.14/cross-build/wasm32-wasip1/python.wasm`),
        '/usr/bin/python': rcsfile(`${PORTS_ROOT}/python/python-3.14/python.wasm`),
        '/usr/local/lib/python/': new Lazily(rcsfile(`${PORTS_ROOT}/python/python-3.14/lib.tar`)),
    },

    'lean': {
        '/usr/bin/lean': rcsfile(`~/var/ext/lean4/bin/lean.wasm`),
        '/usr/bin/lake': rcsfile(`~/var/ext/lean4/bin/lake.wasm`),
        '/usr/lib/lean/': new Lazily(rcsfile(`~/var/ext/lean4/lib/Init32.tar`)),
        '/dev/urandom': '+'.repeat(8192),
        '/etc/localtime': rcsfile('/etc/localtime'),  /* using local system's?.. */
    },

    /*
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

    'ncurses': {
        '/bin/hello': '#!/bin/hello.wasm',
        '/bin/tclock': '#!/bin/tclock.wasm',
        [`${uls}/terminfo/78/xterm-256color`]: new Resource('/bin/terminfo/78/xterm-256color')
    },

    'vim': {
        '/bin/vim': '#!/bin/vim.wasm',
        '/usr/local/share/vim/defaults.vim': new Resource('/bin/defaults.vim')
    },

    'gnu-base': {
        '/bin/grep':             '#!/bin/grep.wasm',
        '/bin/make':             '#!/bin/gnu/make.wasm'
    },

    'nano': {
        '/bin/nano':             '#!/bin/nano.wasm'
    },

    'micropython': {
        '/bin/python':           '#!/bin/micropython.wasm'
    },*/


    /*
    'tex': {
        '/bin/tex':              '#!/bin/tex/tex.wasm',
        '/bin/pdftex':           '#!/bin/tex/pdftex.wasm',
        '/usr/tex/dist/':        new Resource('/bin/tex/dist.zip'),
        '/bin/texmf.cnf':        new Resource('/bin/tex/texmf.cnf')
    },
    */

    'sample-programs': {
        '/home/.ash_history':  
            'python -c "import array; print(array.array(\'i\'))"\n' +
            'lean /home/a.lean -o /home/a.olean\n',
                             
        '/home/a.lean': 'module\n\ndef n : Nat := 0\n#check n + 0\n',
        '/home/b.lean': 'prelude\n\n import a',
        '/home/c.lean': 'module\nprelude\npublic import Init.Coe\n',
        '/home/tut.lean': rcsfile(`~/var/ext/lean4/tmp/tut.lean`),
        '/home/lakefile.toml': rcsfile(`~/var/ext/lean4/tmp/ab/lakefile.toml`),
        '/home/AB.lean': rcsfile(`~/var/ext/lean4/tmp/ab/AB.lean`),
        '/home/AB/a.lean': rcsfile(`~/var/ext/lean4/tmp/ab/AB/a.lean`),
        '/home/AB/b.lean': rcsfile(`~/var/ext/lean4/tmp/ab/AB/b.lean`),

        '/home/.python_history': 'import array\n',
        '/home/a.sh':          '#!/usr/bin/sh\n\necho script\n',
        '/home/.dashrc':       'alias ls="ls --color"\n',
        '/home/a.ml':          'let _ = print_int @@ 4 + 5;\nprint_string "\\n"\n',
        '/home/Makefile':      'hello: a.cmo\n\tocamlc $^ -o $@\n' +
                               'a.cmo: a.ml\n\tocamlc -c $^ -o $@',
        '/home/a.py':          'import sys\n\nprint("hello", sys.version)\nprint(list(5 * x + y for x in range(10) for y in [4, 2, 1]));\n',
        '/home/doc.tex':       '\\medskip \n\nhello $x^2$ \n\n \\bye\n',
        //'/home/arrows.tex':    new Resource('/bin/tex/sample-tikz.tex')
    }
}


const published: {[name: string]: ResourceBundle} = Object.fromEntries(
    Object.keys(packageBundles).map(k =>
        [k, {'/': new Resource(`pm/${k}.tar`, 'application/tar')}]));

published['ocaml'][`${ocaml}/`] = new Lazily({
    '/': new Resource(`pm/ocaml-0.tar`, 'application/tar')
});
published['rocq']['/usr/local/lib/rocq-runtime/'] = new Lazily({
    '/': new Resource(`pm/rocq-0.tar`, 'application/tar')
});
published['python']['/usr/local/lib/python/'] = new Lazily({
    '/': new Resource(`pm/python-0.tar`, 'application/tar')
});


export { published, OCAML_ROOT, rcsfile }


export default packageBundles