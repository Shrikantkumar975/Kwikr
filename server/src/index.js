import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import productRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import reportRoutes from './routes/reports.js';
import { swaggerDefinition } from './config/swagger.js';

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
}));
app.use(express.json());
app.use(morgan('dev'));

// ── API Docs (Swagger UI) ────────────────────────────────────────────────────
// Browse at http://localhost:5000/api/docs
// Raw OpenAPI JSON at http://localhost:5000/api/docs/json
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition, {
  customSiteTitle: 'Kwikr API Docs',
  customCss: `
    .topbar { background: #116A1C !important; }
    .topbar-wrapper img { content: none; }
    .topbar-wrapper::before {
      content: '⚡ Kwikr API';
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      padding: 0 12px;
    }
  `,
  swaggerOptions: { persistAuthorization: true },
}));
app.get('/api/docs/json', (_req, res) => res.json(swaggerDefinition));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
