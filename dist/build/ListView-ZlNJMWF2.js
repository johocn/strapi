import{n7 as e,m8 as y,f9 as p,lA as O,s9 as F,f_ as x,c2 as $,X as Ce,pE as R,q5 as L,qc as U,gP as Te,dq as we,lQ as ve,gV as Y,df as ee,q$ as Z,j_ as ke,i6 as te,jN as $e,iS as De,ae as Me,H as Re,u1 as Se,cJ as Ae,cL as Fe,qG as ne,uc as P,pD as Ie,sj as Ee,su as Le,fF as Oe,sl as Ne,e0 as z,pt as Ue,dd as oe}from"./strapi-Brjxdcdt.js";import{a as D,g as m,C as J,b as q,A as Pe,S as Be,c as X,u as ie}from"./index-DOU2GMV0.js";import{e as Ve,d as Q,D as ze,c as We,a as Ze,S as qe,v as He,s as _e,K as Ge,P as Ke,f as Je,C as Xe}from"./sortable.esm-C94Vi6by.js";import"./index-CKqltb20.js";import"./groupBy-WYReUSUm.js";import"./_baseEach-C8aMWPRH.js";import"./sortBy-DXOb9C3u.js";import"./_baseMap-DegHgGqM.js";import"./index-qzASUJw9.js";import"./index-BRVyLNfZ.js";const Qe=t=>{let{transform:n}=t;return{...n,x:0}},Ye=y(p)`
  position: absolute;
  left: -3.4rem;
  top: 0px;

  &:before {
    content: '';
    width: 0.4rem;
    height: 1.2rem;
    background: ${({theme:t,color:n})=>t.colors[n]};
    display: block;
  }
`,et=y.svg`
  position: relative;
  flex-shrink: 0;
  transform: translate(-0.5px, -1px);

  * {
    fill: ${({theme:t,color:n})=>t.colors[n]};
  }
`,tt=t=>e.jsx(Ye,{...t,children:e.jsx(et,{width:"20",height:"23",viewBox:"0 0 20 23",fill:"none",xmlns:"http://www.w3.org/2000/svg",...t,children:e.jsx("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M7.02477 14.7513C8.65865 17.0594 11.6046 18.6059 17.5596 18.8856C18.6836 18.9384 19.5976 19.8435 19.5976 20.9688V20.9688C19.5976 22.0941 18.6841 23.0125 17.5599 22.9643C10.9409 22.6805 6.454 20.9387 3.75496 17.1258C0.937988 13.1464 0.486328 7.39309 0.486328 0.593262H4.50974C4.50974 7.54693 5.06394 11.9813 7.02477 14.7513Z"})})}),nt=t=>{let n;switch(t){case"date":case"datetime":case"time":case"timestamp":n="date";break;case"integer":case"biginteger":case"decimal":case"float":n="number";break;case"string":case"text":n="text";break;case"":n="relation";break;default:n=t}return n},se=y(p)`
  &.component-row,
  &.dynamiczone-row {
    position: relative;

    > ul:first-of-type {
      padding: 0 0 0 104px;
      position: relative;

      &::before {
        content: '';
        width: 0.4rem;
        height: ${({$isFromDynamicZone:t})=>t?"calc(100% - 65px)":"calc(100%)"};
        position: absolute;
        left: 7rem;
        border-radius: 4px;

        ${({$isFromDynamicZone:t,$isChildOfDynamicZone:n,theme:o})=>n?`background-color: ${o.colors.primary200};`:t?`background-color: ${o.colors.primary200};`:`background: ${o.colors.neutral150};`}
      }
    }
  }

  &.dynamiczone-row > ul:first-of-type {
    padding: 0;
  }
`,ae=({component:t,isFromDynamicZone:n=!1,firstLoopComponentUid:o})=>{const{components:s}=D(),r=O(s,t);if(r)return e.jsx(se,{$isChildOfDynamicZone:n,className:"component-row",children:e.jsx(ue,{type:r,firstLoopComponentUid:o||t,isFromDynamicZone:n,isSub:!0,secondLoopComponentUid:o?t:null})})},ot=({type:t,customField:n=null,repeatable:o=!1,multiple:s=!1})=>{const{formatMessage:r}=F();let l=t;return["integer","biginteger","float","decimal"].includes(t)?l="number":["string"].includes(t)&&(l="text"),n?r({id:m("attribute.customField"),defaultMessage:"Custom field"}):e.jsxs(e.Fragment,{children:[o&&r({id:m("component.repeatable"),defaultMessage:"Repeatable"}),s&&r({id:m("media.multiple"),defaultMessage:"Multiple"})," ",r({id:m(`attribute.${l}`),defaultMessage:t})]})},it=({isActive:t=!1,icon:n="dashboard"})=>{const o=J[n]||J.dashboard;return e.jsx(x,{alignItems:"center",background:t?"primary200":"neutral200",justifyContent:"center",height:8,width:8,borderRadius:"50%",children:e.jsx(o,{height:"2rem",width:"2rem"})})},re=y(p)`
  position: absolute;
  display: none;
  top: 5px;
  right: 0.8rem;

  svg {
    width: 1rem;
    height: 1rem;

    path {
      fill: ${({theme:t})=>t.colors.primary600};
    }
  }
`,st=y(x)`
  width: 14rem;
  height: 8rem;
  position: relative;
  border: 1px solid ${({theme:t})=>t.colors.neutral200};
  background: ${({theme:t})=>t.colors.neutral100};
  border-radius: ${({theme:t})=>t.borderRadius};
  max-width: 100%;

  &.active,
  &:focus,
  &:hover {
    border: 1px solid ${({theme:t})=>t.colors.primary200};
    background: ${({theme:t})=>t.colors.primary100};
    color: ${({theme:t})=>t.colors.primary600};

    ${re} {
      display: block;
    }

    /* > ComponentIcon */
    > div:first-child {
      background: ${({theme:t})=>t.colors.primary200};
      color: ${({theme:t})=>t.colors.primary600};

      svg {
        path {
          fill: ${({theme:t})=>t.colors.primary600};
        }
      }
    }
  }
`,at=({component:t,dzName:n,index:o,isActive:s=!1,isInDevelopmentMode:r=!1,onClick:l,forTarget:i,targetUid:c,disabled:f})=>{const{components:b,removeComponentFromDynamicZone:k}=D(),a=O(b,t),{icon:d,displayName:u}=a?.info||{},T=w=>{w.stopPropagation(),k({forTarget:i,targetUid:c,dzName:n,componentToRemoveIndex:o})};return e.jsxs(st,{alignItems:"center",direction:"column",className:s?"active":"",borderRadius:"borderRadius",justifyContent:"center",paddingLeft:4,paddingRight:4,shrink:0,onClick:l,role:"tab",tabIndex:s?0:-1,cursor:"pointer","aria-selected":s,"aria-controls":`dz-${n}-panel-${o}`,id:`dz-${n}-tab-${o}`,children:[e.jsx(it,{icon:d,isActive:s}),e.jsx(p,{marginTop:1,maxWidth:"100%",children:e.jsx($,{variant:"pi",fontWeight:"bold",ellipsis:!0,children:u})}),r&&!f&&e.jsx(re,{cursor:"pointer",tag:"button",onClick:T,children:e.jsx(Ce,{})})]})},rt=y(L)`
  width: 3.2rem;
  height: 3.2rem;
  padding: 0.9rem;
  border-radius: 6.4rem;
  background: ${({theme:t,disabled:n})=>n?t.colors.neutral100:t.colors.primary100};
  path {
    fill: ${({theme:t,disabled:n})=>n?t.colors.neutral600:t.colors.primary600};
  }
`,lt=y(x)`
  flex-shrink: 0;
  width: 14rem;
  height: 8rem;
  justify-content: center;
  align-items: center;
`,dt=({components:t=[],addComponent:n,name:o,forTarget:s,targetUid:r,disabled:l=!1})=>{const{isInDevelopmentMode:i}=D(),[c,f]=R.useState(0),{formatMessage:b}=F(),k=d=>{c!==d&&f(d)},a=()=>{n(o)};return e.jsx(se,{className:"dynamiczone-row",$isFromDynamicZone:!0,children:e.jsxs(p,{children:[e.jsx(p,{padding:2,paddingLeft:"104px",children:e.jsxs(x,{role:"tablist",gap:2,wrap:"wrap",children:[i&&e.jsx("button",{type:"button",onClick:a,disabled:l,style:{cursor:l?"not-allowed":"pointer"},children:e.jsxs(lt,{direction:"column",alignItems:"stretch",gap:1,children:[e.jsx(rt,{disabled:l}),e.jsx($,{variant:"pi",fontWeight:"bold",textColor:l?"neutral600":"primary600",children:b({id:m("button.component.add"),defaultMessage:"Add a component"})})]})}),t.map((d,u)=>e.jsx(at,{dzName:o||"",index:u,component:d,isActive:c===u,isInDevelopmentMode:i,onClick:()=>k(u),forTarget:s,targetUid:r,disabled:l},d))]})}),e.jsx(p,{children:t.map((d,u)=>e.jsx(p,{id:`dz-${o}-panel-${u}`,role:"tabpanel","aria-labelledby":`dz-${o}-tab-${u}`,style:{display:c===u?"block":"none"},children:e.jsx(ae,{isFromDynamicZone:!0,component:d},d)},d))})]})})},ct=y(x)`
  justify-content: space-between;

  border-top: ${({theme:t,$isOverlay:n})=>n?"none":`1px solid ${t.colors.neutral150}`};

  padding-top: ${({theme:t})=>t.spaces[4]};
  padding-bottom: ${({theme:t})=>t.spaces[4]};

  opacity: ${({$isDragging:t})=>t?0:1};
  align-items: center;
`,ut=y(p)`
  list-style: none;
  list-style-type: none;
`,le=R.forwardRef((t,n)=>{const{style:o,...s}=t;return e.jsx(ut,{tag:"li",ref:n,...t.attributes,style:o,background:"neutral0",shadow:t.isOverlay?"filterShadow":"none","aria-label":t.item.name,children:e.jsx(pt,{...s})})}),pt=R.memo(t=>{const{item:n,firstLoopComponentUid:o,isFromDynamicZone:s,addComponentToDZ:r,secondLoopComponentUid:l,type:i,isDragging:c,isOverlay:f,handleRef:b,listeners:k}=t,a=f||c,[d,u]=R.useState(!0),T=i.status==="REMOVED",{contentTypes:w,removeAttribute:S,isInDevelopmentMode:M}=D(),{onOpenModalEditField:I,onOpenModalEditCustomField:A}=q(),{formatMessage:g}=F(),[h,j]=R.useState(!1),C=n.status==="REMOVED",B=n.type==="relation"&&n.relation.includes("morph"),pe=["integer","biginteger","float","decimal"].includes(n.type)?"number":n.type,E=n.type==="relation"?O(w,n.target):null,H=O(E,"plugin"),ge="target"in n&&n.target?"relation":pe,me=v=>{v.stopPropagation(),X(w,n.name).length>0?j(!0):S({forTarget:i.modelType,targetUid:i.uid,attributeToRemoveName:n.name})},fe=()=>{S({forTarget:i.modelType,targetUid:i.uid,attributeToRemoveName:n.name}),j(!1)},he=()=>{j(!1)},_=v=>{if(v&&v.stopPropagation(),!B&&n.configurable!==!1){const V=l||o||i.uid,K=nt(n.type),je=n.type==="component"?"2":null;n.customField?A({forTarget:i.modelType,targetUid:V,attributeName:n.name,attributeType:K,customFieldUid:n.customField}):I({forTarget:i.modelType,targetUid:V,attributeName:n.name,attributeType:K,step:je})}};let N;l&&o?N=2:o?N=1:N=0;const G=!T&&!C,xe=!T&&!C,ye=T||C?"not-allowed":"move",be=M&&n.configurable!==!1&&!B&&G;return e.jsxs(e.Fragment,{children:[e.jsxs(ct,{$isOverlay:f,$isDragging:c,onClick:be?_:void 0,paddingLeft:4,paddingRight:4,children:[e.jsxs(x,{alignItems:"center",overflow:"hidden",gap:2,children:[N!==0&&!f&&e.jsx(tt,{color:s?"primary200":"neutral150"}),M&&e.jsx(U,{cursor:ye,role:"Handle",ref:b,...k,variant:"ghost",withTooltip:!1,label:`${g({id:"app.utils.drag",defaultMessage:"Drag"})} ${n.name}`,disabled:T||C,style:{outlineOffset:"-2px"},children:e.jsx(Te,{})}),e.jsxs(x,{gap:4,children:[e.jsxs(x,{gap:4,alignItems:"center",children:[e.jsx(Pe,{type:ge,customField:n.customField}),e.jsxs($,{textColor:"neutral800",fontWeight:"bold",textDecoration:C?"line-through":"none",ellipsis:!0,overflow:"hidden",children:[n.name,"required"in n&&n.required&&e.jsx($,{textColor:"danger600",children:"* "})]})]}),e.jsx(x,{children:e.jsxs($,{textColor:"neutral600",children:[e.jsx(ot,{type:n.type,customField:n.customField,repeatable:"repeatable"in n&&n.repeatable,multiple:"multiple"in n&&n.multiple}),"conditions"in n&&n.conditions&&Object.keys(n.conditions).length>0&&e.jsx(we,{margin:4,children:"conditional"}),n.type==="relation"&&e.jsxs(e.Fragment,{children:[" (",ve(n.relation,n.targetAttribute),") ",E&&g({id:m("modelPage.attribute.with"),defaultMessage:"with"})," ",E&&e.jsx(Y,{onClick:v=>v.stopPropagation(),tag:ee,to:`/plugins/content-type-builder/content-types/${E.uid}`,children:Z(E.info.displayName)}),H&&`(${g({id:m("from"),defaultMessage:"from"})}: ${H})`]}),n.type==="component"&&e.jsx(mt,{uid:n.component})]})})]})]}),e.jsx(p,{children:e.jsx(x,{justifyContent:"flex-end",gap:1,onClick:v=>v.stopPropagation(),children:e.jsxs(e.Fragment,{children:[e.jsx(p,{children:n.status&&e.jsx(Be,{status:n.status})}),["component","dynamiczone"].includes(n.type)&&e.jsx(U,{onClick:v=>{v.preventDefault(),v.stopPropagation(),u(!d)},"aria-expanded":d,label:g({id:"app.utils.toggle",defaultMessage:"Toggle"}),variant:"ghost",withTooltip:!1,children:e.jsx(ke,{"aria-hidden":!0,fill:"neutral500",style:{transform:`rotate(${d?"0deg":"-90deg"})`,transition:"transform 0.5s"}})}),M&&n.configurable!==!1?e.jsxs(e.Fragment,{children:[!B&&e.jsx(U,{onClick:_,label:`${g({id:"app.utils.edit",defaultMessage:"Edit"})} ${n.name}`,variant:"ghost",disabled:!G,children:e.jsx(te,{})}),e.jsx(U,{onClick:me,label:`${g({id:"global.delete",defaultMessage:"Delete"})} ${n.name}`,variant:"ghost",disabled:!xe,children:e.jsx($e,{})}),e.jsx(De.Root,{open:h,onOpenChange:j,children:e.jsx(Me,{onConfirm:fe,onCancel:he,children:e.jsx(p,{children:e.jsxs($,{children:[g({id:m("popUpWarning.bodyMessage.delete-attribute-with-conditions"),defaultMessage:"The following fields have conditions that depend on this field: "}),e.jsx($,{fontWeight:"bold",children:X(w,n.name).map(({attribute:v})=>v).join(", ")}),g({id:m("popUpWarning.bodyMessage.delete-attribute-with-conditions-end"),defaultMessage:". Are you sure you want to delete it?"})]})})})})]}):e.jsx(x,{padding:2,children:e.jsx(Re,{fill:"neutral500"})})]})})})]}),e.jsxs(gt,{$shouldHideNestedInfos:a,$isOpen:d,children:[n.type==="component"&&e.jsx(ae,{...n,isFromDynamicZone:s,firstLoopComponentUid:o}),n.type==="dynamiczone"&&e.jsx(dt,{...n,disabled:T||n.status==="REMOVED",addComponent:r,forTarget:i.modelType,targetUid:i.uid})]})]})}),gt=y(p)`
  display: ${({$shouldHideNestedInfos:t})=>t?"none":"block"};
  max-height: ${({$isOpen:t})=>t?"9999px":"0px"};
  overflow: hidden;

  transition: ${({$isOpen:t})=>t?"max-height 1s ease-in-out":"max-height 0.5s cubic-bezier(0, 1, 0, 1)"};
`,mt=({uid:t})=>{const{components:n}=D(),o=O(n,t);return e.jsxs(e.Fragment,{children:[" (",e.jsx(Y,{onClick:s=>s.stopPropagation(),tag:ee,to:`/plugins/content-type-builder/component-categories/${o.category}/${o.uid}`,children:Z(o.info.displayName)}),")"]})},de=y(p)`
  height: 2.4rem;
  width: 2.4rem;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;

  svg {
    height: 1rem;
    width: 1rem;
  }

  svg path {
    fill: ${({theme:t,color:n})=>t.colors[`${n}600`]};
  }
`,ce=y(p)`
  border-radius: 0 0 ${({theme:t})=>t.borderRadius} ${({theme:t})=>t.borderRadius};
  display: block;
  width: 100%;
  border: none;
  position: relative;
`,ft=({children:t,icon:n,color:o,...s})=>e.jsx(ce,{paddingBottom:4,paddingTop:4,paddingLeft:"6rem",tag:"button",type:"button",...s,children:e.jsxs(x,{children:[e.jsx(de,{color:o,"aria-hidden":!0,background:`${o}200`,children:n}),e.jsx(p,{paddingLeft:3,children:e.jsx($,{variant:"pi",fontWeight:"bold",textColor:`${o}600`,children:t})})]})}),ht=({children:t,icon:n,color:o,...s})=>e.jsxs("div",{children:[e.jsx(Se,{}),e.jsx(ce,{tag:"button",background:`${o}100`,padding:5,...s,children:e.jsxs(x,{children:[e.jsx(de,{color:o,"aria-hidden":!0,background:`${o}200`,children:n}),e.jsx(p,{paddingLeft:3,children:e.jsx($,{variant:"pi",fontWeight:"bold",textColor:`${o}600`,children:t})})]})})]}),xt=y(p)`
  white-space: nowrap;
  list-style: none;
  list-style-type: none;
`,yt=t=>{const{isInDevelopmentMode:n}=D(),{isDragging:o,attributes:s,listeners:r,setNodeRef:l,transform:i,transition:c,setActivatorNodeRef:f}=Je({disabled:!n||t.item.status==="REMOVED"||t.type.status==="REMOVED",id:t.item.id,data:{index:t.item.index}}),b={transform:Xe.Transform.toString({x:i?.x??0,y:i?.y??0,scaleX:1,scaleY:1}),transition:c};return e.jsx(le,{ref:l,handleRef:f,isDragging:o,attributes:s,listeners:r,style:b,...t})},ue=({addComponentToDZ:t,firstLoopComponentUid:n,isFromDynamicZone:o=!1,isMain:s=!1,isSub:r=!1,secondLoopComponentUid:l,type:i})=>{const{formatMessage:c}=F(),{trackUsage:f}=ie(),{isInDevelopmentMode:b,moveAttribute:k}=D(),{onOpenModalAddField:a}=q(),d=i?.attributes.map((h,j)=>({id:`${i.uid}_${h.name}`,index:j,...h})),[u,T]=R.useState(null),w=i?.status==="REMOVED",S=Ve(Q(Ke),Q(Ge,{coordinateGetter:_e}));function M({active:h}){h&&T(h.id)}function I(h){const{active:j,over:C}=h;T(null),C&&j.id!==C.id&&k({forTarget:i.modelType,targetUid:i.uid,from:j.data.current.index,to:C.data.current.index})}const A=d.find(h=>h.id===u),g=()=>{w||(f("hasClickedCTBAddFieldBanner"),a({forTarget:i?.modelType,targetUid:i.uid}))};return i?.attributes.length===0&&s?e.jsx(Ae,{action:e.jsx(ne.contentTypeBuilder.AddFields,{children:e.jsx(P,{onClick:g,size:"L",startIcon:e.jsx(L,{}),variant:"secondary",children:c({id:m("table.button.no-fields"),defaultMessage:"Add new field"})})}),content:c(i.modelType==="contentType"?{id:m("table.content.no-fields.collection-type"),defaultMessage:"Add your first field to this Collection-Type"}:{id:m("table.content.no-fields.component"),defaultMessage:"Add your first field to this component"}),hasRadius:!0,icon:e.jsx(Fe,{width:"16rem"})}):e.jsxs(ze,{sensors:S,collisionDetection:We,onDragEnd:I,onDragStart:M,onDragCancel:()=>T(null),modifiers:[Qe],children:[e.jsxs(xt,{tag:"ul",children:[Ie.createPortal(e.jsx(Ze,{zIndex:10,children:A&&e.jsx(le,{isOverlay:!0,item:A,firstLoopComponentUid:n,isFromDynamicZone:o,secondLoopComponentUid:l,type:i,addComponentToDZ:t})}),document.body),e.jsx(qe,{items:d,strategy:He,children:d.map(h=>e.jsx(yt,{item:h,firstLoopComponentUid:n,isFromDynamicZone:o,secondLoopComponentUid:l,type:i,addComponentToDZ:t},h.id))})]}),s&&b&&e.jsx(ht,{cursor:w?"normal":"pointer",icon:e.jsx(L,{}),onClick:g,color:w?"neutral":"primary",children:c({id:m(`form.button.add.field.to.${i.modelType==="component"?"component":i.kind}`),defaultMessage:"Add another field"})}),r&&b&&e.jsx(ft,{cursor:w?"normal":"pointer",icon:e.jsx(L,{}),onClick:g,color:o&&!w?"primary":"neutral",children:c({id:m("form.button.add.field.to.component"),defaultMessage:"Add another field"})})]})},W={collectionTypesConfigurations:[{action:"plugin::content-manager.collection-types.configure-view",subject:null}],componentsConfigurations:[{action:"plugin::content-manager.components.configure-layout",subject:null}],singleTypesConfigurations:[{action:"plugin::content-manager.single-types.configure-view",subject:null}]},bt=t=>t.modelType==="contentType"?t.kind==="singleType"?W.singleTypesConfigurations:W.collectionTypesConfigurations:W.componentsConfigurations,jt=t=>{switch(t.modelType){case"contentType":switch(t.kind){case"singleType":return`/content-manager/single-types/${t.uid}/configurations/edit`;case"collectionType":return`/content-manager/collection-types/${t.uid}/configurations/edit`}case"component":return`/content-manager/components/${t.uid}/configurations/edit`}},Ct=y(P)`
  white-space: nowrap;
`,Tt=R.memo(({disabled:t,type:n})=>{const{formatMessage:o}=F(),s=Ee(),r=bt(n),l=o({id:"content-type-builder.form.button.configure-view",defaultMessage:"Configure the view"}),i=()=>{if(t)return!1;const b=jt(n);return s(b),!1},{isLoading:c,allowedActions:f}=Le(r);return c||!f.canConfigureView&&!f.canConfigureLayout?null:e.jsx(Ct,{startIcon:e.jsx(Oe,{}),variant:"tertiary",onClick:i,disabled:t,children:l})}),wt=y(oe.Header)`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Et=()=>{const{isInDevelopmentMode:t,contentTypes:n,components:o,isLoading:s}=D(),{formatMessage:r}=F(),{trackUsage:l}=ie(),{contentTypeUid:i,componentUid:c}=Ne(),{onOpenModalAddComponentsToDZ:f,onOpenModalAddField:b,onOpenModalEditSchema:k}=q(),a=i?n[i]:c?o[c]:null;if(s)return null;if(!a){const j=Object.values(n).filter(C=>C.visible===!0&&!C.plugin).map(C=>C.uid).sort();return j.length>0?e.jsx(z,{to:`/plugins/content-type-builder/content-types/${j[0]}`}):e.jsx(z,{to:"/plugins/content-type-builder/content-types/create-content-type"})}if(i&&a.modelType==="contentType"&&a.visible===!1)return e.jsx(z,{to:"/plugins/content-type-builder/content-types/create-content-type",replace:!0});const d="plugin"in a&&a?.plugin!==void 0,u=i?"contentType":"component",T=a?.info?.displayName??"",w=t&&!d,S=j=>{f({dynamicZoneTarget:j,targetUid:a.uid})},M=()=>{if("kind"in a){a?.kind==="collectionType"&&l("willEditNameOfContentType"),a?.kind==="singleType"&&l("willEditNameOfSingleType"),k({modalType:u,forTarget:u,targetUid:a.uid,kind:a?.kind});return}k({modalType:u,forTarget:u,targetUid:a.uid})},I=r({id:m("table.button.no-fields"),defaultMessage:"Add new field"}),A=r({id:m("button.attributes.add.another"),defaultMessage:"Add another field"}),g=a.status==="REMOVED",h=t&&e.jsxs(x,{gap:2,children:[e.jsx(Tt,{type:a,disabled:a.status==="NEW"||g},"link-to-cm-settings-view"),e.jsx(P,{startIcon:e.jsx(te,{}),variant:"tertiary",onClick:M,disabled:!w||g,children:r({id:"app.utils.edit",defaultMessage:"Edit"})}),e.jsx(P,{startIcon:e.jsx(L,{}),variant:"secondary",minWidth:"max-content",onClick:()=>{b({forTarget:u,targetUid:a.uid})},disabled:g,children:a.attributes.length===0?I:A})]});return e.jsxs(e.Fragment,{children:[e.jsx(ne.contentTypeBuilder.Introduction,{children:e.jsx(p,{})}),g&&e.jsx(x,{background:"danger100",justifyContent:"center",padding:4,children:e.jsxs(x,{gap:2,children:[e.jsx(Ue,{fill:"danger600",height:"2rem",width:"2rem"}),e.jsx($,{children:r({id:m("table.warning.deleted"),defaultMessage:"This {kind} has been deleted"},{kind:a.modelType==="contentType"?"Content Type":"Component"})})]})}),e.jsx(wt,{id:"title",primaryAction:h,title:Z(T)}),e.jsx(oe.Content,{children:e.jsx(p,{background:"neutral0",shadow:"filterShadow",hasRadius:!0,overflow:"auto",borderColor:"neutral150",children:e.jsx(ue,{type:a,addComponentToDZ:S,isMain:!0})})})]})};export{Et as default};
