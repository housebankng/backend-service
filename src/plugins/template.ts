import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';

dotenv.config();

type TemplateFuncType = any;

class TemplateFunc {}

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        templateName: TemplateFuncType;
    }
}

const TemplatePlugin: Hapi.Plugin<null> = {
    name: 'templateName',
    register: async (server: Hapi.Server) => {
        server.app.templateName = new TemplateFunc();
        console.log("['info'] Log a meaningful message here");
        server.ext({
            type: 'onPostStop',
            method: async (server: Hapi.Server) => {
                //Do some function here
                console.log("['info'] Log a meaningful message here");
            },
        });
    },
};

export default TemplatePlugin;
