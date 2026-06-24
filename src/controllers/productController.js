import productRepository from '../repositories/productRepository.js';
import { decodeCursor, encodeCursor } from '../utils/cursorHelper.js';

class ProductController {
  async getProducts(req, res, next) {
    try {
      const { limit, cursor, category } = req.validatedQuery || req.query;
      
      let decodedCursor = null;

      if (cursor) {
        decodedCursor = decodeCursor(cursor);
        
        if (!decodedCursor) {
          return res.status(400).json({
            status: 'fail',
            message: 'Invalid cursor. The pagination token is malformed or has been modified.',
          });
        }
      }

      const { products, hasMore } = await productRepository.findProducts({
        limit,
        category,
        cursor: decodedCursor,
      });

      let nextCursor = null;
      if (hasMore && products.length > 0) {
        const lastItem = products[products.length - 1];
        nextCursor = encodeCursor(lastItem.created_at, lastItem.id);
      }

      return res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
          products,
          pagination: {
            limit,
            next_cursor: nextCursor,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProductController();
