module.exports = {
    /**
     * Application configuration section
     * http://pm2.keymetrics.io/docs/usage/application-declaration/
     */
    apps: [
        // First application
      {
      name: 'lanzTalk',
      script: 'index.js',
      output: '/dev/null',
      error: './error.log',
      env: {
        NODE_ENV: "development", //启动默认模式
      },
      env_production: {
        NODE_ENV: "production", //使用production模式 pm2 start ecosystem.config.js --env production
      },
      }
    ],
    /**
     * Deployment section
     * http://pm2.keymetrics.io/docs/usage/deployment/
     */
    deploy: {
      prod: {
        user: 'root',
        host: '81.68.141.216',
        ref: 'origin/master',
        repo: 'git://github.com/lanz0519/lanzTalkBackend',
        path: '/root/lanzTalk',
        'post-deploy': 'git pull && npm install && pm2 startOrReload ecosystem.config.js --env production'
      }
    }
};
