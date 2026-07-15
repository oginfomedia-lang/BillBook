import api from './client';
import type { PaginatedResponse } from '../types';

export type ItemStatus = 'active' | 'inactive' | 'discontinued';
export type DiscountType = 'percentage' | 'fixed';
export type TaxType = 'inclusive' | 'exclusive';
export type ItemType = 'item' | 'service';

export interface Category {
    id: number;
    name: string;
    description?: string;
}

export interface Brand {
    id: number;
    name: string;
    description?: string;
}

export interface Unit {
    id: number;
    name: string;
    short_name?: string;
}

export interface Tax {
    id: number;
    name: string;
    tax_value: number;
}

export interface Warehouse {
    id: number;
    name: string;
    location?: string;
}

export interface ItemGroup {
    id: number;
    name: string;
    description?: string;
}

export interface Item {
    id: number;
    item_code: string;
    item_name: string;
    item_group_id?: number;
    item_group?: ItemGroup;
    category_id?: number;
    category?: Category;
    brand_id?: number;
    brand?: Brand;
    unit_id?: number;
    unit?: Unit;
    type?: ItemType;
    sku?: string;
    hsn?: string;
    sac?: string;
    barcode?: string;
    description?: string;
    image_url?: string;
    price_expenses: number;
    purchase_price: number;
    sales_price: number;
    mrp?: number;
    discount_type: DiscountType;
    discount_value: number;
    tax_id?: number;
    tax?: Tax;
    tax_type: TaxType;
    opening_stock: number;
    alert_quantity: number;
    warehouse_id?: number;
    warehouse?: Warehouse;
    profit_margin?: number;
    seller_points: number;
    status: ItemStatus;
    // Backward-compat alias (mapped from sales_price on backend)
    unit_price?: number;
    is_active?: boolean;
    created_at: string;
    updated_at: string;
    tenant_id: number;
}

export interface CreateItemInput {
    item_code: string;
    item_name: string;
    item_group_id?: number;
    category_id?: number;
    brand_id?: number;
    unit_id?: number;
    type?: ItemType;
    sku?: string;
    hsn?: string;
    sac?: string;
    barcode?: string;
    description?: string;
    image_url?: string;
    price_expenses?: number;
    purchase_price?: number;
    sales_price: number;
    mrp?: number;
    discount_type?: DiscountType;
    discount_value?: number;
    tax_id?: number;
    tax_type?: TaxType;
    opening_stock?: number;
    alert_quantity?: number;
    warehouse_id?: number;
    seller_points?: number;
    status?: ItemStatus;
}

export interface UpdateItemInput extends Partial<CreateItemInput> { }

// Fetch items list with filters and pagination
export const fetchItems = async (params: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: number;
    brand_id?: number;
    warehouse_id?: number;
    status?: ItemStatus;
    type?: ItemType;
} = {}): Promise<PaginatedResponse<Item>> => {
    const { data } = await api.get('/items', { params });
    return data;
};

// Alias for convenience
export const listItems = fetchItems;

// Fetch single item
export const fetchItem = async (id: number): Promise<Item> => {
    const { data } = await api.get(`/items/${id}`);
    return data;
};

// Create item
export const createItem = async (payload: CreateItemInput): Promise<{ message: string; item: Item }> => {
    const { data } = await api.post('/items', payload);
    return data;
};

// Update item
export const updateItem = async (id: number, payload: UpdateItemInput): Promise<{ message: string; item: Item }> => {
    const { data } = await api.put(`/items/${id}`, payload);
    return data;
};

// Delete item
export const deleteItem = async (id: number): Promise<{ message: string }> => {
    const { data } = await api.delete(`/items/${id}`);
    return data;
};

// Bulk import items from CSV
export const bulkImportItems = async (file: File): Promise<{ message: string; imported_count: number; errors: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post('/items/bulk-import', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return data;
};

// Get item barcode
export const getItemBarcode = async (id: number): Promise<{ barcode: string; item_code: string; item_name: string }> => {
    const { data } = await api.get(`/items/${id}/barcode`);
    return data;
};

// Categories API
export const fetchCategories = async (): Promise<Category[]> => {
    const { data } = await api.get('/items/categories');
    return data;
};
export const createCategory = async (payload: { name: string; description?: string }): Promise<Category> => {
    const { data } = await api.post('/items/categories', payload);
    return data;
};
export const updateCategory = async (id: number, payload: { name?: string; description?: string }): Promise<Category> => {
    const { data } = await api.put(`/items/categories/${id}`, payload);
    return data;
};
export const deleteCategory = async (id: number): Promise<void> => {
    await api.delete(`/items/categories/${id}`);
};

// Brands API
export const fetchBrands = async (): Promise<Brand[]> => {
    const { data } = await api.get('/items/brands');
    return data;
};
export const createBrand = async (payload: { name: string; description?: string }): Promise<Brand> => {
    const { data } = await api.post('/items/brands', payload);
    return data;
};
export const updateBrand = async (id: number, payload: { name?: string; description?: string }): Promise<Brand> => {
    const { data } = await api.put(`/items/brands/${id}`, payload);
    return data;
};
export const deleteBrand = async (id: number): Promise<void> => {
    await api.delete(`/items/brands/${id}`);
};

// Units API
export const fetchUnits = async (): Promise<Unit[]> => {
    const { data } = await api.get('/items/units');
    return data;
};
export const createUnit = async (payload: { name: string; short_name?: string }): Promise<Unit> => {
    const { data } = await api.post('/items/units', payload);
    return data;
};
export const updateUnit = async (id: number, payload: { name?: string; short_name?: string }): Promise<Unit> => {
    const { data } = await api.put(`/items/units/${id}`, payload);
    return data;
};
export const deleteUnit = async (id: number): Promise<void> => {
    await api.delete(`/items/units/${id}`);
};

// Taxes API
export const fetchTaxes = async (): Promise<Tax[]> => {
    const { data } = await api.get('/items/taxes');
    return data;
};
export const createTax = async (payload: { name: string; tax_value: number }): Promise<Tax> => {
    const { data } = await api.post('/items/taxes', payload);
    return data;
};
export const updateTax = async (id: number, payload: { name?: string; tax_value?: number }): Promise<Tax> => {
    const { data } = await api.put(`/items/taxes/${id}`, payload);
    return data;
};
export const deleteTax = async (id: number): Promise<void> => {
    await api.delete(`/items/taxes/${id}`);
};

// Variants API
export interface Variant {
    id: number;
    name: string;
    description?: string;
    status?: string;
}

export const fetchVariants = async (): Promise<Variant[]> => {
    const { data } = await api.get('/items/variants');
    return data;
};
export const createVariant = async (payload: { name: string; description?: string }): Promise<Variant> => {
    const { data } = await api.post('/items/variants', payload);
    return data;
};
export const updateVariant = async (id: number, payload: { name?: string; description?: string }): Promise<Variant> => {
    const { data } = await api.put(`/items/variants/${id}`, payload);
    return data;
};
export const deleteVariant = async (id: number): Promise<void> => {
    await api.delete(`/items/variants/${id}`);
};
