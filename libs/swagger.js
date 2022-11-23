const swaggerUi = require('swagger-ui-express');
const swaggereJsdoc = require('swagger-jsdoc');
const packageJson = require('../package.json')
const config = require('../config');

const options = {
    definition: {
        info: {
            title: 'Plxyer Sample API Server',
            version: packageJson.version,
            description: 'Plxyer Game Solana Rest API.<br>Check API Error Messages ' + config.swagger.host + '/docs/error <br><br> contact : ceo@plxyer.com', 
            contact : { name: 'Soboon',
                        email : "ceo@plxyer.com" 
            },
        },
        host: config.swagger.host,
        /*
        securityDefinitions: {
            BasicAuth: {
                type: 'Bearer',
                name: 'Authorization',
                in: 'header'
            },
        },
        */
        basePath: '',
        
    },
    schemes: ["http", "https"], 
    apis: ['./apis/*.js']
};

const specs = swaggereJsdoc(options);
const express = require('express');
const router = express.Router().use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
module.exports = router;
