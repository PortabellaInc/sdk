import {Role} from '.';

export type PaddleSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'paused'
  | 'deleted';

export type PaddleSubscription = {
  id: string;
  subscriptionId: string;
  quantity: number;
  status: PaddleSubscriptionStatus;
  updateUrl: string;
  cancelUrl: string;

  createdAt: Date;
};

export type Organisation = {
  id: string;
  name: string;
  description?: string;
  publicKey: string;
  keyType: 'EC';
  subscription?: PaddleSubscription;
  role: Role;
  encryptedKey?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateOrganisation = {
  name: string;
  description?: string;
};

export type Employee = {
  id: string;
  userId: string;
  publicKey: string;
  email: string;
  name?: string;
  role: Role;
  encryptedKey?: string;
};

export const PendingMembershipName = 'Membership pending';
