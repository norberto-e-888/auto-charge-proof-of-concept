export enum AutoPaymentQueue {
  Charge = 'charge',
}

export interface ChargeQueueData {
  contractId: string;
  effectiveLoanAmount: number;
  salary: number;
  salaryPercentageOwed: number;
  test?: boolean;
}
