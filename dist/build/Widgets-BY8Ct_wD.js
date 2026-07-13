import{iI as w,gS as e,cx as n,gZ as C,aF as o,b9 as v,ke as L,jL as m,jo as M,jt as I,fv as T,fb as D,kA as S,g1 as l,h5 as W,gR as A,ax as N,a$ as $,d8 as K,kN as R,fu as E,bq as G,b$ as p,b3 as P}from"./strapi-Bwkex2iT.js";import{W as u}from"./WidgetHelpers-CTKX1w1q.js";import{g as z,a as F}from"./users-DLc-PG84.js";const H=l(o)`
  font-size: 2.4rem;
`,J=()=>{const t=w("User",s=>s.user),i=z(t),c=F(t);return e.jsxs(n,{direction:"column",gap:3,height:"100%",justifyContent:"center",children:[e.jsx(C.Item,{delayMs:0,fallback:c}),i&&e.jsx(H,{fontWeight:"bold",textTransform:"none",textAlign:"center",children:i}),t?.email&&e.jsx(o,{variant:"omega",textColor:"neutral600",children:t?.email}),t?.roles?.length&&e.jsx(n,{marginTop:2,gap:1,wrap:"wrap",children:t?.roles?.map(s=>e.jsx(v,{children:s.name},s.id))})]})},O=l(p)`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  border: 1px solid ${({theme:t})=>t.colors.neutral200};
  border-radius: ${({theme:t})=>t.borderRadius};
  overflow: hidden;
`,Q=l(p)`
  border-bottom: 1px solid ${({theme:t})=>t.colors.neutral200};
  border-right: 1px solid ${({theme:t})=>t.colors.neutral200};
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  &:nth-child(2n) {
    border-right: none;
  }
  &:nth-last-child(-n + 2) {
    border-bottom: none;
  }
`,U=({locale:t,number:i})=>new Intl.NumberFormat(t,{notation:"compact",maximumFractionDigits:1}).format(i),q=l(P)`
  text-decoration: none;
  padding: ${({theme:t})=>t.spaces[3]};
`,V=()=>{const{trackUsage:t}=L(),{formatMessage:i,locale:c}=m(),{data:s,isLoading:x}=M(),{data:d,isLoading:b}=I();if(b||x)return e.jsx(u.Loading,{});if(!d||!s)return e.jsx(u.Error,{});const h={entries:{label:{id:"widget.key-statistics.list.entries",defaultMessage:"Entries"},icon:{component:e.jsx(G,{}),background:"primary100",color:"primary600"},link:"/content-manager"},assets:{label:{id:"widget.key-statistics.list.assets",defaultMessage:"Assets"},icon:{component:e.jsx(E,{}),background:"warning100",color:"warning600"},link:"/plugins/upload"},contentTypes:{label:{id:"widget.key-statistics.list.contentTypes",defaultMessage:"Content-Types"},icon:{component:e.jsx(R,{}),background:"secondary100",color:"secondary600"},link:"/plugins/content-type-builder"},components:{label:{id:"widget.key-statistics.list.components",defaultMessage:"Components"},icon:{component:e.jsx(K,{}),background:"alternative100",color:"alternative600"},link:"/plugins/content-type-builder"},locales:{label:{id:"widget.key-statistics.list.locales",defaultMessage:"Locales"},icon:{component:e.jsx($,{}),background:"success100",color:"success600"},link:"/settings/internationalization"},admins:{label:{id:"widget.key-statistics.list.admins",defaultMessage:"Admins"},icon:{component:e.jsx(N,{}),background:"danger100",color:"danger600"},link:"/settings/users?pageSize=10&page=1&sort=firstname"},webhooks:{label:{id:"widget.key-statistics.list.webhooks",defaultMessage:"Webhooks"},icon:{component:e.jsx(A,{}),background:"alternative100",color:"alternative600"},link:"/settings/webhooks"},apiTokens:{label:{id:"widget.key-statistics.list.apiTokens",defaultMessage:"API Tokens"},icon:{component:e.jsx(W,{}),background:"neutral100",color:"neutral600"},link:"/settings/api-tokens?sort=name:ASC"}},{draft:f,published:k,modified:y}=s??{draft:0,published:0,modified:0},j=f+k+y;return e.jsx(O,{children:Object.entries(h).map(([a,r])=>{const g=d?.[a];return g!==null&&e.jsx(Q,{as:q,to:r.link,"data-testid":`stat-${a}`,onClick:()=>t("didOpenKeyStatisticsWidgetLink",{itemKey:a}),children:e.jsxs(n,{alignItems:"center",gap:2,children:[e.jsx(n,{padding:2,borderRadius:1,background:r.icon.background,color:r.icon.color,children:r.icon.component}),e.jsxs(n,{direction:"column",alignItems:"flex-start",children:[e.jsx(o,{variant:"pi",fontWeight:"bold",textColor:"neutral500",children:i(r.label)}),e.jsx(o,{variant:"omega",fontWeight:"bold",textColor:"neutral800",children:U({locale:c,number:a==="entries"?j:g})})]})]})},`key-statistics-${a}`)})})},X=()=>{const{formatMessage:t}=m();return e.jsxs(n,{direction:"column",gap:4,height:"100%",alignItems:"center",justifyContent:"center",children:[e.jsx(T,{width:"3.2rem",height:"3.2rem"}),e.jsxs(n,{direction:"column",gap:2,children:[e.jsx(o,{variant:"beta",textAlign:"center",children:t({id:"HomePage.widget.deploy-now.title",defaultMessage:"Ready to go live ?"})}),e.jsx(o,{variant:"omega",textColor:"neutral600",textAlign:"center",children:t({id:"HomePage.widget.deploy-now.description",defaultMessage:"Deploy with Strapi Cloud"})})]}),e.jsx(D,{href:"https://cloud.strapi.io/login",isExternal:!0,size:"L",startIcon:e.jsx(S,{}),children:t({id:"HomePage.widget.deploy-now.button",defaultMessage:"Deploy Now"})})]})};export{X as DeployNowWidget,V as KeyStatisticsWidget,J as ProfileWidget};
