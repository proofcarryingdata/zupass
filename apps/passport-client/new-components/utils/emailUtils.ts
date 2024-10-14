import { FontFamily, FontSize } from "./../shared/Typography";

// Helper function to create the font string
function createFontString(fontSize: FontSize, fontFamily: FontFamily): string {
  return `${fontSize}px ${fontFamily}`;
}
export function getTextWidth(text: string, font: string): number {
  // re-use canvas object for better performance
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to get 2D context from canvas");
  }
  context.font = font;
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
