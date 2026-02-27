/**
 * Abstract Email Reputation / Validation API integration.
 * Docs: https://www.abstractapi.com/email-verification-validation-api
 */

const ABSTRACT_EMAIL_URL = 'https://emailvalidation.abstractapi.com/v1';

export async function fetchEmailReputation(email) {
  const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;
  if (!apiKey) {
    throw new Error('Email reputation API not configured');
  }

  const url = `${ABSTRACT_EMAIL_URL}/?api_key=${apiKey}&email=${encodeURIComponent(
    email.toLowerCase().trim()
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Abstract API error: ${res.status}`);
  }
  const data = await res.json();

  // Return a trimmed-down version that frontend can use
  return {
    email: data.email,
    deliverability: data.deliverability,
    quality_score: typeof data.quality_score === 'string' ? parseFloat(data.quality_score) : data.quality_score,
    is_free_email: data.is_free_email?.value ?? null,
    is_disposable_email: data.is_disposable_email?.value ?? null,
    is_catchall_email: data.is_catchall_email?.value ?? null,
    is_role_email: data.is_role_email?.value ?? null,
    is_mx_found: data.is_mx_found?.value ?? null,
    is_smtp_valid: data.is_smtp_valid?.value ?? null,
  };
}

