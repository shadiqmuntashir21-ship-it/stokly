import { requireActor } from "@/lib/access";
import { query } from "@/lib/db";
import { ChangePinForm } from "@/components/change-pin-form";
import { PageHead, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AccountSecurity() {
  const actor = await requireActor(["owner"]);
  const rows = await query<{username:string|null}>(
    'SELECT username FROM "user" WHERE id=$1 LIMIT 1', [actor.id]
  );
  return <>
    <PageHead eyebrow="PENGATURAN / KEAMANAN" title="Ganti PIN Owner"
      description="Perbarui PIN Owner untuk melindungi akses seluruh bisnis."/>
    <Panel title="Keamanan Akun" detail={rows[0]?.username ? "Username: " + rows[0].username : "Akun pribadi"}>
      <ChangePinForm />
    </Panel>
  </>;
}
