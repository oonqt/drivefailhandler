const express = require('express');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const logger = new Logger('DriveFailHandler');
const fs = require('fs');
const app = express();

const {
    PORT,
    MOUNT_PATH
} = process.env;


app.get('/mounts', (req, res) => {
    const data = fs.readFileSync('/proc/mounts', 'utf8');
    const mounts = [];

    data.split('\n').forEach(line => {
        line = line.split(' ');

        // filter only physical devices
        if (line[0].startsWith('/dev')) mounts.push(line[1]);
    });


    logger.info(data);
    res.json({ mounts });
});

app.listen(PORT, () => logger.info(`Listening on ${PORT}`));