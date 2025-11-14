export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum ApiTagsEnum {
  Merchant = 'merchant',
  Checkout = 'checkout',
  Webhooks = 'webhooks',
}

export const ApiDescriptions: Record<ApiTagsEnum, string> = {
  [ApiTagsEnum.Merchant]:
    'Endpoints for merchants to create and manage payment links',
  [ApiTagsEnum.Checkout]:
    'Endpoints for payers to get quotes and process payments',
  [ApiTagsEnum.Webhooks]:
    'Endpoints for PSP webhooks to update transaction status',
};
