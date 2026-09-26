/**
 * PM2 process file for Hostinger (CloudLinux alt-nodejs).
 * Load secrets via ~/apps/vidoo-ai/.env before start — never commit secrets.
 *
 *   source /opt/alt/alt-nodejs22/enable
 *   cd ~/apps/vidoo-ai && set -a && source .env && set +a
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "vidoo-worker",
      cwd: __dirname,
      script: "npm",
      args: "run worker:start",
      instances: 1,
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      restart_delay: 5000,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "logs/worker-error.log",
      out_file: "logs/worker-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
