const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { ZodError } = require('zod');

const app = express();
app.set('trust proxy', 1); // Railway sits behind a proxy
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/institutions', require('./routes/institutions'));
app.use('/api/fdrs', require('./routes/fdrs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/analytics', require('./routes/analytics'));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// Central error handler: never leaks stack traces or DB details.
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
  if (err instanceof ZodError) return res.status(400).json({ success: false, message: 'Invalid request' });
  if (err instanceof multer.MulterError)
    return res.status(400).json({ success: false, message: 'Invalid upload', errors: { document: err.code === 'LIMIT_FILE_SIZE' ? 'File must be 5 MB or smaller' : 'Invalid file upload' } });
  if (err.name === 'CastError' || err.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Invalid data supplied' });
  if (err.code === 11000) {
    const dupFdr = err.keyPattern && err.keyPattern.fdrNumber;
    return res.status(409).json({ success: false, message: dupFdr ? 'An FDR with this reference number already exists for your institution' : 'Duplicate record',
      errors: dupFdr ? { fdrNumber: 'FDR reference number already exists' } : undefined });
  }
  console.error('[error]', err.message);
  res.status(500).json({ success: false, message: 'Something went wrong on the server' });
});
module.exports = app;
