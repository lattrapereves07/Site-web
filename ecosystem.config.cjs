module.exports = {
  apps: [
    {
      name: 'attrape-reves',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=lattrapereves-db --local --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 3,
      restart_delay: 5000,
      autorestart: true
    }
  ]
}
