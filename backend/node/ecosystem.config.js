module.exports = {
  apps: [{
    name: "wwf-survey-bot",
    script: "./server.js",
    watch: false, // Set to true if you want automatic reloading on file changes
    instances: 1,
    autorestart: true,
    max_memory_restart: "300M",
    env: {
      NODE_ENV: "production",
      PORT: 8080
    }
  }],

  deploy : {
    production : {
      user : 'SSH_USERNAME',
      host : 'SSH_HOSTMACHINE',
      ref  : 'origin/master',
      repo : 'GIT_REPOSITORY',
      path : 'DESTINATION_PATH',
      'pre-deploy-local': '',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
