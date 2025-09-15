const express = require('express');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const logger = new Logger('DriveFailHandler');
const app = express();

const {
    REQUIRED_MOUNTS,
    PORT
} = process.env;

const mounts = REQUIRED_MOUNTS.split(',').map(m => m.trim());

app.get('/mounts', (req, res) => {
    res.json({ mounts });
});

app.listen(PORT, () => logger.info(`Listening on ${[PORT]}`));