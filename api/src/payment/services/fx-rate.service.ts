import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';

@Injectable()
export class FxRateService {
  private readonly logger: Logger;
  private readonly cacheKey = 'fx:usd:mxn';
  private readonly cacheTTL = 300; // 5 minutes in seconds
  private readonly baseFxRate = 20.0; // Base rate: 1 USD = 20 MXN
  private readonly variationPercent = 0.02; // ±2% variation

  constructor(
    private readonly cacheService: CacheService,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(FxRateService.name);
  }

  /**
   * Get current USD to MXN exchange rate
   * First checks cache, if miss then fetches from simulated provider
   */
  async getUsdToMxnRate(): Promise<number> {
    this.logger.debug('Fetching USD/MXN exchange rate');

    const cachedRate = await this.cacheService.get(this.cacheKey);
    if (cachedRate) {
      const rate = parseFloat(cachedRate);
      this.logger.debug(`Retrieved rate from cache: ${rate}`);
      return rate;
    }

    this.logger.debug('Cache miss - fetching rate from simulated FX provider');
    const rate = await this.fetchFromProvider();

    await this.cacheService.set(this.cacheKey, rate.toString(), this.cacheTTL);
    this.logger.log(
      `Fetched new FX rate: ${rate}, cached for ${this.cacheTTL}s`,
    );

    return rate;
  }

  private async fetchFromProvider(): Promise<number> {
    await this.sleep(50 + Math.random() * 100); // Simulate network latency

    const variation = (Math.random() - 0.5) * 2 * this.variationPercent;
    const rate = this.baseFxRate * (1 + variation);

    const roundedRate = Math.round(rate * 10000) / 10000;

    this.logger.debug(
      `Simulated FX API call: base=${this.baseFxRate}, variation=${(variation * 100).toFixed(2)}%, rate=${roundedRate}`,
    );

    return roundedRate;
  }

  async clearCache(): Promise<void> {
    await this.cacheService.del(this.cacheKey);
    this.logger.log('FX rate cache cleared');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
