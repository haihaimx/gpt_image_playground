module.exports = {
  apps: [{
    name: 'gpt-image-playground-server',
    script: 'dist/index.js',
    cwd: '/vol1/@apphome/trim.openclaw/data/workspace/gpt_image_playground/server',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    max_restarts: 10,
    restart_delay: 3000,
    watch: false,
    max_memory_restart: '500M',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    time: true,
  }]
}
