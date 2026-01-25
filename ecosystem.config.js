{
  "apps": [
    {
      "name": "projeto-sass-api",
      "script": "backend/server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      },
      "env_development": {
        "NODE_ENV": "development"
      },
      "error_file": "logs/error.log",
      "out_file": "logs/out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "merge_logs": true,
      "autorestart": true,
      "watch": false,
      "ignore_watch": [
        "node_modules",
        "logs",
        "backend/data"
      ],
      "max_memory_restart": "1G",
      "listen_timeout": 10000,
      "kill_timeout": 5000,
      "wait_ready": true,
      "max_restarts": 10,
      "min_uptime": "10s",
      "restart_delay": 4000,
      "shutdown_with_message": true,
      "time_limit": 600000,
      "cron_restart": "0 2 * * *",
      "interpreter_args": "--max-old-space-size=512"
    },
    {
      "name": "projeto-sass-sync",
      "script": "backend/jobs/sync.js",
      "instances": 1,
      "exec_mode": "fork",
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "logs/sync-error.log",
      "out_file": "logs/sync-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "10s"
    },
    {
      "name": "projeto-sass-webhooks",
      "script": "backend/jobs/webhooks.js",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      },
      "error_file": "logs/webhooks-error.log",
      "out_file": "logs/webhooks-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "10s",
      "max_memory_restart": "512M"
    }
  ],
  "deploy": {
    "production": {
      "user": "deploy",
      "host": "your-production-server.com",
      "ref": "origin/main",
      "repo": "git@github.com:your-username/projeto-sass.git",
      "path": "/var/www/projeto-sass",
      "post-deploy": "npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env production"
    },
    "staging": {
      "user": "deploy",
      "host": "your-staging-server.com",
      "ref": "origin/develop",
      "repo": "git@github.com:your-username/projeto-sass.git",
      "path": "/var/www/projeto-sass-staging",
      "post-deploy": "npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env staging"
    }
  }
}
