/**
 * Trial & subscription logic.
 * - 3-day free trial for new users
 * - magboyin14@gmail.com exempt: indefinite premium access
 */

const TRIAL_DAYS = 3;
const EXEMPT_EMAIL = 'magboyin14@gmail.com';

export function isExemptEmail(email) {
  return email?.toLowerCase() === EXEMPT_EMAIL.toLowerCase();
}

export function getTrialEndDate(createdAt) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export function isTrialActive(trialEndsAt) {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt) > new Date();
}

export function hasPremiumAccess(user, subscription) {
  if (!user || !subscription) return false;

  const email = user.email?.toLowerCase();
  if (isExemptEmail(email)) return true;

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    if (subscription.status === 'trialing') {
      return isTrialActive(subscription.trial_ends_at);
    }
    return true;
  }
  return false;
}
