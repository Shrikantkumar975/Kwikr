import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect, signToken } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();
const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, addresses: u.addresses });

// CREATE user
router.post('/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    throw httpError(400, 'Name, email and a password of at least 6 characters are required');
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash }); // role is always "customer" here
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    throw httpError(401, 'Invalid email or password');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

// Dedicated Admin Login: rejects non-admin users with 403 Forbidden
const handleAdminLogin = wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    throw httpError(401, 'Invalid admin email or password');
  }
  if (user.role !== 'admin') {
    throw httpError(403, 'Access denied: Administrator privileges required');
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.post('/admin/login', handleAdminLogin);
router.post('/login/admin', handleAdminLogin);

// READ own profile
router.get('/me', protect, (req, res) => res.json(publicUser(req.user)));

// UPDATE: add an address (embedded array, uses $push)
router.post('/addresses', protect, wrap(async (req, res) => {
  const { label, line1, city, pincode } = req.body;
  if (!line1) throw httpError(400, 'line1 is required');
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $push: { addresses: { label, line1, city, pincode } } },
    { new: true, runValidators: true }
  );
  res.status(201).json(publicUser(user));
}));

export default router;
