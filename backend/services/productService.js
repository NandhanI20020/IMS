const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class ProductService {
  // Get all products with filters
  async getProducts(filters) {
    try {
      const {
        page,
        limit,
        search,
        category,
        status,
        supplier,
        warehouse,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('products')
        .select(`
          id,
          sku,
          name,
          description,
          category_id,
          supplier_id,
          brand,
          model,
          barcode,
          weight,
          dimensions,
          cost_price,
          selling_price,
          currency,
          reorder_point,
          max_stock_level,
          image_urls,
          is_active,
          is_serialized,
          tags,
          metadata,
          created_at,
          updated_at,
          created_by,
          categories:categories!products_category_id_fkey (
            id,
            name,
            description,
            parent_id
          ),
          suppliers:suppliers!products_supplier_id_fkey (
            id,
            name,
            email,
            phone,
            contact_person,
            address,
            city,
            state,
            postal_code,
            country
          ),
          inventory (
            id,
            warehouse_id,
            quantity_on_hand,
            quantity_reserved,
            quantity_available,
            average_cost,
            last_movement_date,
            last_count_date,
            bin_location,
            warehouses (
              id,
              name,
              code,
              address,
              city,
              state,
              postal_code,
              country
            )
          )
        `, { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`);
      }

      if (category) {
        query = query.eq('category_id', category);
      }

      if (status) {
        query = query.eq('is_active', status === 'active');
      }

      if (supplier) {
        query = query.eq('supplier_id', supplier);
      }

      if (warehouse) {
        query = query.eq('inventory.warehouse_id', warehouse);
      }

      // Apply sorting (fallback to created_at if invalid)
      if (sort) {
        query = query.order(sort, { ascending: order === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        console.error('Get products error:', error);
        throw new AppError('Failed to retrieve products', 500, 'GET_PRODUCTS_ERROR');
      }

      // Fallback: if nested relations are missing, hydrate category and supplier names
      try {
        const categoryIds = [...new Set((products || []).map(p => p.category_id).filter(Boolean))];
        const supplierIds = [...new Set((products || []).map(p => p.supplier_id).filter(Boolean))];

        let categoriesById = {};
        let suppliersById = {};

        if (categoryIds.length > 0) {
          const { data: cats } = await supabaseAdmin
            .from('categories')
            .select('id, name')
            .in('id', categoryIds);
          (cats || []).forEach(c => { categoriesById[c.id] = c; });
        }

        if (supplierIds.length > 0) {
          const { data: sups } = await supabaseAdmin
            .from('suppliers')
            .select('id, name, email, phone, contact_person')
            .in('id', supplierIds);
          (sups || []).forEach(s => { suppliersById[s.id] = s; });
        }

        // Attach if missing
        (products || []).forEach(p => {
          if (!p.categories && p.category_id && categoriesById[p.category_id]) {
            p.categories = categoriesById[p.category_id];
          }
          if (!p.suppliers && p.supplier_id && suppliersById[p.supplier_id]) {
            p.suppliers = suppliersById[p.supplier_id];
          }
        });
      } catch (hydrateErr) {
        console.warn('Failed to hydrate category/supplier fallback:', hydrateErr);
      }

      // Transform the data to include calculated fields
      const transformedProducts = products?.map(product => {
        // Calculate total stock across all warehouses
        const totalStock = product.inventory?.reduce((sum, inv) => sum + (inv.quantity_on_hand || 0), 0) || 0;
        const totalReserved = product.inventory?.reduce((sum, inv) => sum + (inv.quantity_reserved || 0), 0) || 0;
        const availableStock = totalStock - totalReserved;
        
        // Calculate average cost across all warehouses
        const totalCost = product.inventory?.reduce((sum, inv) => 
          sum + ((inv.quantity_on_hand || 0) * (inv.average_cost || 0)), 0) || 0;
        const averageCost = totalStock > 0 ? totalCost / totalStock : product.cost_price || 0;

        return {
          ...product,
          totalStock,
          totalReserved,
          availableStock,
          averageCost,
          stockStatus: availableStock <= (product.reorder_point || 0) ? 'low_stock' : 
                      availableStock === 0 ? 'out_of_stock' : 'in_stock',
          stockValue: availableStock * (product.selling_price || 0),
          costValue: availableStock * averageCost
        };
      }) || [];

      return {
        data: transformedProducts,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Product service error:', error);
      throw new AppError('Failed to get products', 500, 'PRODUCT_SERVICE_ERROR');
    }
  }

  // Get single product by ID
  async getProductById(id) {
    try {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            parent_id
          ),
          suppliers (
            id,
            name,
            email,
            phone
          ),
          inventory (
            id,
            warehouse_id,
            quantity_on_hand,
            quantity_reserved,
            average_cost,
            warehouses (
              id,
              name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
        }
        console.error('Get product error:', error);
        throw new AppError('Failed to retrieve product', 500, 'GET_PRODUCT_ERROR');
      }

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Get product by ID error:', error);
      throw new AppError('Failed to get product', 500, 'GET_PRODUCT_ERROR');
    }
  }

  // Create new product
  async createProduct(productData, userId) {
    try {
      const {
        name,
        sku,
        description,
        category_id,
        supplier_id,
        selling_price,
        cost_price,
        reorder_point,
        max_stock_level,
        is_active = true,
        currency = 'USD',
        brand,
        model,
        barcode,
        weight,
        dimensions,
        image_urls,
        tags = [],
        metadata = {},
        currentStock = 0, // Initial stock from form
        warehouse_id = null // Specific warehouse for initial stock
      } = productData;

      console.log('Creating product with data:', productData);

      // Check if SKU already exists
      const { data: existingSKU } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('sku', sku)
        .single();

      if (existingSKU) {
        throw new AppError('SKU already exists', 400, 'SKU_EXISTS');
      }

      // Validate price comparison constraint
      const parsedSellingPrice = parseFloat(selling_price) || 0;
      const parsedCostPrice = parseFloat(cost_price) || 0;
      
      if (parsedSellingPrice < parsedCostPrice) {
        throw new AppError('Selling price must be greater than or equal to cost price', 400, 'INVALID_PRICE_COMPARISON');
      }

      // Prepare insert data with proper type conversion
      const insertData = {
        name,
        sku,
        description,
        category_id: category_id ? parseInt(category_id) : null,
        supplier_id: supplier_id ? parseInt(supplier_id) : null,
        selling_price: parsedSellingPrice,
        cost_price: parsedCostPrice,
        reorder_point: parseInt(reorder_point) || 10,
        max_stock_level: max_stock_level ? parseInt(max_stock_level) : null,
        is_active,
        currency,
        brand,
        model,
        barcode,
        weight: weight ? parseFloat(weight) : null,
        dimensions: dimensions || null,
        image_urls: Array.isArray(image_urls) ? image_urls : [],
        tags: Array.isArray(tags) ? tags : [],
        metadata: metadata || {}
      };

      console.log('Insert data:', insertData);

      // Only set created_by if we have a valid user ID
      if (userId && userId !== 'test-user-id') {
        insertData.created_by = userId;
      }
      // For test operations, don't set created_by (it's nullable in the schema)

      // Use direct insert instead of RPC function to handle null values properly
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Create product error:', error);
        throw new AppError(`Failed to create product: ${error.message}`, 500, 'CREATE_PRODUCT_ERROR');
      }

      // Create inventory records for all active warehouses
      try {
        const { data: warehouses, error: warehousesError } = await supabaseAdmin
          .from('warehouses')
          .select('id')
          .eq('is_active', true);

        if (warehousesError) {
          console.error('Failed to get warehouses for inventory creation:', warehousesError);
        } else if (warehouses && warehouses.length > 0) {
          // Create inventory records for each warehouse
          const inventoryRecords = warehouses.map(warehouse => {
            // If a specific warehouse is specified and this is it, use the initial stock
            const initialStock = (productData.warehouse_id && warehouse.id === parseInt(productData.warehouse_id)) || 
                                (!productData.warehouse_id && warehouse.id === 1) ? // Default to first warehouse if none specified
                                parseInt(productData.currentStock || 0) : 0;
            
            return {
              product_id: product.id,
              warehouse_id: warehouse.id,
              quantity_on_hand: initialStock,
              quantity_reserved: 0,
              average_cost: parsedCostPrice,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          });

          const { error: inventoryError } = await supabaseAdmin
            .from('inventory')
            .insert(inventoryRecords);

          if (inventoryError) {
            console.error('Failed to create inventory records:', inventoryError);
            // Don't throw error here as the product was created successfully
          } else {
            console.log(`Created inventory records for ${warehouses.length} warehouses`);
          }
        }
      } catch (inventoryError) {
        console.error('Error creating inventory records:', inventoryError);
        // Don't throw error here as the product was created successfully
      }

      logBusinessEvent('PRODUCT_CREATED', userId, { productId: product.id, sku });

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Create product error:', error);
      throw new AppError('Failed to create product', 500, 'CREATE_PRODUCT_ERROR');
    }
  }

  // Update product
  async updateProduct(id, updateData, userId) {
    try {
      // Check if product exists
      const { data: existingProduct } = await supabaseAdmin
        .from('products')
        .select('id, sku')
        .eq('id', id)
        .single();

      if (!existingProduct) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // If SKU is being updated, check for duplicates
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const { data: existingSKU } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('sku', updateData.sku)
          .neq('id', id)
          .single();

        if (existingSKU) {
          throw new AppError('SKU already exists', 400, 'SKU_EXISTS');
        }
      }

      const { data: product, error } = await supabaseAdmin
        .from('products')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update product error:', error);
        throw new AppError('Failed to update product', 500, 'UPDATE_PRODUCT_ERROR');
      }

      logBusinessEvent('PRODUCT_UPDATED', userId, { productId: id, changes: updateData });

      return product;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Update product error:', error);
      throw new AppError('Failed to update product', 500, 'UPDATE_PRODUCT_ERROR');
    }
  }

  // Delete product
  async deleteProduct(id, userId) {
    try {
      // Check if product exists
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, sku')
        .eq('id', id)
        .single();

      if (!product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
      }

      // Check if product has inventory
      const { data: inventory } = await supabaseAdmin
        .from('inventory')
        .select('quantity_on_hand')
        .eq('product_id', id);

      // Check if inventory exists and has stock
      const hasStock = inventory && inventory.length > 0 && inventory.some(inv => inv.quantity_on_hand > 0);
      if (hasStock) {
        throw new AppError('Cannot delete product with existing stock', 400, 'PRODUCT_HAS_STOCK');
      }

      // Soft delete the product by setting is_active to false
      const { error } = await supabaseAdmin
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Delete product error:', error);
        throw new AppError('Failed to delete product', 500, 'DELETE_PRODUCT_ERROR');
      }

      logBusinessEvent('PRODUCT_DELETED', userId, { productId: id, sku: product.sku });

      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Delete product error:', error);
      throw new AppError('Failed to delete product', 500, 'DELETE_PRODUCT_ERROR');
    }
  }

  // Get product variants
  async getProductVariants(productId) {
    try {
      const { data: variants, error } = await supabaseAdmin
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get product variants error:', error);
        throw new AppError('Failed to get product variants', 500, 'GET_VARIANTS_ERROR');
      }

      return variants;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Get product variants error:', error);
      throw new AppError('Failed to get product variants', 500, 'GET_VARIANTS_ERROR');
    }
  }

  // Bulk update products
  async bulkUpdateProducts(products, userId) {
    try {
      const updates = products.map(product => ({
        ...product,
        updated_at: new Date().toISOString(),
        updated_by: userId
      }));

      const { data, error } = await supabaseAdmin
        .from('products')
        .upsert(updates)
        .select();

      if (error) {
        console.error('Bulk update products error:', error);
        throw new AppError('Failed to bulk update products', 500, 'BULK_UPDATE_ERROR');
      }

      logBusinessEvent('PRODUCTS_BULK_UPDATED', userId, { count: products.length });

      return {
        updated: data.length,
        products: data
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Bulk update products error:', error);
      throw new AppError('Failed to bulk update products', 500, 'BULK_UPDATE_ERROR');
    }
  }

  // Import products from CSV
  async importProductsFromCSV(file, userId) {
    try {
      // This would implement CSV parsing and product creation
      // For now, returning a placeholder response
      logBusinessEvent('PRODUCTS_IMPORTED', userId, { filename: file.originalname });

      return {
        message: 'Products imported successfully',
        imported: 0,
        errors: []
      };
    } catch (error) {
      console.error('Import products error:', error);
      throw new AppError('Failed to import products', 500, 'IMPORT_ERROR');
    }
  }

  // Export products to CSV
  async exportProductsToCSV(filters) {
    try {
      const products = await this.getProducts({ ...filters, limit: 10000, page: 1 });
      
      // Generate CSV data
      const headers = 'ID,Name,SKU,Price,Cost,Status,Category,Supplier\n';
      const rows = products.data.map(product => 
        `${product.id},"${product.name}","${product.sku}",${product.price},${product.cost},"${product.status}","${product.categories?.name || ''}","${product.suppliers?.name || ''}"`
      ).join('\n');

      return headers + rows;
    } catch (error) {
      console.error('Export products error:', error);
      throw new AppError('Failed to export products', 500, 'EXPORT_ERROR');
    }
  }
}

module.exports = new ProductService();