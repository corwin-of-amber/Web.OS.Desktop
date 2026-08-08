import { Application, Core, Window } from '@osjs/client';
import * as Vue from 'vue';
import { System } from 'wasi-kernel';

import { name as applicationName } from './metadata.json';

import { LeanWorkerProcess } from './transport';
import View, { IView } from './components/view.vue';


class LeanApplication extends Application {
    lworker: LeanWorkerProcess
    declare windows: LeanWindow[]

    static create(core: Core, args, options, metadata) {
        let proc = core.make<LeanApplication>('osjs/application', {args, options, metadata});
        Object.setPrototypeOf(proc, LeanApplication.prototype);

        proc.on('destroy-window', () => {
            if (!proc.windows.length) {
                proc.destroy();
            }
        });
        return proc as LeanApplication;
    }

    createWindow() {
        let win = super.createWindow({
            title: this.metadata.title.en_EN,
        });
        Object.setPrototypeOf(win, LeanWindow.prototype);
        win.render();
        win.on('toolbar-action', () => this.lworker.poke());
        return win;
    }

    start(wasik: System) {
        this.lworker = new LeanWorkerProcess(wasik);
        (async () => {
            await this.lworker.ready;
            for await (let msg of this.lworker.experiment()) {
                this.windows[0].view.push(msg);
            }
        })();
    }

    stop() {
        this.lworker.send({jsonrpc: '2.0', method: 'exit'});
    }

    destroy(remove?: boolean): void {
        this.stop();
        super.destroy(remove);
    }
}

class LeanWindow extends Window {

    static readonly DEFAULT_SZ = {width: 360, height: 480};
    view: IView

    get rootProps() {
        return {
            onToolbarAction: (ev: {type: string}) => this.onToolbarAction(ev)
        };
    }

    render() {
        this.setDimension(LeanWindow.DEFAULT_SZ);
        this.view = <any>Vue.createApp(View, this.rootProps).mount(this.$content);
        return super.render();
    }

    onToolbarAction(ev: {type: string}) {
        this.emit('toolbar-action', ev);
    }
}

OSjs.register(applicationName, (core: Core, args, options, metadata) => {

    let app = LeanApplication.create(core, args, options, metadata);

    setTimeout(() => {
        app.createWindow();
        app.start(OSjs.make("wasik").sys);
    }, 1);

    Object.assign(window, {lean: app});

    return app;
});


export { LeanApplication, LeanWindow, LeanWorkerProcess }