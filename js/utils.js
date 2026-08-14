/* V8.2 — Funções utilitárias extraídas da V6.9 sem alteração lógica. */

function get(k,d){return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}

function set(k,v){localStorage.setItem(k,JSON.stringify(v))}

function uid(){return'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)}

function safe(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function brDate(d){if(!d)return'';let p=d.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d}

function yymm(){const d=new Date($('dataRelatorio').value||todayISO());return String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0')}

function emitidoEm(){
 return new Date().toLocaleString('pt-BR');
}

function statusKey(s){
 return {'Em elaboração':'draft','Aguardando aprovação':'wait','Correção solicitada':'corr','Aprovado':'ok','Reprovado':'bad'}[s]||'draft';
}
