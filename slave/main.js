const wol = require('wakeonlan');
const express = require('express');
const axios = require('axios');
const ms = require('ms');
const { MessagePriority, publish } = require('ntfy');
const { Client } = require('tplink-smarthome-api');
const { exec } = require('child_process');
const { version } = require('../package.json');
const Logger = require('../logger');

if (process.env.NODE_ENV === 'development') require('dotenv').config();

const {
    MASTER_ADDR,
    MASTER_MAC,
    CHECK_INTERVAL,
    SHUTDOWN_GRACE_PERIOD,
    REQUIRED_MOUNTS,
    DISCORD_WEBHOOK,
    SHUTDOWN_DRIVE_DURATION,
    PORT,
    PLUG_ADDRESS,
    MASTER_SSH_USER,
    SSH_KEY_PATH,
    NTFY_SERVER,
    NTFY_TOKEN,
    NTFY_TOPIC
} = process.env;

const tplink = new Client();
const logger = new Logger('DriveFailHandler-Slave');

const app = express();
app.get('/health', (_,res) => res.sendStatus(200));

const sleep = (time) => new Promise(resolve => setTimeout(resolve, ms(time)));

const main = async () => {
    logger.info('Checking drive presence...');

    try {
        const availableMounts = (await axios(`http://${MASTER_ADDR}:${PORT}/availablemounts`)).data.availableMounts;
        const requiredMounts = REQUIRED_MOUNTS.split(',').map(l => l.trim());

        
        if (!requiredMounts.every(mount => availableMounts.includes(mount))) {
            publish({
                server: NTFY_SERVER,
                priority: MessagePriority.MAX,
                topic: NTFY_TOPIC,
                authorization: `Bearer ${NTFY_TOKEN}`,
                tags: ['floppy_disk'],
                title: 'Drive Failure Detected',
                message: 'Detected one or more drives became unavailable. Performing full system & drive enclosure power cycle.'
            }).catch(logger.error);

            logger.info('Detected one or more drives became unavailable. Performing full system power cycle.');

            logger.info('Performing remote system shutdown');

            exec(`ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${MASTER_SSH_USER}@${MASTER_ADDR}`, (err, std, str) => {
                if (err) logger.error(err);
                if (str) logger.error(str);
            });

            logger.info(`System shutdown command sent. Sleeping for ${SHUTDOWN_GRACE_PERIOD}`);
            await sleep(SHUTDOWN_GRACE_PERIOD);

            logger.info('Performing drive enclosure power cycle.');

            const enclosurePlug = await tplink.getDevice({ host: PLUG_ADDRESS });
            await enclosurePlug.setPowerState(false);
            await sleep(SHUTDOWN_DRIVE_DURATION);
            await enclosurePlug.setPowerState(true);

            logger.info('Completed drive enclosure power cycle. Sending WOL packet.');
            await wol(MASTER_MAC, {
                count: 6,
                interval: 250
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

logger.info(`Starting slave application v${version}...`);
main();