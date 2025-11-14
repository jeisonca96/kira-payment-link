import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FeeProfile,
  FeeProfileDocument,
  IncentiveType,
} from '../schemas/fee-profile.schema';
import { CustomLoggerService } from '../../core-services/logger/custom-logger.service';

@Injectable()
export class FeeProfileService {
  private readonly logger: Logger;
  private readonly defaultProfileId = 'DEFAULT_USD_MXN';

  constructor(
    @InjectModel(FeeProfile.name)
    private readonly feeProfileModel: Model<FeeProfileDocument>,
    private readonly customLoggerService: CustomLoggerService,
  ) {
    this.logger = this.customLoggerService.createLogger(FeeProfileService.name);
  }

  async getFeeProfile(
    profileId: string = this.defaultProfileId,
  ): Promise<FeeProfile> {
    this.logger.debug(`Fetching fee profile: ${profileId}`);

    let profile = await this.feeProfileModel.findOne({ profileId }).exec();

    if (!profile && profileId !== this.defaultProfileId) {
      this.logger.warn(
        `Profile ${profileId} not found, falling back to default`,
      );
      profile = await this.feeProfileModel
        .findOne({ profileId: this.defaultProfileId })
        .exec();
    }

    return profile;
  }

  isEligibleForIncentive(profile: FeeProfile, txCount: number): boolean {
    const firstNIncentive = profile.incentives?.find(
      (i) => i.type === IncentiveType.FIRST_N_TRANSACTIONS,
    );

    if (!firstNIncentive) {
      return false;
    }

    const n = firstNIncentive.config.n || 0;
    const isEligible = txCount < n;

    if (isEligible) {
      this.logger.debug(
        `Customer eligible for "First ${n} Free" incentive (txCount: ${txCount})`,
      );
    }

    return isEligible;
  }

  getIncentiveDiscount(profile: FeeProfile): number {
    const firstNIncentive = profile.incentives?.find(
      (i) => i.type === IncentiveType.FIRST_N_TRANSACTIONS,
    );

    return firstNIncentive?.config.discountPercentage || 0;
  }
}
