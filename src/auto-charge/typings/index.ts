import { JobOptions } from 'bull';

export enum AutoChargeQueue {
  WriteChargesToQueue = 'write-charges-to-queue',
  Charge = 'charge',
  ChargeDLQ = 'charge-dlq',
}

export interface WriteChargesToQueueData {
  month: number;
  year: number;
}

export interface ChargeQueueData extends WriteChargesToQueueData {
  contractId: string;
  effectiveLoanAmount: number;
  salary: number;
  salaryPercentageOwed: number;
}

export type AddBulkPayload<T> = {
  name?: string;
  data: T;
  opts?: JobOptions;
}[];
