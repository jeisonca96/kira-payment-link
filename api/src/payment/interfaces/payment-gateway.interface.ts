export interface PspChargeRequest {
  token: string;
  amountInCents: number;
  currency: string;
  customerEmail: string;
  description?: string;
  idempotencyKey?: string;
}

export interface PspChargeResponse {
  success: boolean;
  reference: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'DECLINED';
  rawResponse?: Record<string, any>;
  errorMessage?: string;
}

export interface IPaymentGateway {
  charge(request: PspChargeRequest): Promise<PspChargeResponse>;
  getName(): string;
}
