import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  INestApplication,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';
import { SwaggerModule } from '@nestjs/swagger';
import { BuildApiDocs } from './apidocs';
import { Handler, Context, Callback } from 'aws-lambda';
const serverlessExpress = require('@codegenie/serverless-express');
import { json } from 'express';
const express = require('express');
import helmet from 'helmet';
import { Environment } from './constants';

let cachedServer: Handler;

async function bootstrapServer(): Promise<Handler> {
  if (!cachedServer) {
    const logger = new Logger('Lambda');
    logger.log('Initializing Lambda application...');

    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
      bufferLogs: false, // Disable buffering for immediate CloudWatch logging
    });

    const appConfig = app.get(AppConfig);
    const limit = appConfig.bodyLimit;

    // Configure app for Lambda
    configureApp(app, appConfig, limit);

    await app.init();

    logger.log('Lambda application initialized successfully');
    const server = serverlessExpress({ app: expressApp });
    cachedServer = server;
  }

  return cachedServer;
}

function configureApp(
  app: INestApplication,
  appConfig: AppConfig,
  limit: string,
): void {
  const logger = new Logger('LambdaConfig');

  // Enhanced validation and sanitization
  logger.log('Configuring global validation pipes...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: appConfig.isProduction,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Security middleware - adjusted for Lambda
  if (process.env.NODE_ENV === Environment.Production) {
    logger.log('Configuring security middleware...');
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );
  }

  // CORS configuration
  app.enableCors({
    origin: appConfig.corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, X-Requested-With',
    credentials: true,
  });

  logger.log('Setting custom limit for JSON body parser', { limit });
  app.use(json({ limit }));

  // Swagger documentation - disabled in Lambda to reduce package size and cold start
  if (process.env.ENABLE_SWAGGER === 'true') {
    logger.log('Enabling Swagger documentation...');
    const { config, route } = BuildApiDocs(appConfig.baseUrl);
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(route, app, document);
  } else {
    logger.log('Swagger documentation disabled in Lambda');
  }
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  const logger = new Logger('LambdaHandler');

  // AWS Lambda context reuse optimization
  context.callbackWaitsForEmptyEventLoop = false;

  // Log incoming request
  logger.log(
    `Incoming request: ${event.requestContext?.http?.method || event.httpMethod} ${event.requestContext?.http?.path || event.path}`,
  );
  logger.debug(`Request ID: ${context.awsRequestId}`);

  const server = await bootstrapServer();
  const response = await server(event, context, callback);

  logger.log(`Response status: ${response?.statusCode || 'unknown'}`);

  return response;
};
