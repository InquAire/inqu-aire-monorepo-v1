// Set minimum required environment variables BEFORE importing modules
process.env.DATABASE_URL ||= 'postgresql://user:password@localhost:5432/db';
process.env.JWT_SECRET ||= 'mock-jwt-secret-for-openapi-generation-32chars-minimum';
process.env.JWT_REFRESH_SECRET ||= 'mock-refresh-secret-for-openapi-generation-32chars-min';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { setupSwagger } from '../src/common/config/swagger.config';

async function generateOpenApiSpec() {

  const app = await NestFactory.create(AppModule, {
    logger: ['error'],
  });

  setupSwagger(app);

  console.log('✅ OpenAPI specification generated successfully!');
  console.log('📁 Location: docs/api/openapi.json');

  await app.close();
  process.exit(0);
}

generateOpenApiSpec();
