import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger: Logger;
  private readonly redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(CacheService.name);

    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const isUpstash = redisHost.includes('upstash.io');

    this.redis = new Redis({
      host: redisHost,
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      // Enable TLS for Upstash
      tls: isUpstash ? {} : undefined,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis client error:', error);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready');
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.redis.get(key);

      if (value === null) {
        this.logger.debug(`Cache miss for key: ${key}`);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${key}`);
      return value;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, value);
      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, error);
    }
  }

  async onModuleDestroy() {
    await this.redis.quit();
    this.logger.log('Redis client disconnected');
  }
}
