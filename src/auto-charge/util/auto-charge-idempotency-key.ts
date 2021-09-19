import { PaymentType } from 'src/models/payment.model';
import { ChargeQueueData } from '../typings';

export const autoChargeIdempotencyKey = ({
  contractId,
  month,
  year,
}: ChargeQueueData) => `${contractId}-${month}/${year}-${PaymentType.Auto}`;
