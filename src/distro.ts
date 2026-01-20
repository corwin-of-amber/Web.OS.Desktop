import { Resource, ResourceBundle, Symlink } from 'wasi-kernel/services';



let expandUser = (fn: string) => fn.replace(/^~/, process.env['HOME']),
    rcsfile = (fn: string, ct?: string) => new Resource(`file://${expandUser(fn)}`, ct);

const PORTS_ROOT = '~/var/ext/wasm/ports',
      OCAML_ROOT = `${PORTS_ROOT}/ocaml/ocaml-4.14`,
      OCAML_LIBS_ROOT = `${PORTS_ROOT}/ocaml/libs`,
      JSCOQ_WORKDIR = `~/var/workspace/jscoq`,
      ocamlWasm = `${OCAML_ROOT}/runtime/ocamlrun.wasm`;


const BUSYBOX_APPLETS = [...
    `awk, basename, cat, cut, date, diff, dirname, du, echo, env, find,
	 fold, grep, head, ln, ls, rm, sed, sh, touch, vi`
     .split(/,[\s\n]+/)]

const ul = '/usr/local';
const uls = '/usr/local/share';
const ocaml = '/local/lib/ocaml';


var packageBundles: {[name: string]: ResourceBundle} = {

    'busybox': {
        '/bin/busybox': rcsfile(`${PORTS_ROOT}/busybox/busybox.wasm`),
        ...Object.fromEntries(BUSYBOX_APPLETS.map(applet =>
            [`/bin/${applet}`, new Symlink('/bin/busybox')]))
    },

    'ocaml': {
        'bin/ocamlrun': rcsfile(`${OCAML_ROOT}/runtime/ocamlrun.wasm`),
        'bin/ocaml': new Symlink('/local/lib/ocaml/ocaml'),
        'bin/ocamlc': new Symlink('/local/lib/ocaml/ocamlc'),
        [ocaml+'/']: rcsfile(`${OCAML_ROOT}/base.tar`),
        [ocaml+'/camlheader']: '#!/usr/bin/ocamlrun\n'
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
        '.dashrc':       'alias ls="ls --color"\n',
        'a.ml':          'let _ = print_int @@ 4 + 5;\nprint_string "\\n"\n',
        'Makefile':      'hello: a.cmo\n\tocamlc $^ -o $@\n' +
                               'a.cmo: a.ml\n\tocamlc -c $^ -o $@',
        'a.py':          'import sys; print("hello", sys.version); print(list(5 * x + y for x in range(10) for y in [4, 2, 1]));\n',
        'doc.tex':       '\\medskip \n\nhello $x^2$ \n\n \\bye\n',
        //'arrows.tex':    new Resource('/bin/tex/sample-tikz.tex')
    }
}


export default packageBundles