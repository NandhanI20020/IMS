# API Integration Setup

This document explains how to set up and test the API integration between the frontend and backend.

## Backend Setup

### 1. Environment Variables
Make sure you have the following environment variables set in your backend `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret
PORT=3000
NODE_ENV=development
```

### 2. Database Setup
Ensure your database has the correct schema and mock data:

1. Run the schema: `supabase_schema.sql`
2. Run the mock data: `mock_data_insert_fixed.sql`

### 3. Start the Backend
```bash
cd backend
npm install
npm start
```

The backend will run on `http://localhost:3000`

## Frontend Setup

### 1. Environment Variables
Make sure your frontend has the correct API URL configuration in `vite.config.js`:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    secure: false,
  },
},
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:3001`

## Testing the API

### 1. Test Database Connection
```bash
cd backend
node test-api.js
```

This will test the database connection and basic queries.

### 2. Test API Endpoints
```bash
node test-api.js
```

This will test the API endpoints directly.

### 3. Test Dashboard Data
The dashboard API endpoint is available at:
- With authentication: `GET /api/v1/reports/dashboard`
- Without authentication (for testing): `GET /api/v1/test/dashboard`

## API Endpoints

### Dashboard Data
- **URL**: `/api/v1/reports/dashboard`
- **Method**: GET
- **Authentication**: Required
- **Query Parameters**:
  - `period`: '7d', '30d', or '90d' (default: '30d')
  - `warehouse`: warehouse ID (optional)

### Test Endpoints (No Authentication Required)
- **Health Check**: `GET /api/v1/test/health`
- **Dashboard Test**: `GET /api/v1/test/dashboard`

## Data Structure

The dashboard API returns the following structure:

```javascript
{
  success: true,
  data: {
    metrics: {
      totalInventoryValue: number,
      previousInventoryValue: number,
      lowStockItems: number,
      previousLowStockItems: number,
      pendingPurchaseOrders: number,
      previousPendingPurchaseOrders: number,
      todayStockMovements: number,
      previousStockMovements: number
    },
    inventoryLevels: [
      {
        name: string,
        currentStock: number,
        minimumStock: number,
        maximumStock: number
      }
    ],
    stockMovements: [
      {
        date: string,
        stockIn: number,
        stockOut: number
      }
    ],
    warehouseDistribution: [
      {
        warehouseName: string,
        totalValue: number,
        itemCount: number
      }
    ],
    purchaseOrderStatus: [
      {
        status: string,
        count: number,
        totalValue: number
      }
    ],
    topProducts: [
      {
        productName: string,
        revenue: number,
        quantitySold: number,
        profit: number
      }
    ],
    turnoverData: {
      ratio: number,
      benchmark: number
    },
    recentMovements: [
      {
        id: number,
        productName: string,
        productSku: string,
        type: string,
        quantity: number,
        reason: string,
        warehouse: string,
        createdAt: string
      }
    ],
    lowStockAlerts: [
      {
        productName: string,
        sku: string,
        currentStock: number,
        reorderPoint: number,
        warehouse: string
      }
    ],
    pendingPurchaseOrders: [
      {
        id: string,
        orderNumber: string,
        supplierName: string,
        status: string,
        totalAmount: number,
        expectedDate: string,
        priority: string
      }
    ]
  },
  message: string
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check your Supabase credentials
   - Ensure the database is accessible
   - Verify the schema is properly set up

2. **Authentication Errors**
   - Make sure the user is logged in
   - Check that the JWT token is valid
   - Verify the user profile exists in the database

3. **CORS Errors**
   - Ensure the frontend proxy is configured correctly
   - Check that the backend CORS settings match the frontend URL

4. **API Not Found**
   - Verify the backend is running on port 3000
   - Check that the API routes are properly configured
   - Ensure the API version is correct (v1)

### Testing Steps

1. **Start Backend**: `cd backend && npm start`
2. **Start Frontend**: `cd frontend && npm run dev`
3. **Test Database**: `node backend/test-api.js`
4. **Test API**: `node test-api.js`
5. **Check Frontend**: Open `http://localhost:3001` and check the dashboard

## Next Steps

Once the API is working:

1. **Remove Test Endpoints**: Remove the test routes from production
2. **Add Authentication**: Ensure all endpoints require proper authentication
3. **Add Error Handling**: Implement comprehensive error handling
4. **Add Caching**: Implement caching for better performance
5. **Add Real-time Updates**: Implement WebSocket connections for real-time data 