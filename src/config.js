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
  development: true   /* OS.js developer tools */
};
