import { fileURLToPath } from 'url';
import path from 'path';
import { pool } from '../config/database.js';

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 5000;

const ADJECTIVES = ['Ultra', 'Classic', 'Premium', 'Eco-Friendly', 'Smart', 'Wireless', 'Portable', 'Pro', 'Deluxe', 'Essential', 'Vintage', 'Modern', 'Compact', 'Ergonomic', 'Heavy-Duty'];
const BRANDS = ['Apex', 'Nova', 'Quantum', 'Velo', 'Aero', 'Sol', 'Lumen', 'Forge', 'Summit', 'Zenith', 'Echo', 'Sync', 'Stratos', 'Atlas', 'Omni'];
const PRODUCT_TYPES = {
  'Electronics': ['Headphones', 'Smartwatch', 'Speaker', 'Charger', 'Tablet', 'Monitor', 'Keyboard', 'Camera', 'Router', 'Projector'],
  'Fashion': ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Sunglasses', 'Backpack', 'Hat', 'Watch', 'Socks', 'Wallet'],
  'Home & Kitchen': ['Blender', 'Coffee Maker', 'Air Fryer', 'Toaster', 'Knife Set', 'Mug', 'Organizer', 'Vacuum', 'Lamp', 'Cookware'],
  'Books': ['Novel', 'Biography', 'Self-Help Guide', 'Cookbook', 'History Text', 'Mystery Thriller', 'Sci-Fi Epic', 'Poetry Collection', 'Textbook', 'Journal'],
  'Sports & Outdoors': ['Water Bottle', 'Yoga Mat', 'Dumbbells', 'Backpack', 'Sleeping Bag', 'Tent', 'Bicycle Pump', 'Resistance Bands', 'Running Shoes', 'Flashlight'],
  'Beauty & Personal Care': ['Moisturizer', 'Shampoo', 'Serum', 'Lip Balm', 'Sunscreen', 'Perfume', 'Face Mask', 'Hair Dryer', 'Toothbrush', 'Shaving Kit']
};

const CATEGORIES = Object.keys(PRODUCT_TYPES);

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generatePrice = () => {
  const val = Math.random() * 1495 + 5;
  return parseFloat(val.toFixed(2));
};

export async function seedDatabase() {
  console.log('Starting product database seeding...');
  const startTime = Date.now();

  try {
    await pool.query('SELECT 1');
    console.log('Database connection verified.');

    console.log('Clearing existing product data...');
    await pool.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE;');

    const numBatches = TOTAL_PRODUCTS / BATCH_SIZE;
    const baseTime = new Date();

    for (let batchNum = 0; batchNum < numBatches; batchNum++) {
      const batchStartTime = Date.now();
      const valuePlaceholders = [];
      const values = [];

      for (let i = 0; i < BATCH_SIZE; i++) {
        const globalIndex = batchNum * BATCH_SIZE + i;
        const category = randomChoice(CATEGORIES);
        const type = randomChoice(PRODUCT_TYPES[category]);
        const name = `${randomChoice(ADJECTIVES)} ${randomChoice(BRANDS)} ${type} #${globalIndex + 1}`;
        const price = generatePrice();
        const createdAt = new Date(baseTime.getTime() - globalIndex * 10000);
        const updatedAt = createdAt;

        values.push(name, category, price, createdAt, updatedAt);

        const offset = i * 5;
        valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
      }

      const sqlQuery = `
        INSERT INTO products (name, category, price, created_at, updated_at)
        VALUES ${valuePlaceholders.join(',')}
      `;

      await pool.query(sqlQuery, values);

      const batchDuration = ((Date.now() - batchStartTime) / 1000).toFixed(2);
      const totalProgress = (((batchNum + 1) / numBatches) * 100).toFixed(0);
      console.log(`Inserted batch ${batchNum + 1}/${numBatches} (${BATCH_SIZE} records) in ${batchDuration}s | Progress: ${totalProgress}%`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Seeding completed successfully in ${duration} seconds! Total records: ${TOTAL_PRODUCTS}`);
  } catch (error) {
    console.error('CRITICAL: Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('Database pool connection closed.');
  }
}

const __filename = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(__filename));
if (isDirectRun) {
  seedDatabase();
}

export default seedDatabase;
