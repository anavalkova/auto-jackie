/** Monthly question limits for Jackie, counted server-side per Stockholm calendar month. */
export const GUEST_MONTHLY_QUESTIONS = 5;
export const USER_MONTHLY_QUESTIONS = 50;

export const quotaLimit = (signedIn: boolean) => (signedIn ? USER_MONTHLY_QUESTIONS : GUEST_MONTHLY_QUESTIONS);

/** Error codes the chat route returns when a limit is reached. */
export const QUOTA_ERROR = { guest: "quota_guest", user: "quota_user" } as const;
