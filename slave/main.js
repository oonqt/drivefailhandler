const wol = require('wakeonlan');
const express = require('express');
const axios = require('axios');
const ms = require('ms');
const { Client } = require('tplink-smarthome-api');
const { Webhook } = require('discord-webhook-node');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();


const {
    MASTER_MONITOR_ADDR,
    HEART_MAC,
    CHECK_INTERVAL,
    SHUTDOWN_GRACE_PERIOD,
    REQUIRED_MOUNTS,
    DISCORD_WEBHOOK,
    SHUTDOWN_DRIVE_DURATION,
    PORT,
    PLUG_ADDRESS
} = process.env;

const tplink = new Client();
const webhook = new Webhook(DISCORD_WEBHOOK);
const logger = new Logger('DriveFailHandler-Slave');

const app = express();
app.get('/health', (req,res) => res.sendStatus(200));

const sleep = (time) => new Promise(resolve => setTimeout(resolve, ms(time)));

const main = async () => {
    logger.info('Checking drive presence...');

    try {
        const availableMounts = (await axios(`${MASTER_MONITOR_ADDR}/availablemounts`)).data.availableMounts;
        const requiredMounts = REQUIRED_MOUNTS.split(',').map(l => l.trim());

        if (!requiredMounts.every(mount => availableMounts.includes(mount))) {
            webhook.send('@everyone Detected one or more drives became unavailable. Performing full system power cycle.').catch(logger.error);
            logger.info('Detected one or more drives became unavailable. Performing full system power cycle.');

            logger.info('Performing remote system shutdown');
            await axios.post(`${MASTER_MONITOR_ADDR}/shutdown`);
            logger.info(`System shutdown command sent. Sleeping for ${SHUTDOWN_GRACE_PERIOD}`);
            await sleep(SHUTDOWN_GRACE_PERIOD);

            logger.info('Performing drive enclosure power cycle.');

            const enclosurePlug = await tplink.getDevice({ host: PLUG_ADDRESS });
            await enclosurePlug.setPowerState(false);
            await sleep(SHUTDOWN_DRIVE_DURATION);
            await enclosurePlug.setPowerState(true);

            logger.info('Completed drive enclosure power cycle. Sending WOL packet.');
            await wol(HEART_MAC, {
                count: 6,
                interval: 250,
                address: "192.168.1.255"
            });
            logger.info('Sent WOL packet. System should be good to go now.');
        } else {
            logger.info('All expected mounts present, skipping!');
        }
    } catch (err) { 
        logger.error(err);
    }

    sleep(CHECK_INTERVAL).then(main);
}

app.listen(PORT, () => logger.info(`Healthcheck webserver up on port ${PORT}`));

logger.info('Starting slave application...');
main();