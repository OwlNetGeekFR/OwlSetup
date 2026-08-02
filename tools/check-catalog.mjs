import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"app.js"),"utf8");
const appStart=source.indexOf("const apps = [");
const appEnd=source.indexOf("\nif (Array.isArray(window.PC_SETUP_CATALOG)",appStart);
if(appStart<0||appEnd<0)throw new Error("Catalogue apps introuvable dans app.js");

const catalogBlock=source.slice(appStart,appEnd);
const ids=[...catalogBlock.matchAll(/\bid\s*:\s*"([^"]+)"/g)].map(match=>match[1]);
const sites=[...catalogBlock.matchAll(/\bsite\s*:\s*"([^"]+)"/g)].map(match=>match[1]);
const logoBlock=source.slice(source.indexOf("const appLogos"),source.indexOf("};",source.indexOf("const appLogos"))+2);
const logos=[...logoBlock.matchAll(/:\s*"([^"]+\.(?:svg|png|webp))"/gi)].map(match=>match[1]);
const errors=[];
const warnings=[];
const seen=new Set();

for(const id of ids){
  const key=id.toLowerCase();
  if(seen.has(key))errors.push(`Identifiant dupliqué : ${id}`);
  seen.add(key);
  if(!/^[A-Za-z0-9.+_-]+$/.test(id))errors.push(`Identifiant invalide : ${id}`);
}
for(const site of sites)if(!/^https:\/\//i.test(site))errors.push(`URL non sécurisée : ${site}`);
for(const logo of logos)if(!fs.existsSync(path.join(root,"assets","logos",logo)))errors.push(`Logo introuvable : ${logo}`);
if(ids.length<90)warnings.push(`Catalogue anormalement court : ${ids.length} applications`);

const result={checkedAt:new Date().toISOString(),applications:ids.length,logos:logos.length,sites:sites.length,errors,warnings};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exit(1);
