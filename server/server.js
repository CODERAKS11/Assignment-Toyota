const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const carsRoutes = require('./routes/cars.routes');
const slabsRoutes = require('./routes/slabs.routes');
const salesRoutes = require('./routes/sales.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const announcementsRoutes = require('./routes/announcements.routes');
const usersRoutes = require('./routes/users.routes');
const targetsRoutes = require('./routes/targets.routes');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /\.vercel\.app$/
    ];
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


app.use(express.json());
app.use(morgan('dev'));


app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/slabs', slabsRoutes);
app.use('/api/sales-logs', salesRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/targets', targetsRoutes);


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});


app.use((err, req, res, next) => {
  console.error('Toyota DMS Backend Global Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal database processing failure.',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`Toyota DMS API Engine running in secure separate Mode on port ${PORT}`);
  console.log(`Target database endpoints: ${process.env.SUPABASE_URL}`);
  console.log(`================================================================`);
});

module.exports = app;

