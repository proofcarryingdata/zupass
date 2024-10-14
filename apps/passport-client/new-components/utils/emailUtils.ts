/**
 * Truncates a single email address while preserving the domain.
 * If the email is longer than maxLength, it truncates the local part and adds '...'.
 */
export const truncateEmail = (email: string, maxLength: number): string => {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1 || email.length <= maxLength) {
    return email;
  }

  const domain = email.slice(atIndex);
  const localPart = email.slice(0, atIndex);
  const availableLength = maxLength - domain.length - 3;

  if (availableLength < 1) {
    return email;
  }

  return `${localPart.slice(0, availableLength)}...${domain}`;
};
