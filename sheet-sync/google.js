import {tabs,podcast,ips,calendar} from "./model.js";
const base64 = a=>btoa(String.fromCharCode(...new Uint8Array(a))).replaceAll("+","-").replaceAll("/","_").replace(/=+$/,"");
const bytes=s=>new TextEncoder().encode(s);
export async function readWorkbook(env){
  const {client_email,private_key}=JSON.parse(env.GOOGLE_SHEETS_CREDENTIAL);
  const now=Math.floor(Date.now()/1000);
  const audience="https://oauth2.googleapis.com/token";
  const jwt=[{alg:"RS256",typ:"JWT"},{iss:client_email,scope:"https://www.googleapis.com/auth/spreadsheets.readonly",aud:audience,iat:now,exp:now+600}]
    .map(x=>base64(bytes(JSON.stringify(x)))).join(".");
  const der=Uint8Array.from(atob(private_key.replace(/-----[^-]+-----|\s/g,"")),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",der,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,bytes(jwt));
  const auth=await fetch(audience,{method:"POST",body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt+"."+base64(signature)}),signal:AbortSignal.timeout(18000)});
  if(!auth.ok)throw Error("google_auth_"+auth.status);
  const {access_token}=await auth.json();
  const names={"Production Tracker [Podcast]":podcast,[ips]:ips,[calendar]:calendar};
  const u=new URL("https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(env.SPREADSHEET_ID));
  for(const name of Object.keys(names))u.searchParams.append("ranges","'"+name+"'");
  u.searchParams.set("fields","sheets(properties(title),merges,data(startRow,startColumn,rowData(values(effectiveValue,formattedValue,userEnteredValue))))");
  const res=await fetch(u,{headers:{Authorization:"Bearer "+access_token},signal:AbortSignal.timeout(22000)});
  if(!res.ok)throw Error("sheet_read_"+res.status);
  const sheets={};let merges=[];
  for(const sheet of (await res.json()).sheets){
    const tab=names[sheet.properties.title];
    if(!tabs.includes(tab)||sheets[tab])throw Error("sheet_tab_invalid");
    const cells=sheets[tab]={};
    if(tab===podcast)merges=sheet.merges??[];
    for(const grid of sheet.data??[])for(const [r,row] of (grid.rowData??[]).entries())for(const [c,cell] of (row.values??[]).entries()){
      let col=c+(grid.startColumn??0)+1, name="";
      while(col){col--;name=String.fromCharCode(65+col%26)+name;col=Math.floor(col/26)}
      const ev=cell.effectiveValue??{},v=ev.errorValue?ev.errorValue.type:Object.values(ev)[0]??null;
      const f=cell.userEnteredValue?.formulaValue??"";
      if(v!==null||f)cells[name+(r+(grid.startRow??0)+1)]=[v,f,cell.formattedValue??""];
    }
  }
  if(sheets[podcast]?.A1?.[0]!=="Status"||sheets[ips]?.A1?.[0]!=="IP"||sheets[calendar]?.A1?.[0]!=="Month"||
     sheets[podcast]?.D1?.[0]!=="Ep Name"||sheets[ips]?.C1?.[0]!=="Episode Name")throw Error("sheet_schema_changed");
  return {sheets,merges};
}
