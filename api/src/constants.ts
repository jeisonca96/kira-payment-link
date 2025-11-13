export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum ApiTagsEnum {
  Merchant = 'merchant',
}

export const ApiDescriptions: Record<ApiTagsEnum, string> = {
  [ApiTagsEnum.Merchant]:
    'Endpoints for merchants to create and manage payment links',
};
