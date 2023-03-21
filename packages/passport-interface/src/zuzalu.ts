export interface ZuParticipant {
  /** Public UUID */
  uuid: string;

  /** Semaphore public commitment */
  commitment: string;

  /** Participant metadata */
  email: string;
  name: string;
  role: string;
  residence: string;
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
