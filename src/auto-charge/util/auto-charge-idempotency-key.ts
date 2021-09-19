import { PaymentStatus, PaymentType } from 'src/models/payment.model';
import { ChargeQueueData } from '../typings';

export const autoChargeIdempotencyKey = (
  { contractId, month, year }: ChargeQueueData,
  status: PaymentStatus,
) => `${contractId}-${month}/${year}-${PaymentType.Auto}-${status}`;
