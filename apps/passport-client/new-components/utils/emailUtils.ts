import { FontFamily, FontSize } from "./../shared/Typography";

/**
 * Measures the width of the given text using the specified font size and font family.
 */
export function getTextWidth(
  text: string,
  fontSize: FontSize,
  fontFamily: FontFamily
): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    return -1;
  }
  context.font = `${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  return metrics.width;
}

/**
 * Truncates a single email address while preserving the domain.
 * If the email is longer than the container width, it truncates the local part and adds '...'.
 */
export function truncateEmail(
  email: string,
  containerWidth: number,
  fontSize: FontSize,
  fontFamily: FontFamily,
  padding: number
): string {
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return email;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const ellipsis = "...";
  const font = createFontString(fontSize, fontFamily);
  const fullWidth = getTextWidth(email, font);
  if (fullWidth <= containerWidth - padding) {
    return email;
  }

  let truncatedLocalPart = localPart;
  while (
    getTextWidth(`${truncatedLocalPart}${ellipsis}${domain}`, font) >
      containerWidth - padding &&
    truncatedLocalPart.length > 0
  ) {
    truncatedLocalPart = truncatedLocalPart.slice(0, -1);
  }

  return `${truncatedLocalPart}${ellipsis}${domain}`;
}
