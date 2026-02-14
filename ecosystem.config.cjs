module.exports = {
  apps: [
    {
      name: 'attrape-reves',
      script: 'node_modules/.bin/serve',
      args: '-l 3000 -s .',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
