export class TGError extends Error {
  public name = "TGError";
  public solutions: string[] = [];
}

export class RateLimitError extends TGError {
  public override name = "Daily post limit exceeded for this topic";
  public override solutions = [
    "Try posting in a different topic",
    "Contact support at passport@0xparc.org"
  ];
  public constructor(maxPosts: number) {
    super(
      `You have exceeded the daily limit of ${maxPosts} messages for this topic. Please wait 24 hours and try again.`
    );
  }
}

export class NotFoundError extends TGError {
  public override name = "Missing data";
  public override solutions = [
    "Try posting in a different topic",
    "Contact support at"
  ];
  public constructor() {
    super(`The message you are trying to post is invalid. Please try again.`);
  }
}

export class PermissionDeniedError extends TGError {
  public override name = "Permission denied";
  public override solutions = [
    "Try posting in a different topic",
    "Contact support at"
  ];
  public constructor() {
    super(`The message you are trying to post is invalid. Please try again.`);
  }
}

export class FailedPreconditionError extends TGError {
  public override name = "Failed precondition";
  public override solutions = [
    "Try posting in a different topic",
    "Contact support at"
  ];
  public constructor() {
    super(`The message you are trying to post is invalid. Please try again.`);
  }
}

/*
Avoid swallowing the root cause
API implementations should not swallow the root cause of issues occurring in the back end. For example, many different situations can cause a "Server error" problem, including:

service failure
network connection drop
mismatching status
permission issues
"Server error" is too general an error message to help users understand
 and fix the problem. 
 If the server logs contain identification information about the 
 in-session user and operation, 
 we recommend providing additional context on the particular failure case.


 “throw an exception if and only if 
 nothing could be done and current work should be aborted entirely”

Exceptions or error codes should be treated similarly to 
custom class loaders or memory allocators. 
Or custom collection type. 
You won’t create CustomerArrayList 
so don’t create CustomerNotFoundException. 
Errors are part of the infrastructure, 
not business logic.

A good rule of thumb is to only insist on
handling exceptions when you are interacting 
directly with the end-user.
*/
