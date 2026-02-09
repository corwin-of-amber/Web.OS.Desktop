#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

import { enumerate } from 'itertools';
import tar from 'tar-stream';

import { PackageManager, Lazily, ResourceBundle } from 'wasi-kernel/services';
import distro from './distro';


async function main() {

    const OUT = 'dist/pm';
    await fs.promises.mkdir(OUT, {recursive: true});

    for (let [pkg, bundle] of Object.entries(distro)) {
        let [eager, lazy] = splitEagerAndLazy(bundle);

        await bundleToTar(eager, path.join(OUT, `${pkg}.tar`));

        for (let [i, [k, v]] of enumerate(Object.entries(lazy))) {
            await bundleToTar(v.bundle, path.join(OUT, `${pkg}-${i}.tar`));
            console.log(`  (lazy) ${k}`);
        }
    }
}

async function bundleToTar(bundle: ResourceBundle, outfn: string) {
    let tv = new TarVolume().withOutput(outfn),
        pm = new PackageManager(tv);

    await pm.install(bundle);
    await tv.close();
    console.log(`-> ${outfn}`);
}


function splitEagerAndLazy(bundle: ResourceBundle) {
    let [eager, lazy] = [{}, {}] as ResourceBundle[];
    for (let [k, v] of Object.entries(bundle)) {
        if (v instanceof Lazily) lazy[k] = v;
        else eager[k] = v;
    }
    return [eager, lazy] as [ResourceBundle, LazyBundle];
}

type LazyBundle = {[dir: string]: Lazily};

/**
 * Utilize the PackageManager in order to collect all the resources
 * and bind them in a tar archive.
 */
class TarVolume implements PackageManager.Volume {
    pack: tar.Pack
    done: Promise<void>

    constructor() {
        this.pack = tar.pack();
    }

    withOutput(fn: string) {
        this.done = new Promise(resolve =>
            this.pack.pipe(fs.createWriteStream(fn), {end: true})
                .on('finish', () => resolve()));
        return this;
    }

    async close() {
        this.pack.finalize();
        await this.done;
    }

    mkdir(filename: string, options?: { recursive?: boolean; }): Promise<void> {
        return Promise.resolve();
    }
    writeFile(filename: string, content: string | Uint8Array): Promise<void> {
        return new Promise((resolve, reject) =>
            this.pack.entry({name: filename, type: 'file'}, Buffer.from(content),
            (err?) => err ? reject(err) : resolve()));
    }
    readFile(filename: string): Promise<ArrayBuffer>;
    readFile(filename: string, encoding: 'utf-8'): Promise<string>;
    readFile(filename: unknown, encoding?: unknown): Promise<ArrayBuffer> | Promise<string> {
        throw new Error('Method not implemented.');
    }
    readdir(filename: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    symlink(target: string, source: string): Promise<void> {
        return new Promise((resolve, reject) =>
            this.pack.entry({name: source, type: 'symlink', linkname: target},
            (err?) => err ? reject(err) : resolve()));
    }
}


main();