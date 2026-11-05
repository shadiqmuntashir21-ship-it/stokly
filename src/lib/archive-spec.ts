// Tables deliberately exclude authentication sessions, Owner PIN, tokens, and device secrets.
// A yearly archive is grouped by the original transaction's year; dependent records may be newer.
const fy=(col:string)=>"("+col+">=make_date($1::int,1,1) AND "+col+"<make_date($1::int+1,1,1))";
const ts=(col:string)=>fy("("+col+" AT TIME ZONE 'Asia/Makassar')::date");
const orders=fy("o.ordered_on");
const delivery="d.order_id IN(SELECT o.id FROM customer_orders o WHERE "+orders+")";
const receipts=ts("r.received_at");
const batches="b.receipt_id IN(SELECT r.id FROM coconut_receipts r WHERE "+receipts+")";
const production="p.batch_id IN(SELECT b.id FROM coconut_batches b WHERE "+batches+")";
const route=fy("r.route_date");
const sales=ts("s.created_at");
const visit=fy("v.visited_on");
const expense=fy("e.incurred_on");

export const datasets:{file:string;sql:string;master?:boolean}[]=[
 {file:"master_suppliers",sql:"SELECT * FROM suppliers",master:true},
 {file:"master_outlets",sql:"SELECT * FROM outlets",master:true},
 {file:"master_outlet_groups",sql:"SELECT * FROM outlet_groups",master:true},
 {file:"master_products",sql:"SELECT * FROM products",master:true},
 {file:"master_grades",sql:"SELECT * FROM coconut_grades",master:true},
 {file:"master_expense_categories",sql:"SELECT * FROM expense_categories",master:true},
 {file:"current_inventory_snapshot",sql:"SELECT * FROM inventory_balances",master:true},
 {file:"current_receipt_counter_snapshot",sql:"SELECT * FROM receipt_number_settings",master:true},
 {file:"orders",sql:"SELECT o.* FROM customer_orders o WHERE "+orders},
 {file:"order_items",sql:"SELECT i.* FROM customer_order_items i JOIN customer_orders o ON o.id=i.order_id WHERE "+orders},
 {file:"order_price_overrides",sql:"SELECT r.* FROM order_price_overrides r JOIN customer_order_items i ON i.id=r.order_item_id JOIN customer_orders o ON o.id=i.order_id WHERE "+orders},
 {file:"order_audit",sql:"SELECT a.* FROM order_audit_events a JOIN customer_orders o ON o.id=a.order_id WHERE "+orders},
 {file:"receipt_reconciliations",sql:"SELECT r.* FROM receipt_number_reconciliations r JOIN customer_orders o ON o.id=r.order_id WHERE "+orders},
 {file:"delivery_notes",sql:"SELECT d.* FROM delivery_notes d WHERE "+delivery},
 {file:"delivery_items",sql:"SELECT i.* FROM delivery_note_items i JOIN delivery_notes d ON d.id=i.delivery_id WHERE "+delivery},
 {file:"delivery_invoices",sql:"SELECT i.* FROM delivery_invoices i JOIN delivery_notes d ON d.id=i.delivery_id WHERE "+delivery},
 {file:"delivery_payments",sql:"SELECT pay.* FROM delivery_payments pay JOIN delivery_invoices i ON i.id=pay.invoice_id JOIN delivery_notes d ON d.id=i.delivery_id WHERE "+delivery},
 {file:"payment_batches",sql:"SELECT b.* FROM payment_batches b JOIN customer_orders o ON o.id=b.order_id WHERE "+orders},
 {file:"delivery_returns",sql:"SELECT r.* FROM delivery_returns r JOIN delivery_notes d ON d.id=r.delivery_id WHERE "+delivery},
 {file:"delivery_refunds",sql:"SELECT r.* FROM delivery_refund_obligations r JOIN delivery_notes d ON d.id=r.delivery_id WHERE "+delivery},
 {file:"outlet_complaints",sql:"SELECT c.* FROM outlet_complaints c WHERE "+ts("c.created_at")},
 {file:"coconut_receipts",sql:"SELECT r.* FROM coconut_receipts r WHERE "+receipts},
 {file:"coconut_batches",sql:"SELECT b.* FROM coconut_batches b WHERE "+batches},
 {file:"coconut_qc",sql:"SELECT q.* FROM coconut_qc q JOIN coconut_batches b ON b.id=q.batch_id WHERE "+batches},
 {file:"coconut_production",sql:"SELECT p.* FROM coconut_production p WHERE "+production},
 {file:"coconut_production_outputs",sql:"SELECT o.* FROM coconut_production_outputs o JOIN coconut_production p ON p.id=o.production_id WHERE "+production},
 {file:"production_cost_shares",sql:"SELECT s.* FROM production_cost_shares s JOIN coconut_production p ON p.id=s.production_id WHERE "+production},
 {file:"expense_entries",sql:"SELECT e.* FROM expense_entries e WHERE "+expense},
 {file:"marketing_visits",sql:"SELECT v.* FROM marketing_visits v WHERE "+visit},
 {file:"delivery_routes",sql:"SELECT r.* FROM delivery_routes r WHERE "+route},
 {file:"route_stops",sql:"SELECT s.* FROM delivery_route_stops s JOIN delivery_routes r ON r.id=s.route_id WHERE "+route},
 {file:"route_costs",sql:"SELECT c.* FROM delivery_route_costs c JOIN delivery_routes r ON r.id=c.route_id WHERE "+route},
 {file:"legacy_sales",sql:"SELECT s.* FROM sales s WHERE "+sales},
 {file:"legacy_sale_items",sql:"SELECT i.* FROM sale_items i JOIN sales s ON s.id=i.sale_id WHERE "+sales},
 {file:"legacy_sale_returns",sql:"SELECT r.* FROM sale_returns r JOIN sales s ON s.id=r.sale_id WHERE "+sales},
 {file:"goods_receipts",sql:"SELECT r.* FROM goods_receipts r WHERE "+ts("r.created_at")},
 {file:"goods_issues",sql:"SELECT i.* FROM goods_issues i WHERE "+ts("i.created_at")},
 {file:"stock_adjustments",sql:"SELECT a.* FROM stock_adjustments a WHERE "+ts("a.created_at")},
 {file:"stock_movements",sql:"SELECT m.* FROM stock_movements m WHERE "+ts("m.created_at")},
 {file:"product_price_history",sql:"SELECT h.* FROM product_price_history h WHERE "+ts("h.effective_at")},
 {file:"supplier_price_history",sql:"SELECT s.* FROM supplier_prices s WHERE "+ts("s.effective_at")},
 {file:"activity_log",sql:"SELECT a.* FROM activity_logs a WHERE "+ts("a.created_at")},
 {file:"daily_closeouts",sql:"SELECT d.* FROM daily_closeouts d WHERE "+fy("d.business_date")}
];
