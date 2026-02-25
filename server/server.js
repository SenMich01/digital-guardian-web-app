import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import db from './db.js';
import { fetchBreachesForAccount, mapBreachToExposure } from './leakcheck.js';
import { hashPassword, verifyPassword, createToken } from './auth.js';
import { authMiddleware, premiumMiddleware } from './middleware.js';
import {
  getTrialEndDate,
  isExemptEmail,
  hasPremiumAccess,
  isTrialActive
} from './subscription.js';

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

app.use(cors({ origin: true }));

// Stripe webhook MUST use raw body - register before json parser
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(503).send('Stripe not configured');
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : (req.body && typeof req.body === 'object' ? req.body : JSON.parse(req.body?.toString?.() || '{}'));
  } catch (e) {
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const s = event.data.object;
    const userId = s.metadata?.userId;
    if (userId) {
      db.prepare(`
        UPDATE subscriptions SET
          stripe_subscription_id = ?,
          status = ?,
          current_period_end = datetime(?1, 'unixepoch'),
          plan = 'premium',
          updated_at = datetime('now')
        WHERE user_id = ?
      `).run(s.id, s.status, s.current_period_end, userId);
    }
  }
  res.json({ received: true });
});

app.use(express.json());

// --- Auth routes ---
app.post('/api/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const normalized = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const hash = hashPassword(password);
  const r = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(
    normalized,
    name || '',
    hash
  );
  const userId = r.lastInsertRowid;
  const trialEndsAt = getTrialEndDate(new Date().toISOString());
  db.prepare(`
    INSERT INTO subscriptions (user_id, status, trial_ends_at, plan)
    VALUES (?, 'trialing', ?, 'free')
  `).run(userId, trialEndsAt);
  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(userId);
  const token = createToken(user);
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
    subscription: formatSubscription(sub, user)
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const normalized = email.toLowerCase().trim();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);
  const token = createToken(user);
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
    subscription: formatSubscription(sub, user)
  });
});

app.post('/api/auth/google', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const normalized = email.toLowerCase().trim();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
  if (!user) {
    const r = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(
      normalized,
      name || '',
      null
    );
    const userId = r.lastInsertRowid;
    const trialEndsAt = getTrialEndDate(new Date().toISOString());
    db.prepare(`
      INSERT INTO subscriptions (user_id, status, trial_ends_at, plan)
      VALUES (?, 'trialing', ?, 'free')
    `).run(userId, trialEndsAt);
    user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  }
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);
  const token = createToken(user);
  res.json({
    user: { id: user.id, email: user.email, name: user.name },
    token,
    subscription: formatSubscription(sub, user)
  });
});

