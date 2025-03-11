const path = require("path");

module.exports = {
  apps: [
    {
      name: "agenda-cron",
      script: "./bin/www",
      max_memory_restart: "1G",
      watch: true,
      ignore_watch: ["./node_modules", "./logs"],
      error_file: path.resolve(__dirname, "./logs/pm2-err.log"),
      out_file: path.resolve(__dirname, "./logs/pm2-out.log"),
      log_file: path.resolve(__dirname, "./logs/pm2-combined.log"),
      time: true,
    },
  ],
};
