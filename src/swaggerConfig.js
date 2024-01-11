import swaggerUi from 'swagger-ui-express';
import outputFile from './swagger-output.json' assert { type: "json" };

export default function swaggerDocs(app, PORT) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(outputFile));
    console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
}
