# Inventory Management System - Backend API

A comprehensive REST API backend for e-commerce inventory management built with Node.js, Express, and Supabase.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control (RBAC)
- **Multi-warehouse Support**: Manage inventory across multiple warehouse locations
- **Product Catalog**: Complete product management with categories and suppliers
- **Purchase Orders**: Full purchase order workflow with approval states
- **Inventory Tracking**: Real-time stock levels with automated alerts
- **Audit Trail**: Complete stock movement history
- **Reporting**: Dashboard data and inventory reports
- **Security**: Row Level Security (RLS) with Supabase
- **Real-time Updates**: WebSocket support for live inventory updates

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Validation**: express-validator + Joi
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting
- **Documentation**: API documentation ready

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   NODE_ENV=development
   PORT=5000
   
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   
   JWT_SECRET=your_very_long_jwt_secret_key_here
   JWT_EXPIRES_IN=24h
   ```

4. **Create log directory**
   ```bash
   mkdir logs
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the database schema from `../supabase_schema.sql`
3. Configure authentication providers if needed
4. Enable realtime for inventory tables
5. Set up storage bucket for product images

### Environment Variables

All configuration is handled through environment variables. See `.env.example` for all available options.

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login |
| POST | `/auth/register` | User registration |
| POST | `/auth/refresh-token` | Refresh access token |
| POST | `/auth/logout` | User logout |
| GET | `/auth/profile` | Get user profile |
| PUT | `/auth/profile` | Update user profile |
| POST | `/auth/change-password` | Change password |

### Product Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products with pagination |
| POST | `/products` | Create new product |
| GET | `/products/:id` | Get product by ID |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/products/search` | Search products |

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory` | Get inventory levels |
| PUT | `/inventory/adjust` | Adjust inventory |
| POST | `/inventory/transfer` | Transfer between warehouses |
| GET | `/inventory/alerts` | Get stock alerts |

### Purchase Order Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-orders` | List purchase orders |
| POST | `/purchase-orders` | Create purchase order |
| GET | `/purchase-orders/:id` | Get purchase order |
| PUT | `/purchase-orders/:id` | Update purchase order |
| POST | `/purchase-orders/:id/receive` | Receive items |

## 🔐 Authentication & Authorization

### User Roles

- **Admin**: Full system access
- **Manager**: Warehouse management, inventory, orders
- **User**: Read-only access to assigned warehouse

### API Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Role-Based Access Control

Routes are protected with role-based middleware:
```javascript
// Require specific role
router.get('/admin-only', requireRole(['admin']), controller);

// Require minimum role level
router.get('/manager-up', requireMinRole('manager'), controller);

// Require specific permission
router.post('/create', requirePermission('products.create'), controller);
```

## 📊 Database Schema

The API uses Supabase with the following key tables:

- `user_profiles` - User information and roles
- `warehouses` - Warehouse locations
- `categories` - Product categories (hierarchical)
- `suppliers` - Supplier information
- `products` - Product catalog
- `inventory` - Current stock levels
- `stock_movements` - Audit trail
- `purchase_orders` - Purchase order headers
- `purchase_order_items` - Purchase order line items
- `stock_alerts` - Automated alerts

## 🚦 Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "errorCode": "VALIDATION_ERROR"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)
- `logs/exceptions.log` (uncaught exceptions)

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

## 🚀 Deployment

### Production Setup

1. Set `NODE_ENV=production`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "inventory-api"
   ```
3. Set up reverse proxy (nginx)
4. Configure SSL certificates
5. Set up monitoring and logging

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔧 Development

### Project Structure

```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── logs/            # Log files
├── server.js        # Main application file
└── package.json     # Dependencies
```

### Adding New Features

1. Create service in `services/`
2. Create controller in `controllers/`
3. Add validation in `middleware/validation.js`
4. Create routes in `routes/`
5. Add tests

## 📞 Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review API documentation
3. Check Supabase dashboard for database issues
4. Verify environment variables

## 🔄 Health Check

The API provides a health check endpoint:
```
GET /health
```

Returns system status, database connectivity, and uptime information.

---

**Note**: This API is designed to work with the Supabase schema provided in `../supabase_schema.sql`. Make sure to run the schema first before starting the API server.