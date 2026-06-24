import logger from '../utils/logger.js';

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${err.message}\nStack: ${err.stack}`);

  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    message: isProduction && statusCode === 500 
      ? 'An unexpected error occurred on the server.' 
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorMiddleware;
