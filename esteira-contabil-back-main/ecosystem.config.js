module.exports = {
    apps: [
      {
        name: "logger",
        script: "./app.ts",
        watch: true,
        max_restarts: 10,
        env: {
          NODE_ENV: "development",
        },
        env_production: {
          NODE_ENV: "production",
        },
      },
    ],
  };
  