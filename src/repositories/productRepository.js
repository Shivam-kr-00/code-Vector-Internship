import { query } from '../config/database.js';

class ProductRepository {
  async findProducts({ limit, category, cursor }) {
    const queryLimit = limit + 1;
    const queryParams = [];
    
    let sql = `SELECT id, name, category, price, created_at, updated_at FROM products`;
    let conditions = [];

    if (category) {
      queryParams.push(category);
      conditions.push(`category = $${queryParams.length}`);
    }

    if (cursor) {
      queryParams.push(cursor.created_at);
      queryParams.push(cursor.id);
      
      const dateParam = `$${queryParams.length - 1}`;
      const idParam = `$${queryParams.length}`;
      
      conditions.push(`(created_at < ${dateParam} OR (created_at = ${dateParam} AND id < ${idParam}))`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY created_at DESC, id DESC`;

    queryParams.push(queryLimit);
    sql += ` LIMIT $${queryParams.length}`;

    const { rows } = await query(sql, queryParams);

    const hasMore = rows.length > limit;
    const products = hasMore ? rows.slice(0, limit) : rows;

    return {
      products,
      hasMore,
    };
  }
}

export default new ProductRepository();
