export default function Loading(){
 return <div className="page-skeleton" aria-busy="true" aria-label="Memuat data STOKLY" role="status">
  <div className="skeleton-topline skeleton-shimmer"/>
  <div className="skeleton-heading skeleton-shimmer"/>
  <div className="skeleton-subheading skeleton-shimmer"/>
  <div className="skeleton-cards">{[0,1,2,3].map(x=><div key={x} className="skeleton-card">
   <div className="skeleton-shimmer skeleton-card-label"/><div className="skeleton-shimmer skeleton-card-value"/></div>)}</div>
  <div className="skeleton-section"><div className="skeleton-shimmer skeleton-section-title"/>{[0,1,2,3].map(x=><div className="skeleton-row skeleton-shimmer" key={x}/>)}</div>
  <span className="sr-only">Memuat halaman. Navigasi tetap dapat digunakan.</span>
 </div>;
}
