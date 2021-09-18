export enum AutoPaymentQueue {
  Charge = 'charge',
}

export interface ChargeQueueData {
  contractId: string;
  effectiveLoanAmount: number;
  salary: number;
  salaryPercentageOwed: number;
  failures: number;
  test?: boolean;
}
