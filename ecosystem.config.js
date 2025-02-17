module.exports = {
  apps: [
    {
      name: "agenda-cron",
      script: "./bin/www",
      max_memory_restart: "1G",
    },
  ],
};
