import { EmailUpdateError } from "@pcd/passport-interface";

export function getEmailUpdateErrorMessage(
  error: EmailUpdateError | string | undefined
): string {
  switch (error) {
    case EmailUpdateError.InvalidCredential:
      return "Your credentials are invalid. Please try logging in again.";
    case EmailUpdateError.InvalidConfirmationCode:
      return "The confirmation code you entered is incorrect. Please check and try again.";
    case EmailUpdateError.EmailAlreadyRegistered:
      return "This email is already registered to an account. Please use a different email.";
    case EmailUpdateError.CantDeleteOnlyEmail:
      return "You can't delete your only email address. Please add another email before deleting this one.";
    case EmailUpdateError.CantChangeWhenMultipleEmails:
      return "You can't change your email when you have multiple email addresses associated with your account. Please remove extra emails first.";
    case EmailUpdateError.EmailAlreadyAdded:
      return "This email is already added to your account.";
    case EmailUpdateError.EmailNotAssociatedWithThisAccount:
      return "This email is not associated with your account.";
    case EmailUpdateError.UserNotFound:
      return "User not found. Please ensure you're logged in correctly.";
    case EmailUpdateError.InvalidInput:
      return "The input you provided is invalid. Please check and try again.";
    case EmailUpdateError.TooManyEmails:
      return "You've reached the maximum number of emails allowed for an account.";
    case EmailUpdateError.CantChangeWrongOldEmail:
    case EmailUpdateError.Unknown:
    default:
      return "An unknown error occurred. Please try again later or contact support if the problem persists.";
  }
}
