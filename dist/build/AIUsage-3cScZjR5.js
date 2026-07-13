import{jL as j,jj as p,gS as e,aF as i,cx as n,g1 as g,cN as v,f3 as f}from"./strapi-Bwkex2iT.js";const d=g(f)`
  width: 100%;
  background-color: ${({theme:s})=>s.colors.neutral200};
  > div {
    background-color: ${({theme:s})=>s.colors.neutral700};
  }
`,b=g(v.Item)`
  ${({theme:s})=>s.breakpoints.large} {
    grid-column: 7 / 13;
  }
`,I=()=>{const{formatMessage:s}=j(),{data:r,isLoading:u,error:m}=p(void 0,{refetchOnMountOrArgChange:!0});if(u||m||!r||!r.subscription?.cmsAiEnabled)return null;const t=r.subscription.cmsAiCreditsBase,a=r.cmsAiCreditsUsed,o=r.subscription.cmsAiCreditsMaxUsage,c=a-t,x=a/t*100,h=a/o*100,l=c>0&&o!==t;return e.jsxs(b,{col:6,s:12,direction:"column",alignItems:"start",gap:2,children:[e.jsx(i,{variant:"sigma",textColor:"neutral600",children:s({id:"Settings.application.ai-usage",defaultMessage:"AI Usage"})}),e.jsxs(n,{gap:2,direction:"column",alignItems:"flex-start",children:[!l&&e.jsxs(e.Fragment,{children:[e.jsx(n,{width:"100%",children:e.jsx(d,{value:x,size:"M"})}),e.jsx(i,{variant:"omega",children:`${a.toFixed(2)} credits used from ${t} credits available in your plan`})]}),l&&e.jsxs(e.Fragment,{children:[e.jsx(n,{width:"100%",children:e.jsx(d,{value:h,size:"M",color:"danger"})}),e.jsx(i,{variant:"omega",textColor:"danger600",children:`${c.toFixed(2)} credits used above the ${t} credits available in your plan`})]})]})]})};export{I as AIUsage};
