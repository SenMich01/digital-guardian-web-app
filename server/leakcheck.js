/**
 * LeakCheck API integration for breach lookup.
 * Free tier: https://leakcheck.io
 * Requires LEAKCHECK_API_KEY env var.
 */

const LEAKCHECK_BASE = 'https://leakcheck.io/api/v2';

export async function fetchBreachesForAccount(email) {
  const apiKey = process.env.LEAKCHECK_API_KEY;

  if (!apiKey || apiKey.length < 40) {
    return getDemoBreaches(email);
  }

  const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
  const url = `${LEAKCHECK_BASE}/query/${encodedEmail}?type=email&limit=100`;

  const res = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'User-Agent': 'DigitalGuardian/1.0',
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!data.success) {
    return [];
  }

  const result = data.result;
  if (!Array.isArray(result) || result.length === 0) return [];

  return result.map((item) => {
    const src = item.source || item;
    const name = src.name || item.name || 'Unknown';
    return {
      Name: name,
      Title: name,
      Domain: src.domain || item.domain || 'unknown',
      BreachDate: item.date || src.date || 'unknown',
      Description: src.description || item.description || 'Breach detected.',
      DataClasses: Array.isArray(item.fields) ? item.fields : ['Email addresses'],
      IsVerified: true,
      PwnCount: item.count || item.pwn_count || 0,
    };
  });
}

export function mapBreachToExposure(breach, email) {
  const pwnCount = breach.PwnCount || 0;
  let severity = 'low';
  if (pwnCount > 100000000) severity = 'high';
  else if (pwnCount > 1000000) severity = 'medium';

  return {
    breach_name: breach.Name,
    breach_domain: breach.Domain || 'unknown',
    breach_date: breach.BreachDate || 'unknown',
    breach_description: breach.Description || '',
    data_classes: Array.isArray(breach.DataClasses) ? breach.DataClasses.join(', ') : '',
    severity,
    source: breach.Title || breach.Name
  };
}

function getDemoBreaches(email) {
  return [
    {
      Name: 'Adobe',
      Title: 'Adobe',
      Domain: 'adobe.com',
      BreachDate: '2013-10-04',
      Description: 'In October 2013, 153 million Adobe accounts were breached.',
      DataClasses: ['Email addresses', 'Password hints', 'Usernames'],
      IsVerified: true,
      PwnCount: 152445165,
    },
    {
      Name: 'LinkedIn',
      Title: 'LinkedIn',
      Domain: 'linkedin.com',
      BreachDate: '2012-05-01',
      Description: 'LinkedIn breach affecting millions of accounts.',
      DataClasses: ['Email addresses', 'Passwords', 'Usernames'],
      IsVerified: true,
      PwnCount: 164611595,
    },
  ];
}
