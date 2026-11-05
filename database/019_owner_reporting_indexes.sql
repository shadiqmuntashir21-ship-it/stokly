-- Owner reporting and yearly archives: supporting indexes.
CREATE INDEX IF NOT EXISTS idx_v4_owner_delivery_order_day ON delivery_notes(order_id,delivered_on);
CREATE INDEX IF NOT EXISTS idx_v4_owner_payments_date ON delivery_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_v4_owner_returns_delivery ON delivery_returns(delivery_id);
CREATE INDEX IF NOT EXISTS idx_v4_owner_expense_date ON expense_entries(incurred_on);
CREATE INDEX IF NOT EXISTS idx_v4_owner_coconut_receipts_date ON coconut_receipts(received_at);
CREATE INDEX IF NOT EXISTS idx_v4_owner_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_v4_owner_outlet_orders ON customer_orders(outlet_id,ordered_on DESC);
CREATE INDEX IF NOT EXISTS idx_v4_owner_refunds_delivery_status ON delivery_refund_obligations(delivery_id,status);
