import {redirect} from "next/navigation";
// Staff approvals are no longer needed; Admin and Marketing are open rooms.
export default function OldDeviceApprovals(){
 redirect("/dashboard");
}
