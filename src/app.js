import express from 'express';
import cors from 'cors';
import productRoutes from './routes/productRoutes.js';
import errorMiddleware from './middleware/errorMiddleware.js';
import logger from './utils/logger.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to the Fast Pagination Product Catalog API',
    endpoints: {
      health: '/health',
      products: '/api/v1/products'
    }
  });
});

app.use('/api/v1', productRoutes);

app.use((req, res, next) => {
  const error = new Error(`Cannot find endpoint ${req.originalUrl} on this server.`);
  error.statusCode = 404;
  next(error);
});

app.use(errorMiddleware);

export default app;
