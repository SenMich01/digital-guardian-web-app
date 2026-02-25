import { verifyToken } from './auth.js';
import db from './db.js';
import { hasPremiumAccess } from './subscription.js';

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  req.user = user;
  next();
}

export function premiumMiddleware(req, res, next) {
  const sub = db.prepare('SELECT * FROM subscriptions WHERE user_id = ?').get(req.user.id);
  if (!hasPremiumAccess(req.user, sub)) {
    return res.status(403).json({
      error: 'Premium subscription required',
      trialExpired: true
    });
  }
  next();
}
