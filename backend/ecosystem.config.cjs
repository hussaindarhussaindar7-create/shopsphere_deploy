// PM2 process definition. Start with: pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'shopsphere-api',
      script: 'src/server.js',
      cwd: __dirname,              // so dotenv finds backend/.env
      instances: 1,                // 2-core VPS: keep 1 (fork). Use 2 + exec_mode 'cluster' for more throughput
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '400M',  // auto restart on memory leak
      kill_timeout: 8000,          // time for graceful shutdown
      time: true,
      env_production: { NODE_ENV: 'production' }
    }
  ]
};
