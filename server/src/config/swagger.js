// OpenAPI 3.0 spec for the Kwikr API
// Served at GET /api/docs  (Swagger UI)
// Raw JSON at  GET /api/docs/json

export const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Kwikr API',
    version: '1.0.0',
    description:
      'REST API powering the **Kwikr** grocery delivery storefront and backoffice. ' +
      'All protected routes require a **Bearer JWT** token obtained from `/api/auth/login` or `/api/auth/register`.',
    contact: { name: 'Kwikr Dev Team' },
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local dev server' },
  ],
  tags: [
    { name: 'Health',     description: 'Server liveness check' },
    { name: 'Auth',       description: 'Register, login and profile endpoints' },
    { name: 'Categories', description: 'Product category CRUD' },
    { name: 'Products',   description: 'Product catalog with search, filters and pagination' },
    { name: 'Cart',       description: 'Shopping cart — add, update, remove items' },
    { name: 'Orders',     description: 'Checkout and order lifecycle management' },
    { name: 'Reports',    description: 'Admin-only analytics aggregations' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the JWT returned by `/api/auth/login` or `/api/auth/register`.',
      },
    },
    schemas: {
      // ─── Shared primitives ────────────────────────────────────────────────
      MongoId: {
        type: 'string',
        pattern: '^[a-f\\d]{24}$',
        example: '6641c8f1a2b3c4d5e6f70001',
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Invalid email or password' },
        },
      },
      PaginatedMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 120 },
          page:  { type: 'integer', example: 1 },
          pages: { type: 'integer', example: 6 },
        },
      },

      // ─── Auth ─────────────────────────────────────────────────────────────
      Address: {
        type: 'object',
        properties: {
          label:   { type: 'string', example: 'Home' },
          line1:   { type: 'string', example: '12 MG Road' },
          city:    { type: 'string', example: 'Bengaluru' },
          pincode: { type: 'string', example: '560001' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id:        { $ref: '#/components/schemas/MongoId' },
          name:      { type: 'string', example: 'Srikant D' },
          email:     { type: 'string', format: 'email', example: 'srikant@kwikr.dev' },
          role:      { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user:  { $ref: '#/components/schemas/User' },
        },
      },

      // ─── Category ─────────────────────────────────────────────────────────
      Category: {
        type: 'object',
        properties: {
          _id:  { $ref: '#/components/schemas/MongoId' },
          name: { type: 'string', example: 'Dairy & Eggs' },
        },
      },

      // ─── Product ──────────────────────────────────────────────────────────
      Product: {
        type: 'object',
        properties: {
          _id:         { $ref: '#/components/schemas/MongoId' },
          name:        { type: 'string', example: 'Full Cream Milk 1L' },
          categoryId:  { $ref: '#/components/schemas/Category' },
          price:       { type: 'number', example: 68 },
          unit:        { type: 'string', example: '1 L' },
          stock:       { type: 'integer', example: 200 },
          tags:        { type: 'array', items: { type: 'string' }, example: ['dairy', 'milk'] },
          description: { type: 'string', example: 'Fresh full-cream milk from local farms.' },
          imageUrl:    { type: 'string', format: 'uri' },
          isActive:    { type: 'boolean', example: true },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'categoryId', 'price', 'unit'],
        properties: {
          name:        { type: 'string', example: 'Full Cream Milk 1L' },
          categoryId:  { $ref: '#/components/schemas/MongoId' },
          price:       { type: 'number', minimum: 0, example: 68 },
          unit:        { type: 'string', example: '1 L' },
          stock:       { type: 'integer', minimum: 0, example: 200 },
          tags:        { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          imageUrl:    { type: 'string', format: 'uri' },
          isActive:    { type: 'boolean', default: true },
        },
      },
      ProductList: {
        allOf: [
          { $ref: '#/components/schemas/PaginatedMeta' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
            },
          },
        ],
      },

      // ─── Cart ─────────────────────────────────────────────────────────────
      CartItem: {
        type: 'object',
        properties: {
          productId: { $ref: '#/components/schemas/Product' },
          qty:       { type: 'integer', minimum: 1, example: 2 },
        },
      },
      Cart: {
        type: 'object',
        properties: {
          _id:    { $ref: '#/components/schemas/MongoId' },
          userId: { $ref: '#/components/schemas/MongoId' },
          items:  { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
        },
      },

      // ─── Order ────────────────────────────────────────────────────────────
      OrderItem: {
        type: 'object',
        properties: {
          productId: { $ref: '#/components/schemas/MongoId' },
          name:      { type: 'string', example: 'Full Cream Milk 1L' },
          price:     { type: 'number', example: 68 },
          qty:       { type: 'integer', example: 2 },
        },
      },
      StatusEntry: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'placed' },
          at:     { type: 'string', format: 'date-time' },
        },
      },
      Order: {
        type: 'object',
        properties: {
          _id:           { $ref: '#/components/schemas/MongoId' },
          userId:        { $ref: '#/components/schemas/MongoId' },
          items:         { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          total:         { type: 'number', example: 349.50 },
          status:        { type: 'string', enum: ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] },
          statusHistory: { type: 'array', items: { $ref: '#/components/schemas/StatusEntry' } },
          address:       { $ref: '#/components/schemas/Address' },
          paymentMethod: { type: 'string', enum: ['COD', 'ONLINE'], example: 'COD' },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
        },
      },
      OrderList: {
        allOf: [
          { $ref: '#/components/schemas/PaginatedMeta' },
          {
            type: 'object',
            properties: {
              items: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
            },
          },
        ],
      },

      // ─── Reports ──────────────────────────────────────────────────────────
      TopProduct: {
        type: 'object',
        properties: {
          productId:  { $ref: '#/components/schemas/MongoId' },
          name:       { type: 'string', example: 'Full Cream Milk 1L' },
          unitsSold:  { type: 'integer', example: 340 },
          revenue:    { type: 'number', example: 23120 },
        },
      },
      CategoryRevenue: {
        type: 'object',
        properties: {
          category:  { type: 'string', example: 'Dairy & Eggs' },
          unitsSold: { type: 'integer', example: 980 },
          revenue:   { type: 'number', example: 54320 },
        },
      },
      DailyOrder: {
        type: 'object',
        properties: {
          date:    { type: 'string', example: '2024-06-15' },
          orders:  { type: 'integer', example: 12 },
          revenue: { type: 'number', example: 4560 },
        },
      },
      LowStockProduct: {
        type: 'object',
        properties: {
          name:     { type: 'string', example: 'Whole Wheat Bread' },
          stock:    { type: 'integer', example: 3 },
          category: { type: 'string', example: 'Bakery' },
        },
      },
      AvgOrderValue: {
        type: 'object',
        properties: {
          customer:      { type: 'string', example: 'Srikant D' },
          orders:        { type: 'integer', example: 8 },
          avgOrderValue: { type: 'number', example: 412.75 },
        },
      },
    },

    // ─── Reusable responses ────────────────────────────────────────────────
    responses: {
      Unauthorized: {
        description: '401 – Missing or invalid JWT',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: '403 – Admin privileges required',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: '404 – Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },

    // ─── Reusable parameters ──────────────────────────────────────────────
    parameters: {
      id: {
        name: 'id', in: 'path', required: true,
        schema: { $ref: '#/components/schemas/MongoId' },
        description: 'MongoDB ObjectId of the resource',
      },
      productId: {
        name: 'productId', in: 'path', required: true,
        schema: { $ref: '#/components/schemas/MongoId' },
        description: 'MongoDB ObjectId of the product',
      },
      page: {
        name: 'page', in: 'query', schema: { type: 'integer', default: 1 },
        description: 'Page number (1-indexed)',
      },
      limit: {
        name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 },
        description: 'Items per page (max 100)',
      },
    },
  },

  // ─── PATHS ────────────────────────────────────────────────────────────────
  paths: {

    // ── Health ──────────────────────────────────────────────────────────────
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness check',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Server is up',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true } } } } },
          },
        },
      },
    },

    // ── Auth ────────────────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name:     { type: 'string', example: 'Srikant D' },
                  email:    { type: 'string', format: 'email', example: 'srikant@kwikr.dev' },
                  password: { type: 'string', minLength: 6, example: 'Secret@123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in as a customer (or admin)',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'srikant@kwikr.dev' },
                  password: { type: 'string', example: 'Secret@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/admin/login': {
      post: {
        tags: ['Auth'],
        summary: 'Admin-only login (rejects non-admin users with 403)',
        operationId: 'adminLogin',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email:    { type: 'string', format: 'email', example: 'admin@kwikr.dev' },
                  password: { type: 'string', example: 'Admin@123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Admin authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get own profile',
        operationId: 'getMe',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current user', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/auth/addresses': {
      post: {
        tags: ['Auth'],
        summary: 'Add a delivery address to own profile',
        operationId: 'addAddress',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['line1'],
                properties: {
                  label:   { type: 'string', example: 'Home' },
                  line1:   { type: 'string', example: '12 MG Road' },
                  city:    { type: 'string', example: 'Bengaluru' },
                  pincode: { type: 'string', example: '560001' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Updated user with new address', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          400: { description: 'line1 is required', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Categories ───────────────────────────────────────────────────────────
    '/api/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories (public)',
        operationId: 'listCategories',
        responses: {
          200: { description: 'Array of categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } },
        },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create a category  🔒 Admin',
        operationId: 'createCategory',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Dairy & Eggs' } } } } },
        },
        responses: {
          201: { description: 'Created category', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/categories/{id}': {
      put: {
        tags: ['Categories'],
        summary: 'Rename a category  🔒 Admin',
        operationId: 'updateCategory',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'Fresh Dairy' } } } } },
        },
        responses: {
          200: { description: 'Updated category', content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Categories'],
        summary: 'Delete a category (fails if products exist under it)  🔒 Admin',
        operationId: 'deleteCategory',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { description: '409 – Category still has products', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Products ─────────────────────────────────────────────────────────────
    '/api/products': {
      get: {
        tags: ['Products'],
        summary: 'List / search products with filters and pagination (public)',
        operationId: 'listProducts',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Full-text search (MongoDB $text index)' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category ObjectId' },
          { name: 'minPrice', in: 'query', schema: { type: 'number' }, description: 'Min price filter' },
          { name: 'maxPrice', in: 'query', schema: { type: 'number' }, description: 'Max price filter' },
          { $ref: '#/components/parameters/page' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 }, description: 'Items per page (max 100)' },
        ],
        responses: {
          200: { description: 'Paginated product list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductList' } } } },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create a product  🔒 Admin',
        operationId: 'createProduct',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: {
          201: { description: 'Created product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get a single product (public)',
        operationId: 'getProduct',
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: { description: 'Product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Products'],
        summary: 'Update a product  🔒 Admin',
        operationId: 'updateProduct',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductInput' } } } },
        responses: {
          200: { description: 'Updated product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete a product  🔒 Admin',
        operationId: 'deleteProduct',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        responses: {
          200: { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean', example: true } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    '/api/products/{id}/stock': {
      patch: {
        tags: ['Products'],
        summary: 'Atomically adjust stock by a delta (positive = restock, negative = decrement)  🔒 Admin',
        operationId: 'patchStock',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['delta'],
                properties: { delta: { type: 'number', example: 50, description: 'Positive to restock, negative to decrement. Stock never goes below 0.' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          400: { description: 'delta must be a number', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { description: '409 – Stock would go negative', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Cart ──────────────────────────────────────────────────────────────────
    '/api/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get own cart  🔒 Customer',
        operationId: 'getCart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cart (or empty object with `items: []`)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Clear the entire cart  🔒 Customer',
        operationId: 'clearCart',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Empty cart', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', example: [] } } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add a product to the cart (increments qty if already present)  🔒 Customer',
        operationId: 'addCartItem',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['productId'],
                properties: {
                  productId: { $ref: '#/components/schemas/MongoId' },
                  qty: { type: 'integer', minimum: 1, default: 1, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Updated cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
          400: { description: 'qty must be a positive integer', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'Product not found or inactive', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/api/cart/items/{productId}': {
      patch: {
        tags: ['Cart'],
        summary: 'Set exact quantity for a cart item  🔒 Customer',
        operationId: 'updateCartItem',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/productId' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['qty'], properties: { qty: { type: 'integer', minimum: 1, example: 3 } } } } },
        },
        responses: {
          200: { description: 'Updated cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
          400: { description: 'qty must be a positive integer', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { description: 'Item not in cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Cart'],
        summary: 'Remove a product from the cart  🔒 Customer',
        operationId: 'removeCartItem',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/productId' }],
        responses: {
          200: { description: 'Updated cart', content: { 'application/json': { schema: { $ref: '#/components/schemas/Cart' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // ── Orders ────────────────────────────────────────────────────────────────
    '/api/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout – convert cart to order, reduce stock atomically  🔒 Customer',
        operationId: 'checkout',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  address:       { $ref: '#/components/schemas/Address' },
                  paymentMethod: { type: 'string', enum: ['COD', 'ONLINE'], default: 'COD' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Order created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: 'Cart empty or missing address', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          409: { description: 'Insufficient stock for a product', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List all orders  🔒 Admin',
        operationId: 'listAllOrders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] } },
          { $ref: '#/components/parameters/page' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          200: { description: 'Paginated order list', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/orders/mine': {
      get: {
        tags: ['Orders'],
        summary: 'List own orders  🔒 Customer',
        operationId: 'listMyOrders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] } },
          { $ref: '#/components/parameters/page' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 5, maximum: 50 } },
        ],
        responses: {
          200: { description: 'Paginated order list', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    '/api/orders/{id}/status': {
      patch: {
        tags: ['Orders'],
        summary: 'Update order status (cancelling restores stock)  🔒 Admin',
        operationId: 'updateOrderStatus',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { type: 'string', enum: ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated order', content: { 'application/json': { schema: { $ref: '#/components/schemas/Order' } } } },
          400: { description: 'Invalid status value', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { description: 'Order already cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    // ── Reports ──────────────────────────────────────────────────────────────
    '/api/reports/top-products': {
      get: {
        tags: ['Reports'],
        summary: 'Top 10 best-selling products by units sold  🔒 Admin',
        operationId: 'topProducts',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of top products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TopProduct' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/reports/revenue-by-category': {
      get: {
        tags: ['Reports'],
        summary: 'Revenue and units sold broken down by category  🔒 Admin',
        operationId: 'revenueByCategory',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of category revenue entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CategoryRevenue' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/reports/orders-per-day': {
      get: {
        tags: ['Reports'],
        summary: 'Orders and revenue grouped by day (last 30 days)  🔒 Admin',
        operationId: 'ordersPerDay',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of daily order stats', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DailyOrder' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/reports/low-stock': {
      get: {
        tags: ['Reports'],
        summary: 'Products with stock at or below threshold  🔒 Admin',
        operationId: 'lowStock',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'threshold', in: 'query', schema: { type: 'integer', default: 10 }, description: 'Max stock level to flag (default 10)' },
        ],
        responses: {
          200: { description: 'Array of low-stock products', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LowStockProduct' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    '/api/reports/avg-order-value': {
      get: {
        tags: ['Reports'],
        summary: 'Top 10 customers by average order value  🔒 Admin',
        operationId: 'avgOrderValue',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Array of customer AOV entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/AvgOrderValue' } } } } },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
  },
};
