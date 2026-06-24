import app from './app.js';
import * as database from './config/database.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in [${process.env.NODE_ENV || 'development'}] mode on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`CRITICAL: Uncaught Exception! ${err.message}\nStack: ${err.stack}`);
  gracefulShutdown(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`CRITICAL: Unhandled Rejection at: ${promise}\nReason: ${reason}`);
  gracefulShutdown(1);
});

process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Starting graceful shutdown sequence...');
  gracefulShutdown(0);
});

process.on('SIGINT', () => {
  logger.warn('SIGINT received. Starting graceful shutdown sequence...');
  gracefulShutdown(0);
});

function gracefulShutdown(exitCode = 0) {
  logger.info('Closing server to stop accepting new requests...');
  
  server.close(async () => {
    logger.info('Server connections closed.');
    
    try {
      logger.info('Closing database connection pool...');
      await database.close();
      logger.info('Database pool closed successfully.');
      process.exit(exitCode);
    } catch (err) {
      logger.error(`Error during database pool closure: ${err.message}`);
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Forceful shutdown triggered: active connections could not close in time.');
    process.exit(1);
  }, 10000);
}
