'use strict';

import Hapi, { Server } from '@hapi/hapi';
import * as dotenv from 'dotenv';
import prismaPlugin from './plugins/prisma';

dotenv.config();

let server: Server;

const init = async () => {
    server = Hapi.server({
        port: process.env.PORT || 50000,
        host: '0.0.0.0',
    });

    await server.register(require('@hapi/inert'));
    //custom plugins
    await server.register([prismaPlugin]);

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true,
            },
        },
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
