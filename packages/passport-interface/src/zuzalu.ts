export interface ZuParticipant {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Participant metadata */
  name: string;
  email: string;
  role: string;
  residence: string;
}

export enum UserStatus {
  REGULAR,
  UNVERIFIED,
}

export interface BackendUser {
  identifier: string;
  status: number;
  createdAt: Date;
  encryptedBlob: string;
  updatedAt: Date;
}

export interface ClientUser extends BackendUser {
  masterKey: string;
  serverPassword: string;
}
