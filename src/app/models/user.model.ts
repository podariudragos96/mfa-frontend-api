export interface User {
  id?: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  emailVerified?: boolean;
  phoneNumber?: string; 
}