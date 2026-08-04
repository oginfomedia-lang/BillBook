import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    bulkImportItems,
    exportBranchMapping,
    importBranchMapping,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand,
    fetchUnits,
    createUnit,
    updateUnit,
    deleteUnit,
    fetchTaxes,
    createTax,
    updateTax,
    deleteTax,
    fetchVariants,
    createVariant,
    updateVariant,
    deleteVariant,
    type Item,
    type ItemStatus,
    type ItemType,
    type CreateItemInput,
    type UpdateItemInput,
} from '../api/items';

// Query keys
export const itemKeys = {
    all: ['items'] as const,
    lists: () => [...itemKeys.all, 'list'] as const,
    list: (filters: any) => [...itemKeys.lists(), filters] as const,
    details: () => [...itemKeys.all, 'detail'] as const,
    detail: (id: number) => [...itemKeys.details(), id] as const,
    categories: () => [...itemKeys.all, 'categories'] as const,
    brands: () => [...itemKeys.all, 'brands'] as const,
    units: () => [...itemKeys.all, 'units'] as const,
    taxes: () => [...itemKeys.all, 'taxes'] as const,
    variants: () => [...itemKeys.all, 'variants'] as const,
};

/**
 * Fetch items list with optional filtering and pagination
 */
export function useItems(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    category_id?: number;
    brand_id?: number;
    warehouse_id?: number;
    status?: ItemStatus;
    type?: ItemType;
}) {
    return useQuery({
        queryKey: itemKeys.list(params),
        queryFn: () => fetchItems(params || {}),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Fetch single item by ID
 */
export function useItem(id: number, options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: itemKeys.detail(id),
        queryFn: () => fetchItem(id),
        staleTime: 1000 * 60 * 5, // 5 minutes
        ...options,
    });
}

/**
 * Create item mutation
 */
export function useCreateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateItemInput) => createItem(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
        },
        onError: (error: any) => {
            console.error('Failed to create item:', error);
        },
    });
}

/**
 * Update item mutation
 */
export function useUpdateItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: UpdateItemInput }) => updateItem(id, payload),
        onSuccess: (data) => {
            queryClient.setQueryData(itemKeys.detail(data.item.id), data.item);
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
        },
        onError: (error: any) => {
            console.error('Failed to update item:', error);
        },
    });
}

/**
 * Delete item mutation
 */
export function useDeleteItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
        },
        onError: (error: any) => {
            console.error('Failed to delete item:', error);
        },
    });
}

/**
 * Bulk import items mutation
 */
export function useBulkImportItems() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => bulkImportItems(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
        },
        onError: (error: any) => {
            console.error('Failed to import items:', error);
        },
    });
}

/**
 * Downloads a CSV of every item + its current warehouse/branch, with a
 * blank target_warehouse_id column to fill in and re-upload via
 * useImportBranchMapping -- for bulk-assigning items that pre-date
 * branch/warehouse tagging.
 */
export function useExportBranchMapping() {
    return useMutation({
        mutationFn: () => exportBranchMapping(),
    });
}

export function useImportBranchMapping() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => importBranchMapping(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
        },
    });
}


// -----------------------------------------------------------------------------
// Categories Hooks
// -----------------------------------------------------------------------------

export function useCategories() {
    return useQuery({
        queryKey: itemKeys.categories(),
        queryFn: fetchCategories,
        staleTime: 1000 * 60 * 10,
    });
}

export function useCreateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.categories() });
        },
    });
}

export function useUpdateCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { name?: string; description?: string } }) =>
            updateCategory(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.categories() });
        },
    });
}

export function useDeleteCategory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.categories() });
        },
    });
}


// -----------------------------------------------------------------------------
// Brands Hooks
// -----------------------------------------------------------------------------

export function useBrands() {
    return useQuery({
        queryKey: itemKeys.brands(),
        queryFn: fetchBrands,
        staleTime: 1000 * 60 * 10,
    });
}

export function useCreateBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.brands() });
        },
    });
}

export function useUpdateBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { name?: string; description?: string } }) =>
            updateBrand(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.brands() });
        },
    });
}

export function useDeleteBrand() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBrand,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.brands() });
        },
    });
}


// -----------------------------------------------------------------------------
// Units Hooks
// -----------------------------------------------------------------------------

export function useUnits() {
    return useQuery({
        queryKey: itemKeys.units(),
        queryFn: fetchUnits,
        staleTime: 1000 * 60 * 10,
    });
}

export function useCreateUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.units() });
        },
    });
}

export function useUpdateUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { name?: string; short_name?: string } }) =>
            updateUnit(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.units() });
        },
    });
}

export function useDeleteUnit() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteUnit,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.units() });
        },
    });
}


// -----------------------------------------------------------------------------
// Taxes Hooks
// -----------------------------------------------------------------------------

export function useTaxes() {
    return useQuery({
        queryKey: itemKeys.taxes(),
        queryFn: fetchTaxes,
        staleTime: 1000 * 60 * 10,
    });
}

export function useCreateTax() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTax,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.taxes() });
        },
    });
}

export function useUpdateTax() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { name?: string; tax_value?: number } }) =>
            updateTax(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.taxes() });
        },
    });
}

export function useDeleteTax() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTax,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.taxes() });
        },
    });
}


// -----------------------------------------------------------------------------
// Variants Hooks
// -----------------------------------------------------------------------------

export function useVariants() {
    return useQuery({
        queryKey: itemKeys.variants(),
        queryFn: fetchVariants,
        staleTime: 1000 * 60 * 10,
    });
}

export function useCreateVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.variants() });
        },
    });
}

export function useUpdateVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: { name?: string; description?: string } }) =>
            updateVariant(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.variants() });
        },
    });
}

export function useDeleteVariant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: itemKeys.variants() });
        },
    });
}
