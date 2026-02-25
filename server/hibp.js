/**
 * HaveIBeenPwned API integration for breach lookup.
 * Requires HIBP_API_KEY env var. Get one at https://haveibeenpwned.com/API/Key
 */

const HIBP_BASE = 'https://haveibeenpwned.com/api/v3';
const EXEMPT_EMAIL = 'magboyin14@gmail.com';

export async function fetchBreachesForAccount(email) {
  const apiKey = process.env.HIBP_API_KEY;
  
  if (!apiKey || apiKey === 'your-hibp-api-key') {
    // Return demo data when no API key (development)
    return getDemoBreaches(email);
  }

  const encodedEmail = encodeURIComponent(email.toLowerCase());
  const url = `${HIBP_BASE}/breachedaccount/${encodedEmail}?truncateResponse=false`;

  const res = await fetch(url, {
    headers: {
      'hibp-api-key': apiKey,
      'User-Agent': 'DigitalGuardian/1.0'
    }
  });

  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`HIBP API error: ${res.status} ${await res.text()}`);

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function getDemoBreaches(email) {
  // Demo breaches for development when no HIBP key
  const demos = [
    {
      Name: 'Adobe',
      Title: 'Adobe',
      Domain: 'adobe.com',
      BreachDate: '2013-10-04',
      AddedDate: '2013-12-04T00:00:00Z',
      Description: 'In October 2013, 153 million Adobe accounts were breached.',
      DataClasses: ['Email addresses', 'Password hints', 'Usernames'],
      IsVerified: true,
      PwnCount: 152445165
    },
    {
      Name: 'LinkedIn',
      Title: 'LinkedIn',
      Domain: 'linkedin.com',
      BreachDate: '2012-05-01',
      AddedDate: '2016-05-18T00:00:00Z',
      Description: 'LinkedIn breach affecting millions of accounts.',
      DataClasses: ['Email addresses', 'Passwords', 'Usernames'],
      IsVerified: true,
      PwnCount: 164611595
    },
    {
      Name: 'Collection1',
      Title: 'Collection #1',
      Domain: 'multiple',
      BreachDate: '2018-12-01',
      AddedDate: '2019-01-16T00:00:00Z',
      Description: 'Collection of credentials from various breaches.',
      DataClasses: ['Email addresses', 'Passwords'],
      IsVerified: true,
      PwnCount: 773000000
    }
  ];
  return demos;
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
