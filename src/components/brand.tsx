export function BrandLockup({compact=false,inverse=false}:{compact?:boolean;inverse?:boolean}){
 return <div className={"brand-lockup "+(compact?"brand-compact ":"")+(inverse?"brand-inverse":"")}>
  <span className="brand-image-wrap"><img src="/brand/kelapa-go-symbol.svg" width="72" height="72" alt="Logo KELAPA GO" loading="eager" decoding="async"/></span>
  <span className="brand-name"><strong>KELAPA <span className="brand-go">GO</span></strong>
   <small>SISTEM OPERASIONAL BISNIS</small>
  </span>
 </div>;
}
