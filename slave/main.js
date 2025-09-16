const wol = require('wakeonlan');
const axios = require('axios');
const ms = require('ms');
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
    SHUTDOWN_DRIVE_DURATION
} = process.env;

const logger = new Logger('DriveFailHandler-Slave');
const webhook = new Webhook(DISCORD_WEBHOOK);

const sleep = (time) => new Promise(resolve => setTimeout(resolve, ms(time)));

const main = async () => {
    logger.info('Checking drive presence...');

    try {
        const availableMounts = (await axios(`${MASTER_MONITOR_ADDR}/availablemounts`)).data.availableMounts;
        const requiredMounts = REQUIRED_MOUNTS.split(',').map(l => l.trim());

        if (!requiredMounts.every(mount => availableMounts.includes(mount))) {
            webhook.send('Detected one or more drives became unavailable. Performing full system power cycle.').catch(logger.error);
            logger.info('Detected one or more drives became unavailable. Performing full system power cycle.');

            logger.info('Performing remote system shutdown');
            // await axios.post(`${MASTER_MONITOR_ADDR}/shutdown`);
            logger.info(`System shutdown request sent. Sleeping for ${SHUTDOWN_GRACE_PERIOD}`);
            await sleep(SHUTDOWN_GRACE_PERIOD);

            // trigger smart plug

            await sleep(SHUTDOWN_DRIVE_DURATION);

            logger.info('Performed drive bay power cycle. Sending WOL packet.');
            await wol(HEART_MAC, {
                count: 6,
                internal: 250
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

logger.info('Starting slave application...');

main();