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

export interface Organisation {
  id: string;
  name: string;
  description?: string;
  publicKey: string;
  keyType: 'EC';
  subscription?: PaddleSubscription;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganisationWithRole extends Organisation {
  role: Role;
  encryptedKey?: string;
}

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
