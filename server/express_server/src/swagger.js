import { API_VERSION } from './config.js';
import swaggerAutogen from 'swagger-autogen';


const doc = {
    info: {
        title: 'XCP API Docs',
        version: API_VERSION,
        description: 'OpenAPI 3.0.0 documentation for the XCP API',
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server',
        }
    ],
}

const outputFile = './swagger-output.json';
const routes = ['./index.js'];
swaggerAutogen({openapi: '3.0.0'})(outputFile, routes, doc);


