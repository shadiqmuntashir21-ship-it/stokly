-- Development-only transactional database sanity test.
-- All test writes are rolled back through a caught exception subtransaction.
DO $$
DECLARE
  actor_id text := 'stokly-smoke-test';
  item_id uuid;
  receive_id uuid;
  sale_id uuid;
  return_id uuid;
  issue_id uuid;
  balance integer;
BEGIN
  BEGIN
    INSERT INTO "user"("id","name","email","emailVerified")
      VALUES (actor_id,'Smoke Tester','smoke+stokly@example.invalid',false);
    INSERT INTO user_roles(user_id,role) VALUES(actor_id,'admin');
    INSERT INTO products(sku,name,category,price,min_stock)
      VALUES('TEST-SMOKE-SKU','Testing Product','Tests',25000,2) RETURNING id INTO item_id;
    INSERT INTO inventory_balances(product_id,quantity) VALUES(item_id,10);
    INSERT INTO goods_receipts(created_by,note)
      VALUES(actor_id,'Test incoming stock') RETURNING id INTO receive_id;
    INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id)
      VALUES(item_id,10,'receipt',receive_id,actor_id);

    UPDATE inventory_balances SET quantity=quantity-3 WHERE product_id=item_id;
    INSERT INTO sales(created_by,idempotency_key,total,status)
      VALUES(actor_id,'test-idempotency',75000,'completed') RETURNING id INTO sale_id;
    INSERT INTO sale_items(sale_id,product_id,quantity,unit_price)
      VALUES(sale_id,item_id,3,25000);
    INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id)
      VALUES(item_id,-3,'sale',sale_id,actor_id);

    INSERT INTO sale_returns(sale_id,product_id,quantity,restock,note,created_by)
      VALUES(sale_id,item_id,2,true,'Return test',actor_id) RETURNING id INTO return_id;
    UPDATE inventory_balances SET quantity=quantity+2 WHERE product_id=item_id;
    INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id)
      VALUES(item_id,2,'return',return_id,actor_id);

    INSERT INTO goods_issues(product_id,quantity,reason,created_by)
      VALUES(item_id,4,'Testing outgoing stock',actor_id) RETURNING id INTO issue_id;
    UPDATE inventory_balances SET quantity=quantity-4 WHERE product_id=item_id;
    INSERT INTO stock_movements(product_id,quantity_delta,source_type,source_id,actor_id)
      VALUES(item_id,-4,'adjustment',issue_id,actor_id);

    SELECT quantity INTO balance FROM inventory_balances WHERE product_id=item_id;
    IF balance <> 5 THEN
      RAISE EXCEPTION 'Stock mismatch: expected 5, found %',balance;
    END IF;

    BEGIN
      UPDATE inventory_balances SET quantity=-1 WHERE product_id=item_id;
      RAISE EXCEPTION 'A negative stock balance was incorrectly accepted';
    EXCEPTION
      WHEN check_violation THEN NULL;
    END;

    SELECT quantity INTO balance FROM inventory_balances WHERE product_id=item_id;
    IF balance <> 5 THEN
      RAISE EXCEPTION 'Negative stock test changed persisted balance';
    END IF;
    -- Roll back every test write, without hiding other test failures.
    RAISE EXCEPTION USING ERRCODE='ZX001', MESSAGE='Rollback test data';
  EXCEPTION
    WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $$;
