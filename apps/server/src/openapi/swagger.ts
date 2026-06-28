import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupOpenApi(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('PathMind API')
    .setDescription('Goal-driven AI Learning Coach API')
    .setVersion('0.2.1')
    .addTag('goals', 'Persisted learning goals and progress')
    .addTag('learning-path', 'AI learning path generation')
    .addTag('chat', 'AI teaching chat sessions')
    .addTag('workflow', 'Stateful agent workflow sessions')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: '/api/openapi.json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.getHttpAdapter().get('/api/openapi.json', (_req, res) => {
    res.json(document);
  });
}
