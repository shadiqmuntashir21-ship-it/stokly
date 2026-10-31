export function BrandLockup({compact=false,inverse=false}:{compact?:boolean;inverse?:boolean}){
 return <div className={"brand-lockup "+(compact?"brand-compact ":"")+(inverse?"brand-inverse":"")}>
  <span className="brand-image-wrap"><img src="/brand/kelapa-brand.webp" width="64" height="71" alt="Logo asli Kelapa Branding Indonesia" loading="eager" decoding="async"/></span>
  <span className="brand-name"><strong>STOKLY<span className="brand-dot">.</span></strong>
   <small>BY KELAPA BRANDING INDONESIA</small>
  </span>
 </div>;
}
