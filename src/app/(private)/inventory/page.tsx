import {requireActor} from "@/lib/access";
import {query} from "@/lib/db";
import {PageHead,Panel,Notice,rupiah} from "@/components/ui";
import {SubmitButton} from "@/components/submit-button";
import {InventoryMovementForm} from "@/components/inventory-movement-form";
import {InventorySearch} from "@/components/inventory-search";
import {newAssetAction,assetMovementAction} from "../go-actions";
export const dynamic="force-dynamic";
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Makassar",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
type Asset={id:string;name:string;quantity:number;unit_price:string|null;total_cost:string|null;loaned:number;damaged:number};
type Movement={movement_date:string;kind:string;quantity:number;asset:string;outlet:string|null};
type Basket={source_row:number;basket_type:string|null;outlet_name:string|null;quantity:number|null;reported_balance:number|null;note:string|null};
export default async function Inventory({searchParams}:{searchParams:Promise<{success?:string;error?:string}>}){
 await requireActor(["owner","admin"]);
 const [assets,moves,old,outlets,p]=await Promise.all([
  query<Asset>("SELECT a.id::text,a.name,a.quantity,a.unit_price::text,a.total_cost::text,COALESCE((SELECT SUM(CASE WHEN kind='OUT' THEN quantity WHEN kind='RETURN' THEN -quantity ELSE 0 END) FROM inventory_asset_movements m WHERE m.asset_id=a.id),0)::int loaned,COALESCE((SELECT SUM(quantity) FROM inventory_asset_movements m WHERE m.asset¶»§q«^