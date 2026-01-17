import {CoreServiceProvider} from '@osjs/client'

declare global {

    /**
     * From global api
     */
    var OSjs: ReturnType<CoreServiceProvider['createGlobalApi']>;

}