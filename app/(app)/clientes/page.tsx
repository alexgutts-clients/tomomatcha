import { redirect } from "next/navigation";
import { CustomersModule } from "@/components/modules/customers";
import { SHOW_LEALTAD_UI } from "@/lib/feature-visibility";

export default function Page() {
  // El módulo de clientes y lealtad está oculto temporalmente.
  if (!SHOW_LEALTAD_UI) redirect("/inicio");
  return <CustomersModule />;
}
