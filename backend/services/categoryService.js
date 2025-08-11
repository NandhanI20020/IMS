const { supabaseAdmin } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { logBusinessEvent } = require('../utils/logger');

class CategoryService {
  // Get all categories with filters
  async getCategories(filters) {
    try {
      const {
        page,
        limit,
        search,
        parent,
        status,
        sort,
        order
      } = filters;

      let query = supabaseAdmin
        .from('categories')
        .select(`
          *,
          parent_category:parent_id (
            id,
            name
          )
        `);

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (parent) {
        query = query.eq('parent_id', parent);
      }

      if (status) {
        // Convert status to is_active boolean
        const isActive = status === 'active' || status === 'true';
        query = query.eq('is_active', isActive);
      }

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: categories, error, count } = await query;

      if (error) {
        console.error('Get categories error:', error);
        throw new AppError('Failed to retrieve categories', 500, 'GET_CATEGORIES_ERROR');
      }

      return {
        data: categories,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get categories', 500, 'CATEGORY_SERVICE_ERROR');
    }
  }

  // Get category tree structure
  async getCategoryTree() {
    try {
      const { data: categories, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Get category tree error:', error);
        throw new AppError('Failed to get category tree', 500, 'GET_TREE_ERROR');
      }

      // Build tree structure
      const categoryMap = new Map();
      const rootCategories = [];

      // Create map of all categories
      categories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      // Build tree
      categories.forEach(category => {
        if (category.parent_id) {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryMap.get(category.id));
          }
        } else {
          rootCategories.push(categoryMap.get(category.id));
        }
      });

