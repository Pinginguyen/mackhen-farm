CREATE OR REPLACE FUNCTION audit_order_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_id TEXT;
  old_data JSONB;
  new_data JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.id::text;
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSE
    target_id := NEW.id::text;
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  END IF;

  INSERT INTO "AuditLog" (
    "id",
    "adminEmail",
    "action",
    "targetEntity",
    "targetId",
    "oldValue",
    "newValue"
  ) VALUES (
    gen_random_uuid()::text,
    'system:database-trigger',
    'TRIGGER_' || TG_OP,
    TG_TABLE_NAME,
    target_id,
    old_data,
    new_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_audit_trigger ON "Order";
CREATE TRIGGER order_audit_trigger
AFTER UPDATE OR DELETE ON "Order"
FOR EACH ROW EXECUTE FUNCTION audit_order_product_changes();

DROP TRIGGER IF EXISTS product_audit_trigger ON "Product";
CREATE TRIGGER product_audit_trigger
AFTER UPDATE OR DELETE ON "Product"
FOR EACH ROW EXECUTE FUNCTION audit_order_product_changes();