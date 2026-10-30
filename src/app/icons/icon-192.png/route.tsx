import { ImageResponse } from "next/og";
export const runtime = "edge";
export function GET() {
 return new ImageResponse(
  <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#123e3a",borderRadius:38,color:"white",fontSize:115,fontWeight:800,fontFamily:"Arial,sans-serif",letterSpacing:"-0.08em"}}>
   S<span style={{color:"#9ee2bd"}}>.</span>
  </div>,
  {width:192,height:192}
 );
}
