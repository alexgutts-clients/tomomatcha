-- ============================================================================
-- Endurecimiento de permisos sobre las funciones
-- ----------------------------------------------------------------------------
-- Postgres concede EXECUTE a PUBLIC por omisión, y todos los roles heredan de
-- PUBLIC. Revocar sólo a `anon` y `authenticated` no bastaba: seguían pudiendo
-- invocar las funciones (aunque fallaran por falta de permisos sobre las
-- tablas). Aquí se quita el permiso de raíz y se concede sólo a los roles del
-- servidor.
-- ============================================================================

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'create_order(jsonb, uuid)',
    'close_cash(numeric, text, uuid)',
    'cancel_order(uuid, uuid)',
    'adjust_stock(uuid, numeric, movement_reason, uuid, text)',
    'adjust_points(uuid, integer, text, uuid)',
    'business_day(timestamptz)',
    'set_updated_at()'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon, authenticated', fn);
    execute format('grant execute on function %s to service_role, postgres', fn);
  end loop;
end $$;

-- Y que las tablas o funciones que se creen en el futuro tampoco queden
-- abiertas por omisión.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from public;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
