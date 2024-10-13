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

export const getTruncateEmail = (
  emailString: string | undefined,
  maxLength: number
): string => {
  if (!emailString) return "Unknown Email";

  const emails = emailString.split("\n");
  return emails
    .map((email) => truncateEmail(email.trim(), maxLength))
    .join("\n");
};