// --- Scan routes (user's own email) ---
app.post('/api/scan', authMiddleware, async (req, res) => {
  const user = req.user;
  const email = user.email;
  if (!email) return res.status(400).json({ error: 'No email to scan' });

  try {
    db.prepare('INSERT INTO api_logs (user_id, action, email_scanned) VALUES (?, ?, ?)')
      .run(user.id, 'scan_own', email);
  } catch {}

  try {
    const breaches = await fetchBreachesForAccount(email);
    const exposures = breaches.map((b) => mapBreachToExposure(b, email));
    const stmt = db.prepare(`
      INSERT INTO scan_results (user_id, email, breach_name, breach_domain, breach_date, breach_description, data_classes, severity, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of exposures) {
      stmt.run(
        user.id,
        email,
        e.breach_name,
        e.breach_domain,
        e.breach_date,
        e.breach_description,
        e.data_classes,
        e.severity,
        e.source
      );
    }
    res.json({
      exposures,
      count: exposures.length,
      scanned: email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

// --- Premium: search any email ---
app.post('/api/scan/search', authMiddleware, premiumMiddleware, async (req, res) => {
  const user = req.user;
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const searchEmail = email.toLowerCase().trim();

  try {
    db.prepare('INSERT INTO api_logs (user_id, action, email_scanned) VALUES (?, ?, ?)')
      .run(user.id, 'scan_search', searchEmail);
  } catch {}

  try {
    const breaches = await fetchBreachesForAccount(searchEmail);
    const exposures = breaches.map((b) => mapBreachToExposure(b, searchEmail));
    res.json({
      exposures,
      count: exposures.length,
      scanned: searchEmail
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

// --- Single exposure (own data only, GDPR: user can only see own data) ---
app.get('/api/scan/result/:id', authMiddleware, (req, res) => {
  const row = db.prepare(
    'SELECT * FROM scan_results WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const exposure = {
    id: row.id,
    type: inferType(row),
    source: row.source || row.breach_name,
    data: row.email,
    risk: row.severity || 'medium',
    date: row.breach_date || row.created_at?.slice(0, 10),
    status: 'active',
    aiAssessment: row.breach_description || 'Breach detected.',
    breach_name: row.breach_name,
    breach_domain: row.breach_domain,
  };
  res.json(exposure);
});

// --- User scan results (own data only) ---
app.get('/api/scan/results', authMiddleware, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM scan_results WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  const exposures = rows.map((r) => ({
    id: r.id,
    type: inferType(r),
    source: r.source || r.breach_name,
    data: r.email,
    risk: r.severity || 'medium',
    date: r.breach_date || r.created_at?.slice(0, 10),
    status: 'active',
    aiAssessment: r.breach_description || 'Breach detected.'
  }));
  res.json({ exposures });
});

// --- Dashboard stats ---
app.get('/api/dashboard', authMiddleware, (req, res) => {
  const user = req.user;
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);
  const rows = db.prepare(`
    SELECT * FROM scan_results WHERE user_id = ? ORDER BY created_at DESC
  `).all(user.id);
  const high = rows.filter((r) => r.severity === 'high').length;
  const medium = rows.filter((r) => r.severity === 'medium').length;
  const low = rows.filter((r) => r.severity === 'low').length;
  res.json({
    stats: {
      totalExposures: rows.length,
      highRisk: high,
      mediumRisk: medium,
      lowRisk: low,
      removed: 0
    },
    subscription: formatSubscription(sub, user)
  });
});

// --- Subscription status ---
app.get('/api/subscription', authMiddleware, (req, res) => {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);
  res.json(formatSubscription(sub, req.user));
});

// --- Stripe: create checkout session ---
app.post('/api/billing/create-checkout', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment not configured. Set STRIPE_SECRET_KEY.' });
  }
  const { priceId } = req.body;
  const priceIdToUse = priceId || process.env.STRIPE_PRICE_ID || 'price_premium';
  const user = req.user;
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);

  try {
    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const cust = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user.id) }
      });
      customerId = cust.id;
      db.prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?').run(
        customerId,
        user.id
      );
    }
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card', 'link'],
      line_items: [{ price: priceIdToUse }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?canceled=true`,
      metadata: { userId: String(user.id) }
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Checkout failed' });
  }
});

// --- Stripe: create setup intent for card ---
app.post('/api/billing/setup-intent', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment not configured. Set STRIPE_SECRET_KEY.' });
  }
  const user = req.user;
  try {
    let sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);
    if (!sub) {
      const trialEndsAt = getTrialEndDate(new Date().toISOString());
      db.prepare(`
        INSERT INTO subscriptions (user_id, status, trial_ends_at, plan)
        VALUES (?, 'trialing', ?, 'free')
      `).run(user.id, trialEndsAt);
      sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(user.id);
    }
    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const cust = await stripe.customers.create({
        email: user.email || `user${user.id}@digitalguardian.local`,
        metadata: { userId: String(user.id) }
      });
      customerId = cust.id;
      db.prepare('UPDATE subscriptions SET stripe_customer_id = ? WHERE user_id = ?').run(
        customerId,
        user.id
      );
    }
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card', 'link']
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('Setup intent error:', err);
    res.status(500).json({
      error: err.message || 'Failed to create setup intent',
      details: err.raw?.message || err.code
    });
  }
});

// --- Helpers ---
function formatSubscription(sub, user) {
  if (!sub) {
    return {
      status: 'none',
      isPremium: isExemptEmail(user?.email),
      trialActive: false,
      trialEndsAt: null,
      exempt: isExemptEmail(user?.email)
    };
  }
  const exempt = isExemptEmail(user?.email);
  const premium = exempt || sub.status === 'active' || (sub.status === 'trialing' && isTrialActive(sub.trial_ends_at));
  return {
    status: sub.status,
    isPremium: premium,
    trialActive: sub.status === 'trialing' && isTrialActive(sub.trial_ends_at),
    trialEndsAt: sub.trial_ends_at,
    exempt,
    currentPeriodEnd: sub.current_period_end,
    plan: sub.plan
  };
}

function inferType(r) {
  const dc = (r.data_classes || '').toLowerCase();
  if (dc.includes('password')) return 'Credentials';
  if (dc.includes('email')) return 'Email';
  if (dc.includes('phone')) return 'Phone';
  if (dc.includes('address')) return 'Address';
  return 'Account';
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
