/* ============================================================================
 * Tipos de las tablas de Supabase.
 *
 * Espejo del esquema de `supabase/migrations/`. Se escribe a mano (en lugar de
 * volcar el archivo generado completo) para que el contrato con la base quede
 * legible y revisable en el mismo repositorio.
 *
 * Al cambiar una migración, actualizar también este archivo.
 * ========================================================================== */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRoleDb = "admin" | "empleado";
export type UnitDb = "g" | "ml" | "pza";
export type CategoryDb = "matcha" | "cafe" | "te" | "bakery";
export type OrderStatusDb =
  | "nuevo"
  | "preparando"
  | "listo"
  | "entregado"
  | "cancelado";
export type PaymentDb = "efectivo" | "tarjeta" | "mercadopago";
export type ServiceModeDb = "aqui" | "llevar";
export type MovementReasonDb =
  | "venta"
  | "ajuste"
  | "entrada"
  | "merma"
  | "cancelacion";

export type StaffRow = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  full_name: string | null;
  image_url: string | null;
  role: StaffRoleDb;
  active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SettingsRow = {
  id: number;
  business_name: string;
  branch_name: string;
  timezone: string;
  currency: string;
  logo_key: string | null;
  cash_float: number;
  points_per_currency: number;
  reward_cost: number;
  flag_inventario: boolean;
  flag_lealtad: boolean;
  flag_resenas_google: boolean;
  flag_mercadopago: boolean;
  google_review_url: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  next_folio: number;
  catalog_seeded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type IngredientRow = {
  id: string;
  name: string;
  unit: UnitDb;
  stock: number;
  min_stock: number;
  weekly_use: number;
  active: boolean;
  /** Vasos, tapas, servilletas: solo se gastan en pedidos para llevar */
  is_packaging: boolean;
  /** Nivel objetivo de resurtido; permite fijar el umbral como porcentaje */
  par_level: number | null;
  created_at: string;
  updated_at: string;
}

export type MilkOptionRow = {
  id: string;
  name: string;
  surcharge: number;
  ingredient_id: string | null;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ExtraRow = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ExtraRecipeItemRow = {
  id: string;
  extra_id: string;
  ingredient_id: string;
  qty: number;
}

export type ProductRow = {
  id: string;
  name: string;
  category: CategoryDb;
  price: number;
  description: string;
  emoji: string;
  image_key: string | null;
  active: boolean;
  popular: boolean;
  sort_order: number;
  mod_milk: boolean;
  mod_sweetness: boolean;
  mod_temperature: boolean;
  mod_extras: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductRecipeItemRow = {
  id: string;
  product_id: string;
  ingredient_id: string | null;
  is_milk: boolean;
  qty: number;
}

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  points: number;
  visits: number;
  card_token: string;
  since: string;
  last_visit: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderRow = {
  id: string;
  folio: number;
  subtotal: number;
  discount_pct: number;
  discount_label: string | null;
  tip: number;
  total: number;
  payment: PaymentDb;
  status: OrderStatusDb;
  service_mode: ServiceModeDb;
  cash_received: number | null;
  customer_id: string | null;
  customer_name: string | null;
  points_earned: number | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  delivered_at: string | null;
  updated_at: string;
}

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  emoji: string;
  image_key: string | null;
  qty: number;
  unit_price: number;
  mods_price: number;
  modifiers: Json;
  line_no: number;
}

export type InventoryMovementRow = {
  id: string;
  ingredient_id: string;
  delta: number;
  stock_after: number;
  reason: MovementReasonDb;
  order_id: string | null;
  staff_id: string | null;
  note: string | null;
  created_at: string;
}

export type LoyaltyTransactionRow = {
  id: string;
  customer_id: string;
  points: number;
  balance_after: number;
  reason: string;
  order_id: string | null;
  staff_id: string | null;
  created_at: string;
}

export type CashCloseRow = {
  id: string;
  date_key: string;
  closed_at: string;
  expected_cash: number;
  expected_card: number;
  counted_cash: number;
  difference: number;
  tips_cash: number;
  tips_total: number;
  orders_count: number;
  notes: string | null;
  closed_by: string | null;
  closed_by_name: string;
  created_at: string;
}

export type PreparedItemRow = {
  id: string;
  name: string;
  qty: number;
  unit: UnitDb;
  produced_on: string;
  expires_on: string;
  notes: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  discarded_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MediaAssetRow = {
  id: string;
  object_key: string;
  bucket: string;
  purpose: string;
  content_type: string;
  size_bytes: number;
  original_name: string | null;
  uploaded_by: string | null;
  created_at: string;
}

type Table<Row extends Record<string, unknown>, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

// `type` y no `interface`: supabase-js necesita que el esquema tenga índice
// implícito de cadena, y las interfaces de TypeScript no lo obtienen.
export type Database = {
  __InternalSupabase: { PostgrestVersion: "14" };
  public: {
    Tables: {
      staff: Table<StaffRow, "clerk_user_id">;
      settings: Table<SettingsRow, "id">;
      ingredients: Table<IngredientRow, "name">;
      milk_options: Table<MilkOptionRow, "name">;
      extras: Table<ExtraRow, "name">;
      extra_recipe_items: Table<
        ExtraRecipeItemRow,
        "extra_id" | "ingredient_id" | "qty"
      >;
      products: Table<ProductRow, "name">;
      product_recipe_items: Table<ProductRecipeItemRow, "product_id" | "qty">;
      customers: Table<CustomerRow, "name">;
      orders: Table<OrderRow, "folio">;
      order_items: Table<OrderItemRow, "order_id" | "name" | "qty">;
      inventory_movements: Table<
        InventoryMovementRow,
        "ingredient_id" | "delta" | "stock_after"
      >;
      loyalty_transactions: Table<
        LoyaltyTransactionRow,
        "customer_id" | "points" | "balance_after"
      >;
      cash_closes: Table<CashCloseRow, "date_key">;
      media_assets: Table<MediaAssetRow, "object_key">;
      prepared_items: Table<PreparedItemRow, "name" | "expires_on">;
    };
    Views: { [_ in never]: never };
    Functions: {
      business_day: { Args: { at?: string }; Returns: string };
      create_order: {
        Args: { payload: Json; p_staff_id?: string | null };
        Returns: string;
      };
      cancel_order: {
        Args: { p_order_id: string; p_staff_id?: string | null };
        Returns: undefined;
      };
      /** Borra la venta de verdad; devuelve el folio que tenía. */
      delete_order: {
        Args: { p_order_id: string; p_staff_id?: string | null };
        Returns: number;
      };
      close_cash: {
        Args: {
          p_counted: number;
          p_notes: string | null;
          p_staff_id: string | null;
        };
        Returns: string;
      };
      adjust_stock: {
        Args: {
          p_ingredient_id: string;
          p_delta: number;
          p_reason: MovementReasonDb;
          p_staff_id: string | null;
          p_note?: string | null;
        };
        Returns: number;
      };
      adjust_points: {
        Args: {
          p_customer_id: string;
          p_points: number;
          p_reason: string;
          p_staff_id: string | null;
        };
        Returns: number;
      };
    };
    Enums: {
      staff_role: StaffRoleDb;
      service_mode: ServiceModeDb;
      unit_type: UnitDb;
      category_id: CategoryDb;
      order_status: OrderStatusDb;
      payment_method: PaymentDb;
      movement_reason: MovementReasonDb;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
