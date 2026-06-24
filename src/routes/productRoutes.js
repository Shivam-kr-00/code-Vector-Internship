import express from 'express';
import productController from '../controllers/productController.js';
import { validateProductQuery } from '../middleware/validator.js';

const router = express.Router();

router.get('/products', validateProductQuery, productController.getProducts);

export default router;
