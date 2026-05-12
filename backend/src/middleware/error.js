// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  console.error('[err]', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFound };
