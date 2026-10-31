export const httpError = (status, message) => Object.assign(new Error(message), { status });

// Express 4 does not catch errors from async handlers, so wrap them
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) => res.status(404).json({ message: `Not found: ${req.originalUrl}` });

export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (err.code === 11000) status = 409; // duplicate key (unique index)
  if (err.code === 121) status = 400; // $jsonSchema validation failed
  const message = err.code === 11000 ? 'Duplicate value for a unique field' : err.message;
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
};
