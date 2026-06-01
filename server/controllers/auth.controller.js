const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const JWT_SECRET = process.env.JWT_SECRET || 'toyota_dms_secret_compliance_key_2026';

exports.login = async (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    if (!user.active) {
      return res.status(403).json({ message: 'This user account is inactive. Contact admin.' });
    }

    
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password mismatch.' });
    }

    
    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

    res.status(200).json({
      token,
      user: payload
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, name, role, email, active, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ message: 'Active profile not found.' });
    }

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};