      return rootCategories;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get category tree', 500, 'GET_TREE_ERROR');
    }
  }

  // Get single category by ID
  async getCategoryById(id) {
    try {
      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .select(`
          *,
          parent_category:parent_id (
            id,
            name
          ),
          child_categories:categories!parent_id (
            id,
            name,
            is_active
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }
        console.error('Get category error:', error);
        throw new AppError('Failed to retrieve category', 500, 'GET_CATEGORY_ERROR');
      }

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get category', 500, 'GET_CATEGORY_ERROR');
    }
  }

  // Create new category
  async createCategory(categoryData, userId) {
    try {
      const {
        name,
        description,
        parent_id,
        image_url,
        sort_order = 0,
        is_active = true,
        metadata
      } = categoryData;

      // Check if category name already exists at the same level
      let nameQuery = supabaseAdmin
        .from('categories')
        .select('id')
        .eq('name', name);

      if (parent_id) {
        nameQuery = nameQuery.eq('parent_id', parent_id);
      } else {
        nameQuery = nameQuery.is('parent_id', null);
      }

      const { data: existingCategory } = await nameQuery.single();

      if (existingCategory) {
        throw new AppError('Category name already exists at this level', 400, 'CATEGORY_NAME_EXISTS');
      }

      // Validate parent category exists if specified
      if (parent_id) {
        const { data: parentCategory } = await supabaseAdmin
          .from('categories')
          .select('id, is_active')
          .eq('id', parent_id)
          .single();

        if (!parentCategory) {
          throw new AppError('Parent category not found', 404, 'PARENT_CATEGORY_NOT_FOUND');
        }

        if (!parentCategory.is_active) {
          throw new AppError('Parent category is not active', 400, 'PARENT_CATEGORY_INACTIVE');
        }
      }

      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .insert({
          name,
          description,
          parent_id,
          image_url,
          sort_order,
          is_active,
          metadata,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('Create category error:', error);
        throw new AppError('Failed to create category', 500, 'CREATE_CATEGORY_ERROR');
      }

      logBusinessEvent('CATEGORY_CREATED', userId, { categoryId: category.id, name });

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create category', 500, 'CREATE_CATEGORY_ERROR');
    }
  }

  // Update category
  async updateCategory(id, updateData, userId) {
    try {
      // Check if category exists
      const { data: existingCategory } = await supabaseAdmin
        .from('categories')
        .select('id, name, parent_id')
        .eq('id', id)
        .single();

      if (!existingCategory) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingCategory.name) {
        let nameQuery = supabaseAdmin
          .from('categories')
          .select('id')
          .eq('name', updateData.name)
          .neq('id', id);

        const parentId = updateData.parent_id !== undefined ? updateData.parent_id : existingCategory.parent_id;

        if (parentId) {
          nameQuery = nameQuery.eq('parent_id', parentId);
        } else {
          nameQuery = nameQuery.is('parent_id', null);
        }

        const { data: nameConflict } = await nameQuery.single();

        if (nameConflict) {
          throw new AppError('Category name already exists at this level', 400, 'CATEGORY_NAME_EXISTS');
        }
      }

      // Validate parent category if being updated
      if (updateData.parent_id && updateData.parent_id !== existingCategory.parent_id) {
        if (updateData.parent_id === id) {
          throw new AppError('Category cannot be its own parent', 400, 'SELF_PARENT_ERROR');
        }

        // Check if parent exists and is active
        const { data: parentCategory } = await supabaseAdmin
          .from('categories')
          .select('id, is_active')
          .eq('id', updateData.parent_id)
          .single();

        if (!parentCategory) {
          throw new AppError('Parent category not found', 404, 'PARENT_CATEGORY_NOT_FOUND');
        }

        if (!parentCategory.is_active) {
          throw new AppError('Parent category is not active', 400, 'PARENT_CATEGORY_INACTIVE');
        }
      }

      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          updated_by: userId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update category error:', error);
        throw new AppError('Failed to update category', 500, 'UPDATE_CATEGORY_ERROR');
      }

      logBusinessEvent('CATEGORY_UPDATED', userId, { categoryId: id, changes: updateData });

      return category;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update category', 500, 'UPDATE_CATEGORY_ERROR');
    }
  }

  // Delete category
  async deleteCategory(id, userId) {
    try {
      // Check if category exists
      const { data: category } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('id', id)
        .single();

      if (!category) {
        throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
      }

      // Check if category has child categories
      const { data: childCategories } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('parent_id', id);

      if (childCategories && childCategories.length > 0) {
        throw new AppError('Cannot delete category with child categories', 400, 'CATEGORY_HAS_CHILDREN');
      }

      // Check if category has products
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id')
        .eq('category_id', id)
        .eq('is_active', true);

      if (products && products.length > 0) {
        throw new AppError('Cannot delete category with products', 400, 'CATEGORY_HAS_PRODUCTS');
      }

      // Soft delete the category by setting is_active to false
      const { error } = await supabaseAdmin
        .from('categories')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Delete category error:', error);
        throw new AppError('Failed to delete category', 500, 'DELETE_CATEGORY_ERROR');
      }

      logBusinessEvent('CATEGORY_DELETED', userId, { categoryId: id, name: category.name });

      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete category', 500, 'DELETE_CATEGORY_ERROR');
    }
  }

  // Get products in category
  async getCategoryProducts(categoryId, filters) {
    try {
      const { page, limit, sort, order } = filters;

      let query = supabaseAdmin
        .from('products')
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .eq('category_id', categoryId)
        .eq('is_active', true);

      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: products, error, count } = await query;

      if (error) {
        console.error('Get category products error:', error);
        throw new AppError('Failed to get category products', 500, 'GET_CATEGORY_PRODUCTS_ERROR');
      }

      return {
        data: products,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get category products', 500, 'GET_CATEGORY_PRODUCTS_ERROR');
    }
  }

  // Reorder categories
  async reorderCategories(categories, userId) {
    try {
      const updates = categories.map((category, index) => ({
        id: category.id,
        sort_order: index,
        updated_at: new Date().toISOString(),
        updated_by: userId
      }));

      const { data, error } = await supabaseAdmin
        .from('categories')
        .upsert(updates)
        .select();

      if (error) {
        console.error('Reorder categories error:', error);
        throw new AppError('Failed to reorder categories', 500, 'REORDER_CATEGORIES_ERROR');
      }

      logBusinessEvent('CATEGORIES_REORDERED', userId, { count: categories.length });

      return data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to reorder categories', 500, 'REORDER_CATEGORIES_ERROR');
    }
  }
}

module.exports = new CategoryService();