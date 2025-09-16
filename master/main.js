const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const logger = new Logger('DriveFailHandler-Master');
const app = express();

const {
    PORT,
    MOUNT_DIR,
    ALLOWED_ORIGIN_IP,
    SSH_KEY_PATH,
    SSH_SERVER_STRING
} = process.env;

app.use((req, res, next) => {
    if (!req.ip.includes(ALLOWED_ORIGIN_IP)) return res.sendStatus(401);

    next();
});

app.get('/availablemounts', (req, res) => {
    const mounts = fs.readdirSync(MOUNT_DIR);
    const availableMounts = [];

    mounts.forEach(mount => {
        const absPath = path.join(MOUNT_DIR, mount);

        if (fs.existsSync(path.join(absPath, '.drivemonitor', 'readtest'))) {
            availableMounts.push(absPath);
        }
    });

    res.json({ availableMounts });
});

app.post('/shutdown', (req, res) => {
    logger.info(`Shutting down host requested by ${req.ip}`);

    exec(`ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${SSH_SERVER_STRING}`, (err, std, str) => {
        console.log(err);
        console.log(std);
        console.log(str);
    });
});

app.listen(PORT, () => logger.info(`Listening on ${PORT}`));