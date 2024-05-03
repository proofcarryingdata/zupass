export function getTimeBeforeExpiry(expiry: Date) {
  const minutes = Math.ceil((new Date(expiry).getTime() - Date.now()) / 60000);
  const hours = Math.ceil(minutes / 60);
  const days = Math.ceil(minutes / (24 * 60));

  if (days > 1) {
    return "Expires in <" + days + " days";
  } else if (hours > 1) {
    return "Expires in <" + hours + " hours";
  } else if (minutes > 1) {
    return "Expires in <" + minutes + " minutes";
  } else {
    return "Expires in <1 minute";
  }
}
