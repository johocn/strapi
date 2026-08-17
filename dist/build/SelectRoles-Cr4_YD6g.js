import{sk as p,s9 as d,ra as g,n7 as e,af as u,qc as m,e as f,lC as h,rB as x,gX as i,oB as C,hf as j,fb as M,m8 as b,b2 as k}from"./strapi-Brjxdcdt.js";import{u as y}from"./useAdminRoles-CHA3IUA1.js";const v=({children:a,target:t})=>{const{toggleNotification:n}=p(),{formatMessage:o}=d(),{copy:r}=g(),l=o({id:"app.component.CopyToClipboard.label",defaultMessage:"Copy to clipboard"}),c=async s=>{s.preventDefault(),await r(t)&&n({type:"info",message:o({id:"notification.link-copied"})})};return e.jsx(u,{endAction:e.jsx(m,{label:l,variant:"ghost",onClick:c,children:e.jsx(f,{})}),title:t,titleEllipsis:!0,subtitle:a,icon:e.jsx("span",{style:{fontSize:32},children:"✉️"}),iconBackground:"neutral100"})},w=({registrationToken:a})=>{const{formatMessage:t}=d(),n=`${window.location.origin}${h()}/auth/register?registrationToken=${a}`;return e.jsx(v,{target:n,children:t({id:"app.components.Users.MagicLink.connect",defaultMessage:"Copy and share this link to give access to this user"})})},U=({disabled:a})=>{const{isLoading:t,roles:n}=y(),{formatMessage:o}=d(),{value:r=[],onChange:l,error:c}=x("roles");return e.jsxs(i.Root,{error:c,hint:o({id:"app.components.Users.ModalCreateBody.block-title.roles.description",defaultMessage:"A user can have one or several roles"}),name:"roles",required:!0,children:[e.jsx(i.Label,{children:o({id:"app.components.Users.ModalCreateBody.block-title.roles",defaultMessage:"User's roles"})}),e.jsx(C,{disabled:a,onChange:s=>{l("roles",s)},placeholder:o({id:"app.components.Select.placeholder",defaultMessage:"Select"}),startIcon:t?e.jsx(S,{}):void 0,value:r.map(s=>s.toString()),withTags:!0,children:n.map(s=>e.jsx(j,{value:s.id.toString(),children:o({id:`global.${s.code}`,defaultMessage:s.name})},s.id))}),e.jsx(i.Error,{}),e.jsx(i.Hint,{})]})},L=k`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`,B=b.div`
  animation: ${L} 2s infinite linear;
`,S=()=>e.jsx(B,{children:e.jsx(M,{})});export{w as M,U as S,v as a};
