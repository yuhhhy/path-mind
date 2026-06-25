import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupOpenApi } from './openapi/swagger.js';

const app = await NestFactory.create(AppModule);

app.setGlobalPrefix('api', {
  exclude: ['health'],
});

app.enableCors({
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
});

setupOpenApi(app);

await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
