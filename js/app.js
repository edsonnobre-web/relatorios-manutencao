
let currentEditingId=null;
const $=id=>document.getElementById(id);let currentUser=null,photos=[],executors=[],activeSigIndex=null,modalDrawing=false;function todayISO(){return new Date().toISOString().slice(0,10)}



function statusClass(s){return{'Em elaboração':'st-draft','Aguardando aprovação':'st-wait','Aprovado':'st-ok','Reprovado':'st-bad','Correção solicitada':'st-corr'}[s]||'st-draft'}function statusBadge(s){return`<span class="status ${statusClass(s)}">${safe(s)}</span>`}



const sapConfigDefaults={enabled:false};
const SAP_DB_NAME='RelatoriosManutencaoSAP';
const SAP_DB_VERSION=1;
const SAP_STORE='catalog';
let sapWorkbook=null;
let sapSheetRows=[];

function getSapConfig(){return {...sapConfigDefaults,...get('sapConfig',sapConfigDefaults)}}

function loadSapConfig(){
 const c=getSapConfig();
 if($('cfgSapEnabled'))$('cfgSapEnabled').checked=!!c.enabled;
 applySapConfig();
 updateSapImportStatus();
}
function saveSapConfig(){
 set('sapConfig',{enabled:!!$('cfgSapEnabled')?.checked});
 applySapConfig();
 alert('Configuração SAP salva.');
}
function applySapConfig(){
 const enabled=getSapConfig().enabled;
 ['sapCodeField','sapDescriptionField','eqSapCodeField','eqSapDescriptionField'].forEach(id=>{
  if($(id))$(id).classList.toggle('configHidden',!enabled);
 });
}
function openSapDB(){
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(SAP_DB_NAME,SAP_DB_VERSION);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(SAP_STORE))req.result.createObjectStore(SAP_STORE,{keyPath:'codigo'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
}
async function sapCatalogCount(){
 const db=await openSapDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(SAP_STORE,'readonly'),req=tx.objectStore(SAP_STORE).count();
  req.onsuccess=()=>resolve(req.result||0);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();
 });
}
async function getSapItem(codigo){
 const key=String(codigo||'').trim().replace(/\.0$/,'');
 if(!key)return null;
 const db=await openSapDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(SAP_STORE,'readonly'),req=tx.objectStore(SAP_STORE).get(key);
  req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();
 });
}
async function updateSapImportStatus(){
 const el=$('sapImportStatus');if(!el)return;
 try{
  const count=await sapCatalogCount(),meta=get('sapCatalogMeta',{});
  if(count){
   el.className='sapImportStatus ok';
   el.innerHTML=`Base carregada: <b>${count.toLocaleString('pt-BR')}</b> códigos${meta.fileName?' — '+safe(meta.fileName):''}${meta.importedAt?' — '+safe(meta.importedAt):''}.`;
  }else{el.className='sapImportStatus';el.textContent='Nenhuma base importada neste dispositivo.'}
 }catch(error){el.className='sapImportStatus error';el.textContent='Erro ao consultar a base: '+error.message}
}
function normalizeSapHeader(value){return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function findSapHeaderIndex(headers,aliases){
 const normalized=headers.map(normalizeSapHeader),targets=aliases.map(normalizeSapHeader);
 for(const target of targets){const i=normalized.indexOf(target);if(i>=0)return i}
 for(let i=0;i<normalized.length;i++){if(targets.some(target=>normalized[i].includes(target)))return i}
 return -1;
}
function detectSapHeaderRow(rows){
 for(let i=0;i<Math.min(rows.length,30);i++){
  const row=rows[i]||[];
  if(findSapHeaderIndex(row,['Material','Código SAP','Codigo SAP'])>=0&&findSapHeaderIndex(row,['Descrição Longa','Descricao Longa','Descrição','Descricao'])>=0)return i+1;
 }
 return 1;
}
function previewSapWorkbook(event){
 const file=event.target.files?.[0];if(!file)return;
 const status=$('sapImportStatus');
 if(typeof XLSX==='undefined'){status.className='sapImportStatus error';status.textContent='O leitor Excel não carregou. Verifique a internet e reabra o aplicativo.';return}
 status.className='sapImportStatus warn';status.textContent='Lendo a planilha...';
 const reader=new FileReader();
 reader.onload=e=>{
  try{
   sapWorkbook=XLSX.read(e.target.result,{type:'array',cellDates:false});
   $('sapSheetSelect').innerHTML=sapWorkbook.SheetNames.map(name=>`<option value="${safe(name)}">${safe(name)}</option>`).join('');
   if(sapWorkbook.SheetNames.includes('BASE GERAL'))$('sapSheetSelect').value='BASE GERAL';
   const rows=XLSX.utils.sheet_to_json(sapWorkbook.Sheets[$('sapSheetSelect').value],{header:1,defval:'',raw:false});
   $('sapHeaderRow').value=detectSapHeaderRow(rows);
   prepareSapSheetMapping();
   $('sapImportButton').disabled=false;
   status.className='sapImportStatus ok';
   status.innerHTML=`Planilha reconhecida: <b>${safe(file.name)}</b>. Confira o mapeamento e importe.`;
  }catch(error){sapWorkbook=null;sapSheetRows=[];$('sapImportButton').disabled=true;status.className='sapImportStatus error';status.textContent='Erro ao ler a planilha: '+error.message}
 };
 reader.readAsArrayBuffer(file);
}
function prepareSapSheetMapping(){
 if(!sapWorkbook)return;
 const sheet=sapWorkbook.Sheets[$('sapSheetSelect').value||sapWorkbook.SheetNames[0]];if(!sheet)return;
 const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
 const headerRow=Math.max(1,Number($('sapHeaderRow')?.value||detectSapHeaderRow(rows))),index=headerRow-1;
 const headers=(rows[index]||[]).map((v,i)=>String(v||`Coluna ${i+1}`).trim()||`Coluna ${i+1}`);
 sapSheetRows=rows.slice(index+1);
 const options=headers.map((h,i)=>`<option value="${i}">${safe(h)} — coluna ${i+1}</option>`).join('');
 $('sapCodeColumn').innerHTML=options;$('sapDescriptionColumn').innerHTML=options;
 const ci=findSapHeaderIndex(headers,['Material','Código SAP','Codigo SAP','Código','Codigo']);
 const di=findSapHeaderIndex(headers,['Descrição Longa','Descricao Longa','Descrição','Descricao']);
 if(ci>=0)$('sapCodeColumn').value=String(ci);if(di>=0)$('sapDescriptionColumn').value=String(di);
 $('sapMappingPanel').classList.remove('hidden');
}
async function importSapWorkbook(){
 if(!sapWorkbook||!sapSheetRows.length){alert('Selecione uma planilha válida.');return}
 const codeCol=Number($('sapCodeColumn').value),descCol=Number($('sapDescriptionColumn').value);
 if(codeCol===descCol){alert('Código SAP e Descrição Longa precisam usar colunas diferentes.');return}
 const map=new Map();let ignored=0;
 sapSheetRows.forEach(row=>{
  const codigo=String(row[codeCol]??'').trim().replace(/\.0$/,''),descricao=String(row[descCol]??'').trim();
  if(!codigo||!descricao){ignored++;return}
  map.set(codigo,{codigo,descricao});
 });
 const records=[...map.values()];
 if(!records.length){alert('Nenhum registro válido foi encontrado.');return}
 const mode=$('sapImportMode').value||'replace';
 if(!confirm(`Importar ${records.length.toLocaleString('pt-BR')} códigos?`))return;
 const progress=$('sapImportProgress'),status=$('sapImportStatus');
 progress.classList.remove('hidden');progress.value=0;status.className='sapImportStatus warn';status.textContent='Importando...';$('sapImportButton').disabled=true;
 try{
  const db=await openSapDB();
  if(mode==='replace')await new Promise((res,rej)=>{const tx=db.transaction(SAP_STORE,'readwrite');tx.objectStore(SAP_STORE).clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
  for(let start=0;start<records.length;start+=400){
   const chunk=records.slice(start,start+400);
   await new Promise((res,rej)=>{const tx=db.transaction(SAP_STORE,'readwrite'),store=tx.objectStore(SAP_STORE);chunk.forEach(r=>store.put(r));tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
   progress.value=Math.round(Math.min(100,(start+chunk.length)*100/records.length));
   await new Promise(res=>setTimeout(res,0));
  }
  db.close();
  const total=await sapCatalogCount();
  set('sapCatalogMeta',{total,importedAt:new Date().toLocaleString('pt-BR'),fileName:$('sapExcelFile')?.files?.[0]?.name||'',sheetName:$('sapSheetSelect').value||'',ignored});
  status.className='sapImportStatus ok';status.innerHTML=`Importação concluída: <b>${total.toLocaleString('pt-BR')}</b> códigos disponíveis.`;
  $('sapExcelFile').value='';$('sapMappingPanel').classList.add('hidden');sapWorkbook=null;sapSheetRows=[];
 }catch(error){status.className='sapImportStatus error';status.textContent='Erro na importação: '+error.message}
 finally{progress.classList.add('hidden');$('sapImportButton').disabled=true}
}
async function clearSapCatalog(){
 if(!confirm('Apagar toda a base Excel importada deste dispositivo?'))return;
 try{
  const db=await openSapDB();
  await new Promise((res,rej)=>{const tx=db.transaction(SAP_STORE,'readwrite');tx.objectStore(SAP_STORE).clear();tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});
  db.close();localStorage.removeItem('sapCatalogMeta');updateSapImportStatus();
 }catch(error){alert('Erro ao limpar a base: '+error.message)}
}
async function lookupSapDescription(){
 if(!getSapConfig().enabled)return;
 const item=await getSapItem($('codigoSap')?.value||'').catch(()=>null);
 if(item&&$('descricaoLonga'))$('descricaoLonga').value=item.descricao||'';
}
async function lookupEquipmentSapDescription(){
 if(!getSapConfig().enabled)return;
 const item=await getSapItem($('eqSap')?.value||'').catch(()=>null);
 if(item&&$('eqDescricaoLonga'))$('eqDescricaoLonga').value=item.descricao||'';
}

const numberingDefaults={prefix:'RM',template:'{PREFIXO}-{AA}{MM}-{SEQ}',sequenceDigits:3};
function getNumberingConfig(){return {...numberingDefaults,...get('numberingConfig',numberingDefaults)}}
function sanitizePrefix(value){
 return String(value||'').trim().toUpperCase().replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'-').slice(0,20)||'RM';
}
function normalizeNumberTemplate(value){return String(value||'').trim()||numberingDefaults.template}
function reportDateParts(dateValue){
 const d=dateValue?new Date(dateValue+'T12:00:00'):new Date(),yyyy=String(d.getFullYear());
 return {AA:yyyy.slice(-2),AAAA:yyyy,MM:String(d.getMonth()+1).padStart(2,'0')};
}
function sequenceScopeKey(config,dateValue){
 const p=reportDateParts(dateValue),t=config.template;let period='GLOBAL';
 if(t.includes('{MM}'))period=p.AAAA+'-'+p.MM;
 else if(t.includes('{AAAA}')||t.includes('{AA}'))period=p.AAAA;
 return sanitizePrefix(config.prefix)+'|'+period;
}
function inferExistingSequence(config,dateValue){
 const keyPrefix=sanitizePrefix(config.prefix).toLowerCase(),parts=reportDateParts(dateValue);let max=0;
 get('reports',[]).forEach(r=>{
  const n=String(r.numero||''),rd=reportDateParts(r.data||dateValue);
  if(!n.toLowerCase().startsWith(keyPrefix))return;
  if(config.template.includes('{MM}')&&(rd.AAAA!==parts.AAAA||rd.MM!==parts.MM))return;
  if(!config.template.includes('{MM}')&&(config.template.includes('{AAAA}')||config.template.includes('{AA}'))&&rd.AAAA!==parts.AAAA)return;
  const m=n.match(/(\d+)(?!.*\d)/);if(m)max=Math.max(max,Number(m[1])||0);
 });
 return max;
}
function peekNextSequence(config,dateValue){
 const counters=get('reportSequenceCounters',{}),key=sequenceScopeKey(config,dateValue);
 const current=Math.max(Number(counters[key]||0),inferExistingSequence(config,dateValue));
 return current+1;
}
function commitNextSequence(config,dateValue){
 const counters=get('reportSequenceCounters',{}),key=sequenceScopeKey(config,dateValue);
 const next=Math.max(Number(counters[key]||0),inferExistingSequence(config,dateValue))+1;
 counters[key]=next;set('reportSequenceCounters',counters);return next;
}
function formatReportNumber(config,dateValue,sequence){
 const p=reportDateParts(dateValue),digits=Math.min(8,Math.max(1,Number(config.sequenceDigits)||3));
 return normalizeNumberTemplate(config.template)
  .replaceAll('{PREFIXO}',sanitizePrefix(config.prefix)).replaceAll('{AAAA}',p.AAAA).replaceAll('{AA}',p.AA).replaceAll('{MM}',p.MM)
  .replaceAll('{SEQ}',String(sequence).padStart(digits,'0'));
}
function reserveNumberForNewReport(){
 if(currentEditingId)return $('numero').value;
 const c=getNumberingConfig(),date=$('dataRelatorio')?.value||todayISO(),seq=commitNextSequence(c,date);
 const number=formatReportNumber(c,date,seq);$('numero').value=number;return number;
}
function loadNumberingConfig(){
 const c=getNumberingConfig();if($('cfgReportPrefix'))$('cfgReportPrefix').value=c.prefix;if($('cfgNumberTemplate'))$('cfgNumberTemplate').value=c.template;if($('cfgSequenceDigits'))$('cfgSequenceDigits').value=c.sequenceDigits;previewNumbering();
}
function previewNumbering(){
 if(!$('numberingPreview'))return;
 const saved=getNumberingConfig(),c={prefix:sanitizePrefix($('cfgReportPrefix')?.value||saved.prefix),template:normalizeNumberTemplate($('cfgNumberTemplate')?.value||saved.template),sequenceDigits:Number($('cfgSequenceDigits')?.value||saved.sequenceDigits)};
 const date=$('dataRelatorio')?.value||todayISO(),preview=formatReportNumber(c,date,peekNextSequence(c,date));
 $('numberingPreview').innerHTML=`Exemplo do próximo número: <b>${safe(preview)}</b><br><span class="small">A sequência deste prefixo é independente das sequências dos demais prefixos.</span>`;
}
function saveNumberingConfig(){
 const c={prefix:sanitizePrefix($('cfgReportPrefix').value),template:normalizeNumberTemplate($('cfgNumberTemplate').value),sequenceDigits:Math.min(8,Math.max(1,Number($('cfgSequenceDigits').value)||3))};
 if(!c.template.includes('{PREFIXO}')||!c.template.includes('{SEQ}')){alert('O modelo precisa conter {PREFIXO} e {SEQ}.');return}
 const test=c.template.replaceAll('{PREFIXO}','').replaceAll('{AAAA}','').replaceAll('{AA}','').replaceAll('{MM}','').replaceAll('{SEQ}','');
 if(/[{}]/.test(test)){alert('Há um token não reconhecido. Use somente {PREFIXO}, {AA}, {AAAA}, {MM} e {SEQ}.');return}
 set('numberingConfig',c);loadNumberingConfig();newReportNumber();alert('Numeração salva.');
}

const workflowDefaults={
 showStatus:true,
 approvalEnabled:true,
 approverRequired:true,
 showPriority:true,
 watermarkMode:'status'
};
function getWorkflowConfig(){
 return {...workflowDefaults,...get('workflowConfig',workflowDefaults)};
}
function loadWorkflowConfig(){
 const c=getWorkflowConfig();
 if($('cfgShowStatus'))$('cfgShowStatus').checked=!!c.showStatus;
 if($('cfgApprovalEnabled'))$('cfgApprovalEnabled').checked=!!c.approvalEnabled;
 if($('cfgApproverRequired'))$('cfgApproverRequired').checked=!!c.approverRequired;
 if($('cfgShowPriority'))$('cfgShowPriority').checked=!!c.showPriority;
 if($('cfgWatermarkMode'))$('cfgWatermarkMode').value=c.watermarkMode||'status';
 renderApproverOptions();
 applyWorkflowConfig();
}
function saveWorkflowConfig(){
 const c={
  showStatus:$('cfgShowStatus').checked,
  approvalEnabled:$('cfgApprovalEnabled').checked,
  approverRequired:$('cfgApproverRequired').checked,
  showPriority:$('cfgShowPriority').checked,
  watermarkMode:$('cfgWatermarkMode').value||'status'
 };
 set('workflowConfig',c);
 applyWorkflowConfig();
 renderApproverOptions();
 alert('Configurações de fluxo salvas.');
}
function applyWorkflowConfig(){
 const c=getWorkflowConfig();
 if($('statusField'))$('statusField').classList.toggle('configHidden',!c.showStatus);
 if($('priorityField'))$('priorityField').classList.toggle('configHidden',!c.showPriority);
 if($('approverField'))$('approverField').classList.toggle('configHidden',!c.approvalEnabled);
 if($('navAprov'))$('navAprov').style.display=(getModules().aprovacao&&c.approvalEnabled)?'inline-block':'none';
 if($('submitApprovalButton'))$('submitApprovalButton').textContent=c.approvalEnabled?'Enviar para aprovação':'Finalizar relatório';
}
function renderApproverOptions(selectedLogin){
 const el=$('aprovador');
 if(!el)return;
 const users=get('users',[]).filter(u=>u.nivel==='Gestor'||u.nivel==='Administrador');
 const selected=selectedLogin||el.value||'';
 el.innerHTML='<option value="">Selecione o aprovador</option>'+
  users.map(u=>`<option value="${safe(u.login)}">${safe(u.nome)} — ${safe(u.cargo||u.nivel)}</option>`).join('');
 if(users.some(u=>u.login===selected))el.value=selected;
}
function getSelectedApprover(){
 const login=$('aprovador')?.value||'';
 const u=get('users',[]).find(x=>x.login===login);
 return u?{login:u.login,nome:u.nome,matricula:u.matricula||'',cargo:u.cargo||'',email:u.email||''}:null;
}

const standardFields=[['tag','TAG'],['equipamento','Equipamento'],['area','Área / Sistema'],['fabricante','Fabricante'],['modelo','Modelo'],['serie','Nº de série'],['om','OM / OS'],['problemas','Problemas identificados'],['causas','Possíveis causas'],['acoes','Ações executadas'],['obs','Observações finais']];const moduleDefaults={equipamentos:true,aprovacao:true,qrcode:true,whatsapp:true,email:true,camposPorTipo:true};const moduleLabels={equipamentos:'Cadastro de equipamentos',aprovacao:'Aprovação eletrônica',qrcode:'QR Code',whatsapp:'Compartilhamento WhatsApp',email:'Compartilhamento E-mail',camposPorTipo:'Campos por tipo de relatório'};

const OWNER_LOGIN='proprietario';
const OWNER_DEFAULT_PASSWORD='1234';

function getOwnerPassword(){
 try{
  const raw=localStorage.getItem('ownerPassword');
  return raw?JSON.parse(raw):OWNER_DEFAULT_PASSWORD;
 }catch{
  return localStorage.getItem('ownerPassword')||OWNER_DEFAULT_PASSWORD;
 }
}
function ownerAccount(){
 return {
  login:OWNER_LOGIN,
  senha:getOwnerPassword(),
  nivel:'Proprietário',
  nome:'Proprietário do Sistema',
  matricula:'',
  cargo:'Proprietário',
  email:'',
  isOwner:true
 };
}
function isOwner(){
 return !!currentUser?.isOwner || currentUser?.nivel==='Proprietário';
}
function isAdministrator(){
 return isOwner() || currentUser?.nivel==='Administrador';
}
function isManagerOrAdmin(){
 return isOwner() || ['Gestor','Administrador'].includes(currentUser?.nivel);
}
function authenticateUser(loginValue,passwordValue){
 const login=String(loginValue||'').trim();
 const senha=String(passwordValue||'');
 if(login===OWNER_LOGIN && senha===getOwnerPassword())return ownerAccount();
 return get('users',[]).find(x=>x.login===login&&x.senha===senha)||null;
}

function init(){if(!localStorage.getItem('ownerPassword'))localStorage.setItem('ownerPassword',JSON.stringify(OWNER_DEFAULT_PASSWORD));if(!localStorage.getItem('users'))set('users',[{login:'admin',senha:'1234',nivel:'Administrador',nome:'Administrador',matricula:'0000',cargo:'Administrador',email:''}]);if(!localStorage.getItem('company'))set('company',{nome:'NOME DA EMPRESA',setor:'OFICINA CENTRAL MECÂNICA / ELÉTRICA E INSTRUMENTAÇÃO',endereco:'',email:'',gestor:'Responsável Técnico',gestorCargo:'Cargo / Matrícula',logo:''});if(!localStorage.getItem('customFields'))set('customFields',[]);if(!localStorage.getItem('requiredFields'))set('requiredFields',['tag','equipamento','acoes']);if(!localStorage.getItem('modules'))set('modules',moduleDefaults);if(!localStorage.getItem('equipments'))set('equipments',[]);$('dataRelatorio').value=todayISO();if($('dataFim'))$('dataFim').value=todayISO();
 $('dataFim').value=todayISO();
 updatePeriodoInfo();loadCompany();renderModulesConfig();renderRequiredFieldsConfig();renderCustomFieldsConfig();renderCustomFieldsForm();renderUsers();renderEquipments();renderEquipmentSelect();renderDashboard();renderTypeFields()}function login(){
 const user=authenticateUser($('loginUser').value,$('loginPass').value);
 if(!user){
  alert('Usuário ou senha inválidos');
  $('loginPass')?.focus();
  return;
 }
 currentUser=user;
 sessionStorage.setItem('currentUser',JSON.stringify(user));
 openApp();
}function openApp(){
 $('loginScreen').classList.add('hidden');
 $('app').classList.remove('hidden');
 $('userInfo').innerText=`${currentUser.nome} - ${currentUser.nivel}`;
 $('executorBadge').innerText=`Usuário: ${currentUser.nome}`;
 document.querySelectorAll('.adminOnly').forEach(el=>el.style.display=isAdministrator()?'inline-block':'none');
 applyModules();
 if(executors.length===0){
  executors=[{
   login:currentUser.login,
   nome:currentUser.nome,
   matricula:currentUser.matricula||'',
   cargo:currentUser.cargo||'',
   assinatura:''
  }];
 }
 renderExecutors();
 renderApproverOptions();
 applyWorkflowConfig();
 newReportNumber();
 showTab('dashboard');
}function startNewReport(){
 currentEditingId=null;
 clearForm();
 if($('status')) $('status').value='Em elaboração';
 showTab('relatorio');
}
function logout(){sessionStorage.removeItem('currentUser');location.reload()}
function changeMyPassword(){
 const nova=prompt('Digite a nova senha:');
 if(!nova||nova.length<4){
  alert('A senha deve ter pelo menos 4 caracteres.');
  return;
 }
 if(isOwner()){
  localStorage.setItem('ownerPassword',JSON.stringify(nova));
  currentUser=ownerAccount();
  sessionStorage.setItem('currentUser',JSON.stringify(currentUser));
  alert('Senha do Proprietário alterada com sucesso.');
  return;
 }
 let users=get('users',[]);
 const u=users.find(x=>x.login===currentUser.login);
 if(u){
  u.senha=nova;
  set('users',users);
  currentUser={...currentUser,senha:nova};
  sessionStorage.setItem('currentUser',JSON.stringify(currentUser));
  alert('Senha alterada com sucesso.');
 }
}
function resetUserPassword(i){if(!isAdministrator()){alert('Apenas administrador pode redefinir senha.');return}const nova=prompt('Nova senha para este usuário:');if(!nova||nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}let users=get('users',[]);users[i].senha=nova;set('users',users);alert('Senha redefinida.')}
function changeMyPassword(){
 const nova=prompt('Digite a nova senha:');
 if(!nova || nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}
 let users=get('users',[]), u=users.find(x=>x.login===currentUser.login);
 if(u){u.senha=nova;set('users',users);alert('Senha alterada com sucesso.')}
}
function resetUserPassword(i){
 if(!isAdministrator()){alert('Apenas administrador pode redefinir senha.');return}
 const nova=prompt('Nova senha para este usuário:');
 if(!nova || nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}
 let users=get('users',[]);
 users[i].senha=nova;set('users',users);alert('Senha redefinida.');
}function showTab(t){document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('tab-'+t).classList.remove('hidden');if(t==='dashboard')renderDashboard();if(t==='historico')renderHistory();if(t==='aprovacoes')renderApprovals();if(t==='equipamentos')renderEquipments();if(t==='config'){loadCompany();renderRequiredFieldsConfig();renderCustomFieldsConfig();renderModulesConfig();loadNumberingConfig();loadWorkflowConfig();loadSapConfig()}}function getModules(){return{...moduleDefaults,...get('modules',moduleDefaults)}}function applyModules(){
 const m=getModules(),w=getWorkflowConfig();
 $('navEquip').style.display=m.equipamentos?'inline-block':'none';
 $('navAprov').style.display=(m.aprovacao&&w.approvalEnabled)?'inline-block':'none';
 applyWorkflowConfig();
}function renderModulesConfig(){const m=getModules();$('modulesArea').innerHTML=Object.keys(moduleLabels).map(k=>`<label class="moduleItem"><input type="checkbox" class="moduleCheck" value="${k}" ${m[k]?'checked':''}> ${moduleLabels[k]}</label>`).join('')}function saveModules(){const m={};document.querySelectorAll('.moduleCheck').forEach(x=>m[x.value]=x.checked);set('modules',m);applyModules();alert('Módulos salvos')}function newReportNumber(){
 const c=getNumberingConfig(),date=$('dataRelatorio')?.value||todayISO();
 $('numero').value=formatReportNumber(c,date,peekNextSequence(c,date));
}$('dataRelatorio').addEventListener('change',()=>{newReportNumber();updatePeriodoInfo()});
$('dataFim').addEventListener('change',updatePeriodoInfo);
function updatePeriodoInfo(){
 const ini=$('dataRelatorio')?.value, fim=$('dataFim')?.value;
 if(!$('periodoInfo'))return;
 if(!ini&&!fim){$('periodoInfo').value='';return}
 $('periodoInfo').value=(ini===fim||!fim)?brDate(ini):(brDate(ini)+' até '+brDate(fim));
}
function renderDashboard(){
 const reps=get('reports',[]),eq=get('equipments',[]),now=new Date(),yy=now.getFullYear(),mm=now.getMonth()+1;
 $('kpiMes').innerText=reps.filter(r=>{if(!r.data)return false;const d=new Date(r.data+'T12:00:00');return d.getFullYear()===yy&&(d.getMonth()+1)===mm}).length;
 $('kpiPend').innerText=reps.filter(r=>r.status==='Aguardando aprovação').length;
 $('kpiOk').innerText=reps.filter(r=>r.status==='Aprovado').length;
 $('kpiEqp').innerText=eq.length;
}function loadLogo(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('empLogoPreview').src=r.result;$('empLogoPreview').dataset.logo=r.result};r.readAsDataURL(f)}function loadCompany(){const c=get('company',{});$('empNome').value=c.nome||'';$('empSetor').value=c.setor||'';if($('empEndereco'))$('empEndereco').value=c.endereco||'';$('empEmail').value=c.email||'';$('empGestor').value=c.gestor||'';$('empGestorCargo').value=c.gestorCargo||'';$('empLogoPreview').src=c.logo||'';$('empLogoPreview').dataset.logo=c.logo||''}function saveCompany(){set('company',{nome:$('empNome').value,setor:$('empSetor').value,endereco:$('empEndereco')?$('empEndereco').value:'',email:$('empEmail').value,gestor:$('empGestor').value,gestorCargo:$('empGestorCargo').value,logo:$('empLogoPreview').dataset.logo||''});alert('Empresa salva')}
function renderRequiredFieldsConfig(){const req=get('requiredFields',[]);$('requiredFieldsArea').innerHTML=standardFields.map(([id,label])=>`<label class="moduleItem"><input type="checkbox" class="reqCheck" value="${id}" ${req.includes(id)?'checked':''}> ${label}</label>`).join('')}function saveRequiredFields(){set('requiredFields',[...document.querySelectorAll('.reqCheck:checked')].map(x=>x.value));alert('Campos obrigatórios salvos')}
function focusRequiredField(id){
 const el=$(id);
 if(!el)return false;

 // Se o campo estiver dentro de uma área/tab escondida, abre o relatório.
 if(el.closest?.('.tab')?.classList.contains('hidden')){
  showTab('relatorio');
 }

 setTimeout(()=>{
  try{
   el.scrollIntoView({behavior:'smooth',block:'center'});
  }catch{
   el.scrollIntoView();
  }
  el.classList.add('requiredAttention');
  try{el.focus({preventScroll:true})}catch{el.focus()}
  setTimeout(()=>el.classList.remove('requiredAttention'),2200);
 },120);
 return true;
}

function focusExecutorsArea(){
 const body=$('executorsBody');
 const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Adicionar executante'));
 const target=btn||body;
 if(!target)return;
 target.scrollIntoView({behavior:'smooth',block:'center'});
 target.classList.add('requiredAttention');
 if(btn)btn.focus();
 setTimeout(()=>target.classList.remove('requiredAttention'),2200);
}

function validateRequired(){
 const missing=[];
 let firstMissingId=null;

 const required=get('requiredFields',[]);
 required.forEach(id=>{
  const el=$(id);
  if(!String(el?.value||'').trim()){
   const label=(standardFields.find(x=>x[0]===id)||[])[1]||id;
   missing.push(label);
   if(!firstMissingId)firstMissingId=id;
  }
 });

 get('customFields',[]).forEach(f=>{
  if(f.obrigatorio&&!String($(f.id)?.value||'').trim()){
   missing.push(f.nome);
   if(!firstMissingId)firstMissingId=f.id;
  }
 });

 const missingExecutors=executors.length===0||!executors.some(e=>String(e.nome||'').trim());
 if(missingExecutors)missing.push('Executantes');

 if(missing.length){
  alert('Preencha os campos obrigatórios: '+missing.join(', '));

  if(firstMissingId){
   focusRequiredField(firstMissingId);
  }else if(missingExecutors){
   focusExecutorsArea();
  }
  return false;
 }
 return true;
}function addCustomField(){const nome=$('cfNome').value.trim();if(!nome){alert('Informe o nome do campo');return}let f=get('customFields',[]);f.push({id:'cf_'+Date.now(),nome,tipo:$('cfTipo').value,obrigatorio:$('cfObrigatorio').value==='sim'});set('customFields',f);$('cfNome').value='';renderCustomFieldsConfig();renderCustomFieldsForm()}function delCustomField(i){let f=get('customFields',[]);if(!confirm('Excluir campo?'))return;f.splice(i,1);set('customFields',f);renderCustomFieldsConfig();renderCustomFieldsForm()}function renderCustomFieldsConfig(){const f=get('customFields',[]);$('customFieldsBody').innerHTML=f.map((x,i)=>`<tr><td>${safe(x.nome)}</td><td>${x.tipo}</td><td>${x.obrigatorio?'Sim':'Não'}</td><td><button class="danger smallBtn" onclick="delCustomField(${i})">Excluir</button></td></tr>`).join('')}function renderCustomFieldsForm(){const f=get('customFields',[]);$('customFieldsArea').innerHTML=f.length?'<h3>Campos personalizados</h3>'+f.map(x=>x.tipo==='textarea'?`<label>${safe(x.nome)}${x.obrigatorio?' *':''}</label><textarea id="${x.id}"></textarea>`:`<label>${safe(x.nome)}${x.obrigatorio?' *':''}</label><input id="${x.id}" type="${x.tipo}">`).join(''):''}function renderTypeFields(){const m=getModules();if(!m.camposPorTipo){$('typeFieldsArea').innerHTML='';return}const tipo=$('tipo').value,map={'Inspeção':['Itens inspecionados','Conformidades','Não conformidades'],'Teste':['Parâmetros medidos','Resultado do teste','Conclusão'],'Preventiva':['Atividades preventivas realizadas'],'Corretiva':['Sintoma da falha','Correção aplicada'],'Preditiva':['Medições / evidências preditivas','Tendência observada'],'Emergencial':['Condição de emergência','Ação imediata']};$('typeFieldsArea').innerHTML=(map[tipo]||[]).map((n,i)=>`<label>${n}</label><textarea id="typeField${i}" data-type-label="${safe(n)}"></textarea>`).join('')}
function addUser(){
 let u=get('users',[]);
 const login=$('uLogin').value.trim();
 if(!login||!$('uSenha').value||!$('uNome').value){
  alert('Preencha login, senha e nome');
  return;
 }
 if(login.toLowerCase()===OWNER_LOGIN){
  alert('Este login é reservado ao Proprietário do sistema.');
  $('uLogin').focus();
  return;
 }
 if(u.some(x=>x.login===login)){
  alert('Login já existe');
  $('uLogin').focus();
  return;
 }
 u.push({
  login,
  senha:$('uSenha').value,
  nivel:$('uNivel').value,
  nome:$('uNome').value,
  matricula:$('uMatricula').value,
  cargo:$('uCargo').value,
  email:$('uEmail').value
 });
 set('users',u);
 renderUsers();
 renderApproverOptions();
 ['uLogin','uSenha','uNome','uMatricula','uCargo','uEmail'].forEach(id=>$(id).value='');
}function renderUsers(){
 const u=get('users',[]);
 $('usersBody').innerHTML=u.map((x,i)=>`<tr><td>${safe(x.login)}</td><td>${safe(x.nome)}</td><td>${safe(x.matricula||'')}</td><td>${safe(x.cargo||'')}</td><td>${safe(x.nivel)}</td><td><button class="light smallBtn" onclick="resetUserPassword(${i})">Nova senha</button> <button class="danger smallBtn" onclick="delUser(${i})">Excluir</button></td></tr>`).join('')
}
function delUser(i){let u=get('users',[]);if(u[i].login==='admin'){alert('O admin inicial não pode ser excluído.');return}u.splice(i,1);set('users',u);renderUsers()}

function normalizeEquipmentKey(value){
 return String(value||'').trim().toLowerCase();
}
function equipmentIdentity(item){
 const serial=normalizeEquipmentKey(item.serie);
 if(serial)return 'SERIAL|'+serial;
 return [
  'NOSERIAL',
  normalizeEquipmentKey(item.tag),
  normalizeEquipmentKey(item.equipamento||item.nome),
  normalizeEquipmentKey(item.fabricante),
  normalizeEquipmentKey(item.modelo)
 ].join('|');
}
function buildEquipmentHistoryIndex(){
 const map=new Map();

 function mergeItem(raw,sourceType,report){
  const item={
   tag:String(raw.tag||'').trim(),
   serie:String(raw.serie||'').trim(),
   equipamento:String(raw.equipamento||raw.nome||'').trim(),
   area:String(raw.area||'').trim(),
   fabricante:String(raw.fabricante||'').trim(),
   modelo:String(raw.modelo||'').trim(),
   codigoSap:String(raw.codigoSap||'').trim(),
   descricaoLonga:String(raw.descricaoLonga||'').trim(),
   sourceType,
   reportCount:0,
   lastReportDate:'',
   lastReportNumber:'',
   lastReportId:''
  };
  if(!item.tag&&!item.serie)return;

  const key=equipmentIdentity(item);
  let current=map.get(key);
  if(!current){
   current={...item};
   map.set(key,current);
  }else{
   ['tag','serie','equipamento','area','fabricante','modelo','codigoSap','descricaoLonga'].forEach(field=>{
    if(!current[field]&&item[field])current[field]=item[field];
   });
  }

  if(report){
   current.reportCount=(current.reportCount||0)+1;
   const reportDate=String(report.data||'');
   if(!current.lastReportDate||reportDate>=current.lastReportDate){
    current.lastReportDate=reportDate;
    current.lastReportNumber=report.numero||'';
    current.lastReportId=report.id||'';
    // Os dados do relatório mais recente têm prioridade para preencher o formulário.
    ['tag','serie','equipamento','area','fabricante','modelo','codigoSap','descricaoLonga'].forEach(field=>{
     if(item[field])current[field]=item[field];
    });
   }
  }
 }

 get('equipments',[]).forEach(eq=>mergeItem(eq,'cadastro',null));
 get('reports',[]).forEach(report=>mergeItem(report,'historico',report));

 return [...map.values()];
}
function formatEquipmentMatch(item){
 const identity=item.serie
  ? `Nº série: ${safe(item.serie)}`
  : `Sem nº de série`;
 const details=[
  item.fabricante,
  item.modelo,
  item.area
 ].filter(Boolean).map(safe).join(' • ');
 const history=item.reportCount
  ? `<span class="equipmentHistoryBadge">${item.reportCount} relatório${item.reportCount===1?'':'s'}</span>`
  : `<span class="equipmentHistoryBadge">sem histórico</span>`;
 const last=item.lastReportNumber
  ? `Última manutenção: ${safe(item.lastReportNumber)}${item.lastReportDate?' — '+brDate(item.lastReportDate):''}`
  : 'Ainda sem relatório salvo';
 return `<button type="button" class="equipmentMatchCard" onclick="selectEquipmentMatch('${encodeURIComponent(equipmentIdentity(item))}')">
  <b>${safe(item.equipamento||'Equipamento sem nome')}</b> ${history}
  <span class="equipmentMatchMeta">TAG: ${safe(item.tag||'—')} • ${identity}${details?' • '+details:''}</span>
  <span class="equipmentMatchMeta">${last}</span>
 </button>`;
}
function findEquipmentMatches(searchValue){
 const value=normalizeEquipmentKey(searchValue);
 if(!value)return [];
 const index=buildEquipmentHistoryIndex();

 // Número de série tem prioridade e normalmente identifica um único equipamento.
 const serialMatches=index.filter(item=>normalizeEquipmentKey(item.serie)===value);
 if(serialMatches.length)return serialMatches;

 // TAG pode retornar vários equipamentos diferentes.
 return index.filter(item=>normalizeEquipmentKey(item.tag)===value);
}
function searchEquipmentHistory(){
 const box=$('equipmentMatchInfo');
 if(!box)return;
 const value=$('equipSearch')?.value||'';
 if(!value.trim()){
  box.classList.add('hidden');
  box.innerHTML='';
  return;
 }

 const matches=findEquipmentMatches(value);
 if(!matches.length){
  box.classList.remove('hidden');
  box.innerHTML=`<div class="equipmentMatchHint">Nenhum equipamento encontrado para esta TAG ou número de série. Você pode continuar o preenchimento manualmente.</div>`;
  return;
 }

 if(matches.length===1){
  box.classList.remove('hidden');
  box.innerHTML=`<div class="equipmentMatchTitle">Equipamento encontrado</div><div class="equipmentMatchList">${formatEquipmentMatch(matches[0])}</div>`;
  return;
 }

 box.classList.remove('hidden');
 box.innerHTML=`<div class="equipmentMatchTitle">${matches.length} equipamentos já utilizaram esta TAG</div>
  <div class="equipmentMatchHint">A TAG pode ser reutilizada. Escolha abaixo o equipamento correto pelo número de série, fabricante ou modelo.</div>
  <div class="equipmentMatchList">${matches.map(formatEquipmentMatch).join('')}</div>`;
}
function selectEquipmentMatch(encodedIdentity){
 const identity=decodeURIComponent(encodedIdentity);
 const item=buildEquipmentHistoryIndex().find(x=>equipmentIdentity(x)===identity);
 if(!item)return;
 $('tag').value=item.tag||'';
 $('equipamento').value=item.equipamento||'';
 $('area').value=item.area||'';
 $('fabricante').value=item.fabricante||'';
 $('modelo').value=item.modelo||'';
 $('serie').value=item.serie||'';
 if($('codigoSap'))$('codigoSap').value=item.codigoSap||'';
 if($('descricaoLonga'))$('descricaoLonga').value=item.descricaoLonga||'';
 $('equipSearch').value=item.serie||item.tag||'';
 const box=$('equipmentMatchInfo');
 if(box){
  box.classList.remove('hidden');
  box.innerHTML=`<div class="equipmentMatchTitle">Equipamento selecionado</div>${formatEquipmentMatch(item)}`;
 }
}

function addEquipment(){
 let equipments=get('equipments',[]);
 const tag=$('eqTag').value.trim(),name=$('eqNome').value.trim(),serial=$('eqSerie').value.trim();
 if(!tag||!name){alert('Informe TAG e equipamento.');return}
 if(serial&&equipments.some(item=>normalizeEquipmentKey(item.serie)===normalizeEquipmentKey(serial))){alert('Já existe um equipamento cadastrado com este número de série.');return}
 equipments.push({
  id:uid(),tag,nome:name,area:$('eqArea').value,fabricante:$('eqFabricante').value,modelo:$('eqModelo').value,serie:serial,
  codigoSap:getSapConfig().enabled?($('eqSap')?.value||'').trim():'',
  descricaoLonga:getSapConfig().enabled?($('eqDescricaoLonga')?.value||'').trim():''
 });
 set('equipments',equipments);
 ['eqTag','eqNome','eqArea','eqFabricante','eqModelo','eqSerie','eqSap','eqDescricaoLonga'].forEach(id=>{if($(id))$(id).value=''});
 renderEquipments();renderEquipmentSelect();renderDashboard();
}function renderEquipments(){
 const equipments=get('equipments',[]);
 $('equipBody').innerHTML=equipments.map((x,i)=>`
  <tr>
   <td>${safe(x.tag)}</td>
   <td>${safe(x.serie||'')}</td>
   <td>${safe(x.nome)}</td>
   <td>${safe(x.area||'')}</td>
   <td>${safe(x.fabricante||'')}</td>
   <td>${safe(x.modelo||'')}</td>
   <td>${getModules().qrcode?'QR-'+safe(x.serie||x.tag):'Desativado'}</td>
   <td><button class="danger smallBtn" onclick="delEquipment(${i})">Excluir</button></td>
  </tr>`).join('');
}function delEquipment(i){let e=get('equipments',[]);if(!confirm('Excluir equipamento?'))return;e.splice(i,1);set('equipments',e);renderEquipments();renderEquipmentSelect();renderDashboard()}function renderEquipmentSelect(){
 const index=buildEquipmentHistoryIndex();
 if($('equipList')){
  const values=[];
  index.forEach(item=>{
   if(item.tag)values.push(item.tag);
   if(item.serie)values.push(item.serie);
  });
  $('equipList').innerHTML=[...new Set(values)].map(v=>`<option value="${safe(v)}"></option>`).join('');
 }
 if($('equipSelect')){
  const registered=get('equipments',[]);
  $('equipSelect').innerHTML='<option value="">Preencher manualmente</option>'+
   registered.map(x=>`<option value="${x.id}">${safe(x.serie||x.tag)} - ${safe(x.nome)}</option>`).join('');
 }
}function fillEquipmentFromSearch(){
 const value=$('equipSearch')?.value||'';
 if(!value.trim())return;

 const matches=findEquipmentMatches(value);
 searchEquipmentHistory();

 if(matches.length===1){
  selectEquipmentMatch(encodeURIComponent(equipmentIdentity(matches[0])));
  return;
 }

 // Em TAG reutilizada não escolhemos o primeiro equipamento automaticamente.
 if(matches.length>1){
  ['tag','equipamento','area','fabricante','modelo','serie'].forEach(id=>{
   if(id==='tag')$(id).value=value.trim();
   else $(id).value='';
  });
 }
}function fillEquipment(){fillEquipmentFromSearch()}
function addExecutorRow(){executors.push({login:'',nome:'',matricula:'',cargo:'',assinatura:''});renderExecutors()}function renderExecutors(){const users=get('users',[]);$('executorsBody').innerHTML=executors.map((e,i)=>`<tr><td><select onchange="selectExecutor(${i},this.value)"><option value="">Selecionar</option>${users.map(u=>`<option value="${safe(u.login)}" ${e.login===u.login?'selected':''}>${safe(u.nome)}</option>`).join('')}</select></td><td><input value="${safe(e.matricula||'')}" oninput="executors[${i}].matricula=this.value"></td><td><input value="${safe(e.cargo||'')}" oninput="executors[${i}].cargo=this.value"></td><td>${e.assinatura?`<img class="sigThumb" src="${e.assinatura}"> <button class="smallBtn ok" onclick="openSignatureModal(${i})">Assinado</button>`:`<button class="smallBtn light" onclick="openSignatureModal(${i})">✍️ Assinar</button>`}</td><td><button class="smallBtn danger" onclick="removeExecutor(${i})">Remover</button></td></tr>`).join('')}function selectExecutor(i,login){const u=get('users',[]).find(x=>x.login===login);executors[i].login=login;if(u){executors[i].nome=u.nome;executors[i].matricula=u.matricula||'';executors[i].cargo=u.cargo||''}renderExecutors()}function removeExecutor(i){executors.splice(i,1);renderExecutors()}function openSignatureModal(i){activeSigIndex=i;$('sigTitle').innerText='Assinatura - '+(executors[i].nome||'Executante')+' (pode virar o celular de lado)';$('signatureModal').classList.remove('hidden');setupSignatureCanvas(executors[i].assinatura)}function closeSignatureModal(){$('signatureModal').classList.add('hidden');activeSigIndex=null}function setupSignatureCanvas(data){
 const c=$('signatureCanvas'),ctx=c.getContext('2d');
 function fitCanvas(){
   const rect=c.getBoundingClientRect();
   const ratio=Math.max(window.devicePixelRatio||1,1);
   c.width=Math.max(1,Math.floor(rect.width*ratio));
   c.height=Math.max(1,Math.floor(rect.height*ratio));
   ctx.setTransform(ratio,0,0,ratio,0,0);
   ctx.lineWidth=5;
   ctx.lineCap='round';
   ctx.lineJoin='round';
   ctx.strokeStyle='#111';
   if(data){
     let img=new Image();
     img.onload=()=>ctx.drawImage(img,0,0,rect.width,rect.height);
     img.src=data;
   }
 }
 setTimeout(fitCanvas,80);
 function pos(e){
   const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;
   return{x:t.clientX-r.left,y:t.clientY-r.top}
 }
 c.onmousedown=c.ontouchstart=e=>{modalDrawing=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()}
 c.onmousemove=c.ontouchmove=e=>{if(!modalDrawing)return;const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault()}
 c.onmouseup=c.onmouseleave=c.ontouchend=()=>{modalDrawing=false}
 window.onresize=()=>{if(!$('signatureModal').classList.contains('hidden'))fitCanvas()}
}function clearModalSignature(){
 const c=$('signatureCanvas'),ctx=c.getContext('2d');
 ctx.clearRect(0,0,c.width,c.height);
}function normalizeSignatureImage(dataUrl, cb){
 const img=new Image();
 img.onload=()=>{
   const portrait=img.height>img.width;
   const targetW=portrait?img.height:img.width;
   const targetH=portrait?img.width:img.height;
   const c=document.createElement('canvas');
   c.width=targetW;
   c.height=targetH;
   const ctx=c.getContext('2d');
   ctx.clearRect(0,0,c.width,c.height);
   if(portrait){
     ctx.translate(targetW,0);
     ctx.rotate(Math.PI/2);
     ctx.drawImage(img,0,0,img.width,img.height);
   }else{
     ctx.drawImage(img,0,0,img.width,img.height);
   }
   cb(c.toDataURL('image/png'));
 };
 img.src=dataUrl;
}
function saveModalSignature(){
 if(activeSigIndex===null)return;
 const data=$('signatureCanvas').toDataURL('image/png');
 normalizeSignatureImage(data,(fixed)=>{
   executors[activeSigIndex].assinatura=fixed;
   renderExecutors();
   closeSignatureModal();
 });
}
function addPhotos(e){
 [...e.target.files].forEach(f=>{
   const reader=new FileReader();
   reader.onload=()=>{
     const img=new Image();
     img.onload=()=>{
       const max=1000;
       let w=img.width, h=img.height;
       if(w>h && w>max){h=Math.round(h*max/w);w=max}
       if(h>=w && h>max){w=Math.round(w*max/h);h=max}
       const canvas=document.createElement('canvas');
       canvas.width=w;canvas.height=h;
       const ctx=canvas.getContext('2d');
       ctx.drawImage(img,0,0,w,h);
       const src=canvas.toDataURL('image/jpeg',0.65);
       photos.push({src,comment:'',categoria:'Evidência'});
       renderPhotos();
     };
     img.src=reader.result;
   };
   reader.readAsDataURL(f);
 });
 e.target.value='';
}
function renderPhotos(){$('photoList').innerHTML=photos.map((p,i)=>`<div class="photo-item"><img src="${p.src}"><label>Categoria</label><select onchange="photos[${i}].categoria=this.value"><option ${p.categoria==='Antes'?'selected':''}>Antes</option><option ${p.categoria==='Durante'?'selected':''}>Durante</option><option ${p.categoria==='Depois'?'selected':''}>Depois</option><option ${p.categoria==='Evidência'?'selected':''}>Evidência</option></select><label>Comentário</label><textarea oninput="photos[${i}].comment=this.value">${safe(p.comment||'')}</textarea><button class="danger smallBtn" onclick="photos.splice(${i},1);renderPhotos()">Remover</button></div>`).join('')}

function loadReportForEdit(id){
 const reps=get('reports',[]);
 const r=reps.find(x=>x.id===id);
 if(!r){alert('Relatório não encontrado.');return}
 if(r.status==='Aprovado'||r.status==='Reprovado'||r.status==='Aguardando aprovação'){
   if(r.status==='Aguardando aprovação'){alert('Relatório aguardando aprovação. Para editar, o gestor deve solicitar correção.');return}
   alert('Relatório '+r.status+' não pode ser editado.');
   return;
 }
 currentEditingId=id;
 $('numero').value=r.numero||'';
 $('dataRelatorio').value=r.data||todayISO();
 if($('dataFim')) $('dataFim').value=r.dataFim||r.data||todayISO();
 $('tipo').value=r.tipo||'Preventiva';
 $('prioridade').value=r.prioridade||'Baixa';
 $('status').value=r.status||'Em elaboração';
 renderApproverOptions(r.aprovador?.login||'');
 $('tag').value=r.tag||'';
 $('equipamento').value=r.equipamento||'';
 $('area').value=r.area||'';
 $('fabricante').value=r.fabricante||'';
 $('modelo').value=r.modelo||'';
 $('serie').value=r.serie||'';
 if($('codigoSap'))$('codigoSap').value=r.codigoSap||'';
 if($('descricaoLonga'))$('descricaoLonga').value=r.descricaoLonga||'';
 $('om').value=r.om||'';
 executors=[...(r.executors||[])];
 photos=[...(r.photos||[])];
 renderExecutors();
 renderPhotos();
 renderTypeFields();
 setTimeout(()=>{(r.typeFields||[]).forEach((tf,i)=>{if($('typeField'+i))$('typeField'+i).value=tf.valor||''});},50);
 $('problemas').value=r.problemas||'';
 $('causas').value=r.causas||'';
 $('acoes').value=r.acoes||'';
 $('obs').value=r.obs||'';
 (r.customValues||[]).forEach(cv=>{if($(cv.id))$(cv.id).value=cv.valor||''});
 if($('correctionNotice')){
   if(r.status==='Correção solicitada' && r.approval?.motivo){
     $('correctionNotice').classList.remove('hidden');
     $('correctionNotice').innerHTML='<b>⚠ Correção solicitada</b><br>'+safe(r.approval.motivo).replace(/\n/g,'<br>');
   }else{
     $('correctionNotice').classList.add('hidden');
     $('correctionNotice').innerHTML='';
   }
 }
 showTab('relatorio');
 alert('Relatório carregado para edição: '+r.numero);
}
function collectTypeFields(){return[...document.querySelectorAll('[id^=typeField]')].map(x=>({nome:x.dataset.typeLabel,valor:x.value})).filter(x=>x.valor)}function collectCustomValues(){return get('customFields',[]).map(f=>({id:f.id,nome:f.nome,tipo:f.tipo,obrigatorio:f.obrigatorio,valor:$(f.id)?.value||''}))}function collectReport(statusOverride){
 return {
  id:uid(),
  numero:$('numero').value,
  data:$('dataRelatorio').value,
  dataFim:$('dataFim')?$('dataFim').value:$('dataRelatorio').value,
  tipo:$('tipo').value,
  prioridade:getWorkflowConfig().showPriority?$('prioridade').value:'',
  aprovador:getSelectedApprover(),
  approvalEnabled:getWorkflowConfig().approvalEnabled,
  status:statusOverride||$('status').value,
  tag:$('tag').value,
  equipamento:$('equipamento').value,
  area:$('area').value,
  fabricante:$('fabricante').value,
  modelo:$('modelo').value,
  serie:$('serie').value,
  codigoSap:getSapConfig().enabled?($('codigoSap')?.value||''):'',
  descricaoLonga:getSapConfig().enabled?($('descricaoLonga')?.value||''):'',
  om:$('om').value,
  executors:[...executors],
  typeFields:collectTypeFields(),
  problemas:$('problemas').value,
  causas:$('causas').value,
  acoes:$('acoes').value,
  obs:$('obs').value,
  customValues:collectCustomValues(),
  photos:[...photos],
  createdBy:currentUser,
  createdAt:new Date().toISOString(),
  approval:null
 }
}
function saveReportWithStatus(st){
 try{
   if(st!=='Em elaboração' && !validateRequired())return;
   if(st==='Aguardando aprovação' && !validateSignaturesForApproval())return;
   if($('status')) $('status').value = st;
   let reps=get('reports',[]);
   if(!currentEditingId) reserveNumberForNewReport();
   let r=collectReport(st);
   r.status = st;
   if(currentEditingId){
     r.id=currentEditingId;
     const old=reps.find(x=>x.id===currentEditingId);
     if(old && old.approval && st==='Aguardando aprovação'){
       r.approval={...old.approval, reenvioEm:new Date().toLocaleString('pt-BR')};
     }
     const idx=reps.findIndex(x=>x.id===currentEditingId);
     if(idx>=0) reps[idx]=r; else reps.push(r);
     currentEditingId=null;
   }else{
     reps.push(r);
   }
   set('reports',reps);
   alert(st==='Aguardando aprovação' ? 'Relatório enviado para aprovação: '+r.numero : 'Relatório salvo: '+r.numero);
   clearForm();
   renderHistory();
   renderApprovals();
   renderDashboard();
   showTab(st==='Aguardando aprovação' ? 'aprovacoes' : 'historico');
 }catch(e){
   alert('Erro ao salvar relatório: '+e.message);
 }
}
function saveDraft(){
 try{
   if($('status')) $('status').value='Em elaboração';
   let reps=get('reports',[]);
   if(!currentEditingId) reserveNumberForNewReport();
   let r=collectReport('Em elaboração');
   r.status='Em elaboração';
   if(currentEditingId){
     r.id=currentEditingId;
     const idx=reps.findIndex(x=>x.id===currentEditingId);
     if(idx>=0) reps[idx]=r; else reps.push(r);
     currentEditingId=null;
   }else{
     reps.push(r);
   }
   set('reports',reps);
   alert('Rascunho salvo: '+r.numero);
   clearForm();
   renderHistory();
   renderApprovals();
   renderDashboard();
   showTab('historico');
 }catch(e){
   alert('Erro ao salvar rascunho: '+e.message);
 }
}function validateSignaturesForApproval(){
 const lista=(executors||[]).filter(e=>e.nome||e.matricula||e.cargo);
 if(!lista.length){
   alert('Adicione pelo menos um executante.');
   return false;
 }
 const pendentes=lista.map((e,i)=>({i:i+1,nome:e.nome||('Executante '+(i+1)),ok:!!e.assinatura})).filter(x=>!x.ok);
 if(pendentes.length){
   alert('Não é possível enviar para aprovação.\n\nAssinatura pendente:\n' + pendentes.map(x=>'Executante '+x.i+' - '+x.nome).join('\n'));
   return false;
 }
 return true;
}
function submitForApproval(){
 const w=getWorkflowConfig();
 if(!validateRequired())return;
 if(!validateSignaturesForApproval())return;
 if(w.approvalEnabled&&w.approverRequired&&!getSelectedApprover()){
  alert('Selecione o aprovador responsável.');
  focusRequiredField('aprovador');
  return;
 }
 const st=w.approvalEnabled?'Aguardando aprovação':'Aprovado';
 if($('status'))$('status').value=st;
 saveReportWithStatus(st);
}function clearForm(){
 ['tag','equipamento','area','fabricante','modelo','serie','codigoSap','descricaoLonga','om','problemas','causas','acoes','obs'].forEach(id=>{if($(id))$(id).value=''});
 if($('equipSearch'))$('equipSearch').value='';
 if($('equipSelect'))$('equipSelect').value='';
 if($('dataRelatorio'))$('dataRelatorio').value=todayISO();
 if($('dataFim'))$('dataFim').value=todayISO();
 if($('tipo'))$('tipo').value='Preventiva';
 if($('prioridade'))$('prioridade').value='Baixa';
 if($('status'))$('status').value='Em elaboração';
 renderApproverOptions();
 applyWorkflowConfig();
 get('customFields',[]).forEach(f=>{if($(f.id))$(f.id).value=''});
 photos=[];
 renderPhotos();
 executors=[{login:currentUser.login,nome:currentUser.nome,matricula:currentUser.matricula||'',cargo:currentUser.cargo||'',assinatura:''}];
 renderExecutors();
 renderTypeFields();
 if($('correctionNotice')){$('correctionNotice').classList.add('hidden');$('correctionNotice').innerHTML=''}
 newReportNumber();

 if($('equipSearch'))$('equipSearch').value='';
 if($('equipmentMatchInfo')){
  $('equipmentMatchInfo').innerHTML='';
  $('equipmentMatchInfo').classList.add('hidden');
 }
}function setHistoryStatusFilter(st){if($('filterStatus'))$('filterStatus').value=st;renderHistory()}
function renderHistory(){let reps=get('reports',[]).slice().reverse(),q=($('searchTerm')?.value||'').toLowerCase(),st=$('filterStatus')?.value||'',tp=$('filterType')?.value||'';reps=reps.filter(r=>(!st||r.status===st)&&(!tp||r.tipo===tp)&&(!q||JSON.stringify([r.numero,r.tag,r.serie,r.equipamento,(r.executors||[]).map(e=>e.nome)]).toLowerCase().includes(q)));$('historyBody').innerHTML=reps.map(r=>`<tr><td>${safe(r.numero)}</td><td>${brDate(r.data)}</td><td>${safe(r.tag)}</td><td>${safe(r.equipamento)}</td><td>${safe((r.executors||[]).map(e=>e.nome).join(', '))}</td><td>${statusBadge(r.status)}</td><td><button class="smallBtn" onclick="printSaved('${r.id}')">PDF</button> <button class="smallBtn light" onclick="loadReportForEdit('${r.id}')">Editar</button> <button class="smallBtn light" onclick="shareReportWhatsApp('${r.id}')">WhatsApp</button></td></tr>`).join('')}function renderApprovals(){
 const w=getWorkflowConfig();
 if(!w.approvalEnabled){
  $('approvalList').innerHTML='<p>A aprovação eletrônica está desativada.</p>';
  return;
 }
 let reports=get('reports',[]).filter(r=>r.status==='Aguardando aprovação'||r.status==='Correção solicitada');
 if(currentUser.nivel==='Gestor'){
  reports=reports.filter(r=>!r.aprovador?.login||r.aprovador.login===currentUser.login);
 }
 $('approvalList').innerHTML=reports.length?reports.map(r=>`
  <div class="approvalBox">
    <b>${safe(r.numero)}</b> — ${safe(r.tag)} / ${safe(r.equipamento)} ${statusBadge(r.status)}
    <br><span class="small">Executantes: ${safe((r.executors||[]).map(e=>e.nome).join(', '))}</span>
    <br><span class="small"><b>Aprovador:</b> ${safe(r.aprovador?.nome||'Não definido')}</span>
    ${r.approval?.motivo?`<br><span class="small"><b>Motivo:</b> ${safe(r.approval.motivo)}</span>`:''}
    <br><br>
    <button class="smallBtn" onclick="printSaved('${r.id}')">Visualizar PDF</button>
    <button class="smallBtn ok" onclick="approveReport('${r.id}')">Aprovar</button>
    <button class="smallBtn danger" onclick="rejectReport('${r.id}')">Reprovar</button>
    <button class="smallBtn warn" onclick="correctionReport('${r.id}')">Solicitar correção</button>
  </div><br>`).join(''):'<p>Nenhuma aprovação pendente para este usuário.</p>';
}
function updateReportStatus(id,status,motivo){
 let reps=get('reports',[]), r=reps.find(x=>x.id===id);
 if(!r)return;
 r.status=status;
 r.approval={status,motivo:motivo||'',gestor:{nome:currentUser.nome,matricula:currentUser.matricula||'',cargo:currentUser.cargo||''},data:new Date().toLocaleString('pt-BR')};
 set('reports',reps);
 renderApprovals();
 renderHistory();
 renderDashboard();
 alert('Status atualizado: '+status);
 if(status==='Aprovado'||status==='Reprovado') showTab('historico');
}function approveReport(id){
 if(!isManagerOrAdmin()){alert('Apenas gestor ou administrador pode aprovar.');return}
 const r=get('reports',[]).find(x=>x.id===id);
 if(currentUser.nivel==='Gestor'&&r?.aprovador?.login&&r.aprovador.login!==currentUser.login){
  alert('Este relatório foi destinado a outro aprovador.');
  return;
 }
 updateReportStatus(id,'Aprovado','');
}function rejectReport(id){if(!isManagerOrAdmin()){alert('Apenas gestor ou administrador pode reprovar.');return}const m=prompt('Informe o motivo da reprovação:');if(m===null||!m.trim())return;updateReportStatus(id,'Reprovado',m)}function correctionReport(id){if(!isManagerOrAdmin()){alert('Apenas gestor ou administrador pode solicitar correção.');return}const m=prompt('Informe o que precisa ser corrigido:');if(m===null||!m.trim())return;updateReportStatus(id,'Correção solicitada',m)}
function sec(t,v){return v?`<div class="pdfSectionTitle">${safe(t)}</div><div class="pdfText">${safe(v)}</div>`:''}function reportHTML(r){
 const c=get('company',{}),m=getModules(),w=getWorkflowConfig();
 const sk=statusKey(r.status);
 const approvalEnabled=r.approvalEnabled!==undefined?r.approvalEnabled:w.approvalEnabled;
 const typeSecs=(r.typeFields||[]).map(x=>sec(x.nome,x.valor)).join('');
 const custom=(r.customValues||[]).filter(x=>x.valor).map(x=>sec(x.nome,x.valor)).join('');
 const photoRows=(r.photos||[]).map((p,i)=>`${i%2===0?'<tr>':''}<td><img src="${p.src}"><div class="pdfCaption"><b>${safe(p.categoria||'Evidência')}:</b> ${safe(p.comment||'')}</div></td>${i%2===1?'</tr>':''}`).join('')+((r.photos||[]).length%2?'<td></td></tr>':'');
 const approval=approvalEnabled&&r.approval?`<div class="pdfApproval"><b>Status da aprovação:</b> ${safe(r.approval.status)}<br><b>Gestor:</b> ${safe(r.approval.gestor?.nome||'')} — ${safe(r.approval.gestor?.cargo||'')}<br><b>Data/hora:</b> ${safe(r.approval.data||'')}${r.approval.motivo?`<br><b>Comentário:</b> ${safe(r.approval.motivo)}`:''}</div>`:'';
 const qr=m.qrcode?`<div class="pdfQr"><div class="qrBox">QR CODE<br>${safe(r.numero)}</div><div><b>Validação digital do relatório</b><br>Na versão profissional, este QR Code abrirá o relatório original no sistema.<br><b>Relatório:</b> ${safe(r.numero)}<br><b>Equipamento:</b> ${safe(r.tag||r.serie||r.equipamento)}</div></div>`:'';
 const signCards=(r.executors||[]).map((e,i)=>`<div class="pdfSignCard">
  <div class="pdfSignRole">EXECUTANTE ${i+1}</div>
  <div class="pdfSignSpace">${e.assinatura?`<img class="pdfSignImgCard" src="${e.assinatura}">`:''}</div>
  <div class="pdfSignLine"></div>
  <div class="pdfSignName">${safe(e.nome)}</div>
  <div class="pdfSignMeta">${safe(e.cargo)}${e.cargo&&e.matricula?' - ':''}${e.matricula?'Mat.: '+safe(e.matricula):''}</div>
 </div>`).join('');
 let watermark='';
 if(w.watermarkMode==='status')watermark=r.status||'';
 if(w.watermarkMode==='area')watermark=r.area||'';
 if(w.watermarkMode==='sector')watermark=c.setor||'';
 const watermarkHtml=w.watermarkMode==='none'||!watermark?'':`<div class="pdfWmLayer">${w.watermarkMode==='status'?`<div class="pdfWmStatus wm-${sk}">${safe(watermark)}</div>`:`<div class="pdfWmText">${safe(watermark)}</div>`}</div>`;
 const statusMeta=w.showStatus?`<div><b>Status:</b> ${safe(r.status)}</div><div class="pdfStatusSeal seal-${sk}">${safe(r.status)}</div>`:'';
 const priorityCell=w.showPriority&&r.prioridade?`<td><b>Prioridade:</b> ${safe(r.prioridade)}</td>`:'';
 const manager=approvalEnabled?`<div class="pdfSignCard pdfSignManager">
  <div class="pdfSignRole">RESPONSÁVEL TÉCNICO / GESTOR</div>
  <div class="pdfSignSpace">${r.approval?.status==='Aprovado'?'Assinado eletronicamente':''}</div>
  <div class="pdfSignLine"></div>
  <div class="pdfSignName">${safe(r.aprovador?.nome||c.gestor||'')}</div>
  <div class="pdfSignMeta">${safe(r.aprovador?.cargo||c.gestorCargo||'')}</div>
 </div>`:'';
 return `<div class="reportPaper">
  ${watermarkHtml}
  <div class="reportContent">
  <div class="pdfHead">
    <div class="pdfLogo">${c.logo?`<img src="${c.logo}">`:''}</div>
    <div class="pdfTitle"><div>${safe(c.nome||'NOME DA EMPRESA')}</div><div>${safe(c.setor||'')}</div><div>RELATÓRIO DE MANUTENÇÃO</div>${c.endereco?`<div style="font-size:8pt;color:#000;margin-top:1mm">${safe(c.endereco)}</div>`:''}</div>
    <div class="pdfMeta"><div><b>Relatório:</b><br>${safe(r.numero)}</div>${statusMeta}</div>
  </div>
  <div class="pdfSectionTitle">Dados gerais</div>
  <table class="pdfTable"><tr><td><b>Tipo:</b> ${safe(r.tipo)}</td>${priorityCell}<td><b>Data início:</b> ${brDate(r.data)}</td><td><b>Data fim:</b> ${brDate(r.dataFim||r.data)}</td></tr></table>
  <div class="pdfSectionTitle">Dados do equipamento</div>
  <table class="pdfTable"><tr><td><b>TAG:</b> ${safe(r.tag)}</td><td><b>Equipamento:</b> ${safe(r.equipamento)}</td><td><b>Área/Sistema:</b> ${safe(r.area)}</td></tr><tr><td><b>Fabricante:</b> ${safe(r.fabricante)}</td><td><b>Modelo:</b> ${safe(r.modelo)}</td><td><b>Nº série:</b> ${safe(r.serie)}</td></tr>${(r.codigoSap||r.descricaoLonga)?`<tr><td><b>Código SAP:</b> ${safe(r.codigoSap||'')}</td><td colspan="2"><b>Descrição longa:</b> ${safe(r.descricaoLonga||'')}</td></tr>`:'' }<tr><td colspan="3"><b>OM/OS:</b> ${safe(r.om)}</td></tr></table>
  ${typeSecs}${sec('Problemas identificados',r.problemas)}${sec('Possíveis causas',r.causas)}${sec('Ações executadas',r.acoes)}${sec('Observações finais',r.obs)}${custom}
  ${(r.photos||[]).length?`<div class="pdfSectionTitle">Evidências fotográficas</div><table class="pdfPhotos">${photoRows}</table>`:''}
  <div class="pdfFinalBlock">
    <div class="pdfSignSection">
      <div class="pdfSectionTitle">Assinaturas</div>
      <div class="pdfSignCards">${signCards}${manager}</div>
    </div>
    ${approval}
    <div class="pdfEndBlock">
      ${qr}
      <div class="pdfFooter">
        <div>Documento gerado pelo Sistema de Relatórios de Manutenção</div>
        <div>Relatório: ${safe(r.numero)} | Versão: 8.8 | Emitido em: ${emitidoEm()}</div>
      </div>
    </div>
  </div>
  </div>
 </div>`;
}function openReportInNewTab(r){
 const report = reportHTML(r);
 const styleTags = window.REPORT_APP_CSS || Array.from(document.styleSheets).map(sheet=>{
   try{return Array.from(sheet.cssRules||[]).map(rule=>rule.cssText).join('\n')}
   catch(error){return ''}
 }).join('\n');
 const title = 'Relatório ' + (r.numero || '');
 const w = window.open('', '_blank');
 if(!w){
   alert('O navegador bloqueou a nova aba. Permita pop-ups para este arquivo ou toque em Gerar PDF novamente.');
   return;
 }
 w.document.open();
 w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${styleTags}
html,body{background:#fff;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111}
.pdfViewerActions{
  position:sticky;
  top:0;
  z-index:99999;
  display:flex;
  gap:8px;
  justify-content:center;
  padding:10px;
  background:#eef2f7;
  border-bottom:1px solid #cbd5e1;
}
.pdfViewerActions button{
  border:0;
  border-radius:8px;
  padding:10px 16px;
  font-weight:700;
  cursor:pointer;
}
.pdfViewerPrint{background:#001f8f;color:#fff}
.pdfViewerClose{background:#e5e7eb;color:#111827}
.reportPaper{margin:0 auto}
@media print{
  html,body{background:#fff;margin:0;padding:0}
  .pdfViewerActions{display:none!important}
  .reportPaper{margin:0 auto}
}

/* V6.7 - assinatura profissional mobile */
.modal{padding:0!important;align-items:stretch!important;justify-content:stretch!important}
.modalBox{width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;border-radius:0!important}
.modalHead{flex:0 0 auto!important}
.modalBody{flex:1!important;padding:10px!important;min-height:0!important}
#signatureCanvas{width:100%!important;height:100%!important;min-height:calc(100dvh - 130px)!important;border:2px dashed #777!important}
.modalFoot{flex:0 0 auto!important}
.pdfSignCards{display:grid!important;grid-template-columns:1fr 1fr!important;gap:5mm!important;margin-top:2mm!important;break-inside:avoid!important;page-break-inside:avoid!important}
.pdfSignCard{border:0!important;outline:0!important;min-height:42mm!important;padding:2mm!important;text-align:center!important;display:flex!important;flex-direction:column!important;justify-content:flex-end!important;break-inside:avoid!important;page-break-inside:avoid!important}
.pdfSignRole{font-weight:800!important;font-size:8pt!important;text-transform:uppercase!important;margin-bottom:2mm!important}
.pdfSignSpace{height:25mm!important;display:flex!important;align-items:center!important;justify-content:center!important}
.pdfSignImgCard{height:25mm!important;max-width:92%!important;object-fit:contain!important}
.pdfSignLine{border-top:1px solid #000!important;margin:1mm 6mm .8mm!important}
.pdfSignName{font-weight:800!important;font-size:8.5pt!important}
.pdfSignMeta{font-size:7.5pt!important}
.pdfSignManager{grid-column:1 / -1!important;width:95mm!important;max-width:100%!important;justify-self:center!important}
@media print{.pdfSignCard{border:0!important;outline:0!important;min-height:42mm!important}.pdfSignSpace{height:25mm!important}.pdfSignImgCard{height:25mm!important;max-width:92%!important}}


/* V6.8 - assinatura sobre a linha */
.pdfSignCard{
  min-height:34mm!important;
}
.pdfSignSpace{
  height:18mm!important;
  align-items:flex-end!important;
  padding-bottom:0!important;
}
.pdfSignImgCard{
  height:18mm!important;
  max-width:92%!important;
  object-fit:contain!important;
  display:block!important;
  margin-bottom:-1mm!important;
}
.pdfSignLine{
  margin:0 6mm .8mm!important;
}
.pdfSignManager .pdfSignSpace{
  height:14mm!important;
}
@media print{
  .pdfSignCard{min-height:34mm!important}
  .pdfSignSpace{height:18mm!important;align-items:flex-end!important}
  .pdfSignImgCard{height:18mm!important;margin-bottom:-1mm!important}
  .pdfSignLine{margin:0 6mm .8mm!important}
}


/* V6.9 - assinatura sobre a linha */
.pdfSignSpace{
  height:18mm!important;
  align-items:flex-end!important;
  justify-content:center!important;
  padding-bottom:0!important;
  overflow:visible!important;
}
.pdfSignImgCard{
  height:18mm!important;
  max-width:92%!important;
  object-fit:contain!important;
  display:block!important;
  transform:translateY(4mm)!important;
  margin-bottom:0!important;
}
.pdfSignLine{
  border-top:1px solid #000!important;
  margin:0 6mm .8mm!important;
  position:relative!important;
  z-index:3!important;
}
.pdfSignName,
.pdfSignMeta{
  position:relative!important;
  z-index:4!important;
}
.pdfSignCard{
  overflow:visible!important;
}
.pdfSignManager .pdfSignSpace{
  height:14mm!important;
}
.pdfSignManager .pdfSignSpace:not(:empty){
  align-items:flex-end!important;
}
@media print{
  .pdfSignSpace{
    height:18mm!important;
    align-items:flex-end!important;
    overflow:visible!important;
  }
  .pdfSignImgCard{
    height:18mm!important;
    transform:translateY(4mm)!important;
  }
  .pdfSignLine{
    margin:0 6mm .8mm!important;
  }
}


.sigThumb{
  height:34px!important;
  max-width:130px!important;
  object-fit:contain!important;
}

</style>
</head>
<body>
<div class="pdfViewerActions">
  <button class="pdfViewerPrint" onclick="window.print()">Salvar / Imprimir PDF</button>
  <button class="pdfViewerClose" onclick="window.close()">Fechar</button>
</div>
${report}
<script>
document.title=${JSON.stringify(title)};
<\/script>
</body>
</html>`);
 w.document.close();
}
function preparePrint(r){
 document.title='Relatório '+r.numero;
 openReportInNewTab(r);
 document.title='Gerador de Relatórios de Manutenção';
}function generatePDF(){
 if(!validateRequired())return;
 const r=collectReport($('status').value);
 preparePrint(r);
}function printSaved(id){
 const r=get('reports',[]).find(x=>x.id===id);
 if(!r){alert('Relatório não encontrado');return}
 preparePrint(r);
}function sendEmail(){const r=collectReport($('status').value),c=get('company',{});location.href=`mailto:${c.email||''}?subject=${encodeURIComponent('Relatório de Manutenção '+r.numero)}&body=${encodeURIComponent('Segue relatório de manutenção '+r.numero+'.\n\nEquipamento: '+r.tag+' - '+r.equipamento+'\nStatus: '+r.status+'\n\nSalve o PDF como: Relatório '+r.numero+'.pdf')}`}function shareWhatsApp(){const r=collectReport($('status').value);openWhatsApp(r)}function shareReportWhatsApp(id){const r=get('reports',[]).find(x=>x.id===id);if(r)openWhatsApp(r)}function openWhatsApp(r){const msg=`Relatório de Manutenção ${r.numero}%0AEquipamento: ${encodeURIComponent(r.tag+' - '+r.equipamento)}%0AStatus: ${encodeURIComponent(r.status)}%0A%0AObs.: gere/anexe o PDF "Relatório ${r.numero}.pdf".`;window.open('https://wa.me/?text='+msg,'_blank')}
init();const saved=sessionStorage.getItem('currentUser');if(saved){currentUser=JSON.parse(saved);openApp()}

document.addEventListener('input',event=>{if(['cfgReportPrefix','cfgNumberTemplate','cfgSequenceDigits'].includes(event.target?.id))previewNumbering();});
