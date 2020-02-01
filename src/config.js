export default {
  auth: {
    login: {
      username: 'demo',
      password: 'demo'
    }
  },
  standalone: true,
  packages: {
    manifest: false,
    metadata: require('./metadata.json')
  },
  vfs: {
    mountpoints: [{
      name: 'wasi',
      label: 'WASI',
      adapter: 'wasi',
      attributes: {}
    }]
  },
  development: true   /* OS.js developer tools */
};
