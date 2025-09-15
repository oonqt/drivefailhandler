const express = require('express');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const logger = new Logger('DriveFailHandler');
const fs = require('fs');
const path = require('path');
const app = express();

const {
    PORT,
    MOUNT_DIR
} = process.env;


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

app.listen(PORT, () => logger.info(`Listening on ${PORT}`));