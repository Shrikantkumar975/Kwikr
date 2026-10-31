// Server-side validation rules (Unit III: validation rules and constraints).
// Applied to the collections with: npm run validate
export const jsonSchemas = {
  users: {
    bsonType: 'object',
    required: ['name', 'email', 'passwordHash', 'role'],
    properties: {
      name: { bsonType: 'string', minLength: 2 },
      email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
      passwordHash: { bsonType: 'string' },
      role: { enum: ['customer', 'admin'] },
      addresses: {
        bsonType: 'array',
        items: { bsonType: 'object', required: ['line1'], properties: { line1: { bsonType: 'string' } } },
      },
    },
  },
  categories: {
    bsonType: 'object',
    required: ['name'],
    properties: { name: { bsonType: 'string', minLength: 2 } },
  },
  products: {
    bsonType: 'object',
    required: ['name', 'categoryId', 'price', 'stock'],
    properties: {
      name: { bsonType: 'string', minLength: 2 },
      categoryId: { bsonType: 'objectId' },
      price: { bsonType: 'number', minimum: 0.01 },
      stock: { bsonType: 'number', minimum: 0 },
      unit: { bsonType: 'string' },
      tags: { bsonType: 'array', items: { bsonType: 'string' } },
      isActive: { bsonType: 'bool' },
    },
  },
  carts: {
    bsonType: 'object',
    required: ['userId', 'items'],
    properties: {
      userId: { bsonType: 'objectId' },
      items: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['productId', 'qty'],
          properties: { productId: { bsonType: 'objectId' }, qty: { bsonType: 'number', minimum: 1 } },
        },
      },
    },
  },
  orders: {
    bsonType: 'object',
    required: ['userId', 'items', 'total', 'status'],
    properties: {
      userId: { bsonType: 'objectId' },
      total: { bsonType: 'number', minimum: 0 },
      status: { enum: ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'] },
      items: {
        bsonType: 'array',
        minItems: 1,
        items: {
          bsonType: 'object',
          required: ['productId', 'name', 'price', 'qty'],
          properties: {
            productId: { bsonType: 'objectId' },
            name: { bsonType: 'string' },
            price: { bsonType: 'number', minimum: 0 },
            qty: { bsonType: 'number', minimum: 1 },
          },
        },
      },
    },
  },
};
