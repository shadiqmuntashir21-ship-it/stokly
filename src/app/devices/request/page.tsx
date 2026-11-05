import {redirect} from "next/navigation";
// Old approval link redirects to free staff room selection.
export default function LegacyDeviceRequest(){
 redirect("/rooms");
}
