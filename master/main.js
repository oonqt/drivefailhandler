const express = require('express');
const fs = require('fs');
const path = require('path');
const Logger = require('../logger');
const { version } = require('../package.json');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const logger = new Logger('DriveFailHandler-Master');
const app = express();

const {
    PORT,
    MOUNT_DIR,
} = process.env;

app.get('/health', (req, res) => res.sendStatus(200));

app.get('/availablemounts', (req, res) => {
    const mounts = fs.readdirSync(MOUNT_DIR);
    const availableMounts = [];

    mounts.forEach(mount => {
        const absPath = path.join(MOUNT_DIR, mount);

        if (fs.existsSync(path.join(absPath, 'readtest'))) {
            availableMounts.push(absPath);
        }
    });

    res.json({ availableMounts });
});

app.listen(PORT, () => logger.info(`Master application (v${version}) listening on ${PORT}`));