
let currentEditingId=null;
const $=id=>document.getElementById(id);let currentUser=null,photos=[],executors=[],activeSigIndex=null,modalDrawing=false;function get(k,d){return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}function set(k,v){localStorage.setItem(k,JSON.stringify(v))}function safe(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function uid(){return'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)}function todayISO(){return new Date().toISOString().slice(0,10)}function brDate(d){if(!d)return'';let p=d.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d}
function statusKey(s){
 return {'Em elaboração':'draft','Aguardando aprovação':'wait','Correção solicitada':'corr','Aprovado':'ok','Reprovado':'bad','Concluído':'done'}[s]||'draft';
}
function emitidoEm(){
 return new Date().toLocaleString('pt-BR');
}

function statusClass(s){return{'Em elaboração':'st-draft','Aguardando aprovação':'st-wait','Aprovado':'st-ok','Reprovado':'st-bad','Correção solicitada':'st-corr','Concluído':'st-done'}[s]||'st-draft'}function statusBadge(s){return`<span class="status ${statusClass(s)}">${safe(s)}</span>`}


const workflowDefaults={
 approvalEnabled:true,
 signatureRequired:true,
 priorityEnabled:true,
 prefixes:['RM'],
 watermarkMode:'auto'
};
function getWorkflowConfig(){
 const saved=get('workflowConfig',workflowDefaults);
 const prefixes=Array.isArray(saved.prefixes)?saved.prefixes:['RM'];
 return {...workflowDefaults,...saved,prefixes:prefixes.length?prefixes:['RM']};
}
function normalizePrefix(v){
 return String(v||'RM').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'RM';
}
function loadWorkflowConfig(){
 const c=getWorkflowConfig();
 if($('cfgApprovalEnabled'))$('cfgApprovalEnabled').checked=!!c.approvalEnabled;
 if($('cfgSignatureRequired'))$('cfgSignatureRequired').checked=!!c.signatureRequired;
 if($('cfgPriorityEnabled'))$('cfgPriorityEnabled').checked=!!c.priorityEnabled;
 if($('cfgPrefixes'))$('cfgPrefixes').value=c.prefixes.join(', ');
 if($('cfgWatermarkMode'))$('cfgWatermarkMode').value=c.watermarkMode||'auto';
 renderPrefixOptions();
 renderApproverOptions();
 applyWorkflowConfig();
}
function saveWorkflowConfig(){
 const prefixes=[...new Set(($('cfgPrefixes').value||'RM').split(',').map(normalizePrefix).filter(Boolean))];
 if(!prefixes.length){alert('Informe pelo menos um prefixo.');return}
 const c={
  approvalEnabled:$('cfgApprovalEnabled').checked,
  signatureRequired:$('cfgSignatureRequired').checked,
  priorityEnabled:$('cfgPriorityEnabled').checked,
  prefixes,
  watermarkMode:$('cfgWatermarkMode').value||'auto'
 };
 set('workflowConfig',c);
 renderPrefixOptions();
 renderApproverOptions();
 applyWorkflowConfig();
 newReportNumber();
 alert('Configuração do relatório salva.');
}
function renderPrefixOptions(selected){
 const c=getWorkflowConfig(),el=$('reportPrefix');
 if(!el)return;
 const current=selected||el.value||c.prefixes[0];
 el.innerHTML=c.prefixes.map(p=>`<option value="${safe(p)}">${safe(p)}</option>`).join('');
 el.value=c.prefixes.includes(current)?current:c.prefixes[0];
}
function renderApproverOptions(selected){
 const el=$('aprovador');if(!el)return;
 const users=get('users',[]).filter(u=>['Gestor','Administrador'].includes(u.nivel));
 const current=selected||el.value||'';
 el.innerHTML='<option value="">Selecione o aprovador</option>'+users.map(u=>`<option value="${safe(u.login)}">${safe(u.nome)} — ${safe(u.cargo||u.nivel)}</option>`).join('');
 if(users.some(u=>u.login===current))el.value=current;
}
function applyWorkflowConfig(){
 const c=getWorkflowConfig();
 if($('wrapPrioridade'))$('wrapPrioridade').classList.toggle('hidden',!c.priorityEnabled);
 if($('wrapAprovador'))$('wrapAprovador').classList.toggle('hidden',!c.approvalEnabled);
 if($('navAprov'))$('navAprov').style.display=(getModules().aprovacao&&c.approvalEnabled)?'inline-block':'none';
 if($('submitApprovalBtn'))$('submitApprovalBtn').textContent=c.approvalEnabled?'Enviar para aprovação':'Finalizar relatório';
}
function selectedApprover(){
 const login=$('aprovador')?.value||'';
 const u=get('users',[]).find(x=>x.login===login);
 return u?{login:u.login,nome:u.nome,matricula:u.matricula||'',cargo:u.cargo||'',email:u.email||''}:null;
}

const equipmentIdDefaults={tag:true,serie:true,sap:false,manual:true,descricao:true};
function getEquipmentIdConfig(){return {...equipmentIdDefaults,...get('equipmentIdConfig',equipmentIdDefaults)}}
function loadEquipmentIdConfig(){
 const c=getEquipmentIdConfig();
 if($('cfgBuscaTag'))$('cfgBuscaTag').checked=!!c.tag;
 if($('cfgBuscaSerie'))$('cfgBuscaSerie').checked=!!c.serie;
 if($('cfgBuscaSap'))$('cfgBuscaSap').checked=!!c.sap;
 if($('cfgManual'))$('cfgManual').checked=!!c.manual;
 if($('cfgMostrarDescricao'))$('cfgMostrarDescricao').checked=!!c.descricao;
 applyEquipmentIdConfig();
}
function saveEquipmentIdConfig(){
 const c={tag:$('cfgBuscaTag').checked,serie:$('cfgBuscaSerie').checked,sap:$('cfgBuscaSap').checked,manual:$('cfgManual').checked,descricao:$('cfgMostrarDescricao').checked};
 if(!c.tag&&!c.serie&&!c.sap&&!c.manual){alert('Ative pelo menos uma forma de identificação.');return}
 set('equipmentIdConfig',c);applyEquipmentIdConfig();renderEquipmentSelect();renderEquipments();alert('Configuração de identificação salva.');
}
function applyEquipmentIdConfig(){
 const c=getEquipmentIdConfig();
 ['wrapTag','wrapEqTag'].forEach(id=>{if($(id))$(id).style.display=c.tag?'block':'none'});
 ['wrapSerie','wrapEqSerie'].forEach(id=>{if($(id))$(id).style.display=c.serie?'block':'none'});
 ['wrapSap','wrapEqSap'].forEach(id=>{if($(id))$(id).style.display=c.sap?'block':'none'});
 ['wrapDescricao','wrapEqDescricao'].forEach(id=>{if($(id))$(id).style.display=c.descricao?'block':'none'});
 if($('equipSearchHint'))$('equipSearchHint').style.display=c.manual?'block':'none';
 if($('equipSearch')){
  const p=[];if(c.tag)p.push('TAG');if(c.serie)p.push('número de série');if(c.sap)p.push('código SAP');if(c.descricao)p.push('descrição');
  $('equipSearch').placeholder='Digite '+p.join(', ');
 }
}

const standardFields=[['tag','TAG'],['equipamento','Equipamento'],['area','Área / Sistema'],['fabricante','Fabricante'],['modelo','Modelo'],['serie','Nº de série'],['om','OM / OS'],['problemas','Problemas identificados'],['causas','Possíveis causas'],['acoes','Ações executadas'],['obs','Observações finais']];const moduleDefaults={equipamentos:true,aprovacao:true,qrcode:true,whatsapp:true,email:true,camposPorTipo:true};const moduleLabels={equipamentos:'Cadastro de equipamentos',aprovacao:'Aprovação eletrônica',qrcode:'QR Code',whatsapp:'Compartilhamento WhatsApp',email:'Compartilhamento E-mail',camposPorTipo:'Campos por tipo de relatório'};

const OWNER_ACCOUNT={login:'proprietario',senha:'1234',nivel:'Proprietário',nome:'Proprietário do Sistema',matricula:'',cargo:'Proprietário',email:'',isOwner:true};
function isFullAdmin(){return !!currentUser&&['Administrador','Proprietário'].includes(currentUser.nivel)}
function setLoginMessage(text,type='error'){const el=$('loginMessage');if(!el)return;el.textContent=text||'';el.className='loginMessage '+(text?type:'')}
function authenticateUser(loginValue,passwordValue){
 const login=String(loginValue||'').trim(),senha=String(passwordValue||'');
 if(login===OWNER_ACCOUNT.login&&senha===OWNER_ACCOUNT.senha)return {...OWNER_ACCOUNT};
 return get('users',[]).find(x=>String(x.login||'').trim()===login&&String(x.senha||'')===senha)||null;
}
function installLoginHandlers(){
 const button=$('loginButton'),user=$('loginUser'),password=$('loginPass');
 if(button&&!button.dataset.bound){button.addEventListener('click',login);button.dataset.bound='1'}
 [user,password].forEach(el=>{if(el&&!el.dataset.enterBound){el.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();login()}});el.dataset.enterBound='1'}})
}

function init(){installLoginHandlers();if(!localStorage.getItem('users'))set('users',[{login:'admin',senha:'1234',nivel:'Administrador',nome:'Administrador',matricula:'0000',cargo:'Administrador',email:''}]);if(!localStorage.getItem('company'))set('company',{nome:'NOME DA EMPRESA',setor:'OFICINA CENTRAL MECÂNICA / ELÉTRICA E INSTRUMENTAÇÃO',endereco:'',email:'',gestor:'Responsável Técnico',gestorCargo:'Cargo / Matrícula',logo:''});if(!localStorage.getItem('customFields'))set('customFields',[]);if(!localStorage.getItem('requiredFields'))set('requiredFields',['tag','equipamento','acoes']);if(!localStorage.getItem('modules'))set('modules',moduleDefaults);if(!localStorage.getItem('equipments'))set('equipments',[]);$('dataRelatorio').value=todayISO();if($('dataFim'))$('dataFim').value=todayISO();
 $('dataFim').value=todayISO();
 updatePeriodoInfo();loadCompany();renderModulesConfig();renderRequiredFieldsConfig();renderCustomFieldsConfig();renderCustomFieldsForm();renderUsers();renderEquipments();renderEquipmentSelect();renderDashboard();renderTypeFields();loadEquipmentIdConfig();loadWorkflowConfig()}function login(){
 try{
  setLoginMessage('');
  const user=$('loginUser'),password=$('loginPass');
  if(!user||!password){setLoginMessage('Não foi possível carregar os campos de login.');return false}
  if(!user.value.trim()||!password.value){setLoginMessage('Preencha o usuário e a senha.');return false}
  const authenticated=authenticateUser(user.value,password.value);
  if(!authenticated){setLoginMessage('Usuário ou senha inválidos.');password.focus();password.select();return false}
  currentUser=authenticated;sessionStorage.setItem('currentUser',JSON.stringify(authenticated));setLoginMessage('Acesso autorizado.','ok');openApp();return true;
 }catch(error){console.error(error);setLoginMessage('Erro ao entrar: '+(error.message||error));return false}
}function openApp(){$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');$('userInfo').innerHTML=`${safe(currentUser.nome)} - ${safe(currentUser.nivel)}${currentUser.isOwner?'<span class="ownerBadge">PROPRIETÁRIO</span>':''}`;$('executorBadge').innerText=`Usuário: ${currentUser.nome}`;document.querySelectorAll('.adminOnly').forEach(el=>el.style.display=isFullAdmin()?'inline-block':'none');applyModules();if(executors.length===0)executors=[{login:currentUser.login,nome:currentUser.nome,matricula:currentUser.matricula||'',cargo:currentUser.cargo||'',assinatura:''}];renderExecutors();newReportNumber();showTab('dashboard')}function startNewReport(){
 currentEditingId=null;
 clearForm();
 if($('status')) $('status').value='Em elaboração';
 showTab('relatorio');
}
function logout(){sessionStorage.removeItem('currentUser');location.reload()}
function changeMyPassword(){const nova=prompt('Digite a nova senha:');if(!nova||nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}let users=get('users',[]),u=users.find(x=>x.login===currentUser.login);if(u){u.senha=nova;set('users',users);alert('Senha alterada com sucesso.')}}
function resetUserPassword(i){if(!isFullAdmin()){alert('Apenas administrador pode redefinir senha.');return}const nova=prompt('Nova senha para este usuário:');if(!nova||nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}let users=get('users',[]);users[i].senha=nova;set('users',users);alert('Senha redefinida.')}
function changeMyPassword(){
 const nova=prompt('Digite a nova senha:');
 if(!nova || nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}
 let users=get('users',[]), u=users.find(x=>x.login===currentUser.login);
 if(u){u.senha=nova;set('users',users);alert('Senha alterada com sucesso.')}
}
function resetUserPassword(i){
 if(!isFullAdmin()){alert('Apenas administrador pode redefinir senha.');return}
 const nova=prompt('Nova senha para este usuário:');
 if(!nova || nova.length<4){alert('A senha deve ter pelo menos 4 caracteres.');return}
 let users=get('users',[]);
 users[i].senha=nova;set('users',users);alert('Senha redefinida.');
}function showTab(t){document.querySelectorAll('.tab').forEach(x=>x.classList.add('hidden'));$('tab-'+t).classList.remove('hidden');if(t==='dashboard')renderDashboard();if(t==='historico')renderHistory();if(t==='aprovacoes')renderApprovals();if(t==='equipamentos')renderEquipments();if(t==='config'){loadCompany();renderRequiredFieldsConfig();renderCustomFieldsConfig();renderModulesConfig();loadEquipmentIdConfig();loadWorkflowConfig()}}function getModules(){return{...moduleDefaults,...get('modules',moduleDefaults)}}function applyModules(){
 const m=getModules(),w=getWorkflowConfig();
 $('navEquip').style.display=m.equipamentos?'inline-block':'none';
 $('navAprov').style.display=(m.aprovacao&&w.approvalEnabled)?'inline-block':'none';
}function renderModulesConfig(){const m=getModules();$('modulesArea').innerHTML=Object.keys(moduleLabels).map(k=>`<label class="moduleItem"><input type="checkbox" class="moduleCheck" value="${k}" ${m[k]?'checked':''}> ${moduleLabels[k]}</label>`).join('')}function saveModules(){const m={};document.querySelectorAll('.moduleCheck').forEach(x=>m[x.value]=x.checked);set('modules',m);applyModules();alert('Módulos salvos')}function yymm(){const d=new Date($('dataRelatorio').value||todayISO());return String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,'0')}function newReportNumber(){
 const reps=get('reports',[]),ym=yymm(),c=getWorkflowConfig();
 const prefix=normalizePrefix($('reportPrefix')?.value||c.prefixes[0]);
 const base=prefix+'-'+ym+'-';
 const seq=reps.filter(r=>r.numero&&r.numero.startsWith(base)).length+1;
 $('numero').value=base+String(seq).padStart(3,'0');
}$('dataRelatorio').addEventListener('change',()=>{newReportNumber();updatePeriodoInfo()});
$('dataFim').addEventListener('change',updatePeriodoInfo);
function updatePeriodoInfo(){
 const ini=$('dataRelatorio')?.value, fim=$('dataFim')?.value;
 if(!$('periodoInfo'))return;
 if(!ini&&!fim){$('periodoInfo').value='';return}
 $('periodoInfo').value=(ini===fim||!fim)?brDate(ini):(brDate(ini)+' até '+brDate(fim));
}
function renderDashboard(){
 const reps=get('reports',[]),eq=get('equipments',[]),ym=yymm();
 $('kpiMes').innerText=reps.filter(r=>r.numero&&r.numero.split('-')[1]===ym).length;
 $('kpiPend').innerText=reps.filter(r=>r.status==='Aguardando aprovação').length;
 $('kpiOk').innerText=reps.filter(r=>r.status==='Aprovado'||r.status==='Concluído').length;
 $('kpiEqp').innerText=eq.length;
}function loadLogo(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('empLogoPreview').src=r.result;$('empLogoPreview').dataset.logo=r.result};r.readAsDataURL(f)}function loadCompany(){const c=get('company',{});$('empNome').value=c.nome||'';$('empSetor').value=c.setor||'';if($('empEndereco'))$('empEndereco').value=c.endereco||'';$('empEmail').value=c.email||'';$('empGestor').value=c.gestor||'';$('empGestorCargo').value=c.gestorCargo||'';$('empLogoPreview').src=c.logo||'';$('empLogoPreview').dataset.logo=c.logo||''}function saveCompany(){set('company',{nome:$('empNome').value,setor:$('empSetor').value,endereco:$('empEndereco')?$('empEndereco').value:'',email:$('empEmail').value,gestor:$('empGestor').value,gestorCargo:$('empGestorCargo').value,logo:$('empLogoPreview').dataset.logo||''});alert('Empresa salva')}
function renderRequiredFieldsConfig(){const req=get('requiredFields',[]);$('requiredFieldsArea').innerHTML=standardFields.map(([id,label])=>`<label class="moduleItem"><input type="checkbox" class="reqCheck" value="${id}" ${req.includes(id)?'checked':''}> ${label}</label>`).join('')}function saveRequiredFields(){set('requiredFields',[...document.querySelectorAll('.reqCheck:checked')].map(x=>x.value));alert('Campos obrigatórios salvos')}function validateRequired(){let missing=[],req=get('requiredFields',[]);req.forEach(id=>{if(!($(id)?.value||'').trim())missing.push((standardFields.find(x=>x[0]===id)||[])[1]||id)});get('customFields',[]).forEach(f=>{if(f.obrigatorio&&!($(f.id)?.value||'').trim())missing.push(f.nome)});if(executors.length===0||!executors.some(e=>e.nome))missing.push('Executantes');if(missing.length){alert('Preencha os campos obrigatórios: '+missing.join(', '));return false}return true}function addCustomField(){const nome=$('cfNome').value.trim();if(!nome){alert('Informe o nome do campo');return}let f=get('customFields',[]);f.push({id:'cf_'+Date.now(),nome,tipo:$('cfTipo').value,obrigatorio:$('cfObrigatorio').value==='sim'});set('customFields',f);$('cfNome').value='';renderCustomFieldsConfig();renderCustomFieldsForm()}function delCustomField(i){let f=get('customFields',[]);if(!confirm('Excluir campo?'))return;f.splice(i,1);set('customFields',f);renderCustomFieldsConfig();renderCustomFieldsForm()}function renderCustomFieldsConfig(){const f=get('customFields',[]);$('customFieldsBody').innerHTML=f.map((x,i)=>`<tr><td>${safe(x.nome)}</td><td>${x.tipo}</td><td>${x.obrigatorio?'Sim':'Não'}</td><td><button class="danger smallBtn" onclick="delCustomField(${i})">Excluir</button></td></tr>`).join('')}function renderCustomFieldsForm(){const f=get('customFields',[]);$('customFieldsArea').innerHTML=f.length?'<h3>Campos personalizados</h3>'+f.map(x=>x.tipo==='textarea'?`<label>${safe(x.nome)}${x.obrigatorio?' *':''}</label><textarea id="${x.id}"></textarea>`:`<label>${safe(x.nome)}${x.obrigatorio?' *':''}</label><input id="${x.id}" type="${x.tipo}">`).join(''):''}function renderTypeFields(){const m=getModules();if(!m.camposPorTipo){$('typeFieldsArea').innerHTML='';return}const tipo=$('tipo').value,map={'Inspeção':['Itens inspecionados','Conformidades','Não conformidades'],'Teste':['Parâmetros medidos','Resultado do teste','Conclusão'],'Preventiva':['Atividades preventivas realizadas'],'Corretiva':['Sintoma da falha','Correção aplicada'],'Preditiva':['Medições / evidências preditivas','Tendência observada'],'Emergencial':['Condição de emergência','Ação imediata']};$('typeFieldsArea').innerHTML=(map[tipo]||[]).map((n,i)=>`<label>${n}</label><textarea id="typeField${i}" data-type-label="${safe(n)}"></textarea>`).join('')}
function addUser(){let u=get('users',[]);if(!$('uLogin').value||!$('uSenha').value||!$('uNome').value){alert('Preencha login, senha e nome');return}if(u.some(x=>x.login===$('uLogin').value.trim())){alert('Login já existe');return}u.push({login:$('uLogin').value.trim(),senha:$('uSenha').value,nivel:$('uNivel').value,nome:$('uNome').value,matricula:$('uMatricula').value,cargo:$('uCargo').value,email:$('uEmail').value});set('users',u);renderUsers();renderApproverOptions();['uLogin','uSenha','uNome','uMatricula','uCargo','uEmail'].forEach(id=>$(id).value='')}function renderUsers(){
 const u=get('users',[]);
 $('usersBody').innerHTML=u.map((x,i)=>`<tr><td>${safe(x.login)}</td><td>${safe(x.nome)}</td><td>${safe(x.matricula||'')}</td><td>${safe(x.cargo||'')}</td><td>${safe(x.nivel)}</td><td><button class="light smallBtn" onclick="resetUserPassword(${i})">Nova senha</button> <button class="danger smallBtn" onclick="delUser(${i})">Excluir</button></td></tr>`).join('')
}
function delUser(i){let u=get('users',[]);if(u[i].login==='admin'){alert('O admin inicial não pode ser excluído.');return}u.splice(i,1);set('users',u);renderUsers();renderApproverOptions()}
function addEquipment(){
 let e=get('equipments',[]),c=getEquipmentIdConfig();
 const tag=($('eqTag')?.value||'').trim(),serie=($('eqSerie')?.value||'').trim(),sap=($('eqSap')?.value||'').trim();
 const nome=($('eqNome')?.value||'').trim(),descricao=($('eqDescricao')?.value||'').trim();
 if(!nome&&!descricao){alert('Informe o nome ou a descrição do equipamento.');return}
 if(!tag&&!serie&&!sap&&!c.manual){alert('Informe uma identificação habilitada.');return}
 if(tag&&e.some(x=>(x.tag||'').toLowerCase()===tag.toLowerCase())){alert('Já existe equipamento com esta TAG.');return}
 if(serie&&e.some(x=>(x.serie||'').toLowerCase()===serie.toLowerCase())){alert('Já existe equipamento com este número de série.');return}
 if(sap&&e.some(x=>(x.codigoSap||'').toLowerCase()===sap.toLowerCase())){alert('Já existe equipamento com este código SAP.');return}
 e.push({id:uid(),tag,nome,area:$('eqArea').value,fabricante:$('eqFabricante').value,modelo:$('eqModelo').value,serie,codigoSap:sap,descricao});
 set('equipments',e);
 ['eqTag','eqNome','eqArea','eqFabricante','eqModelo','eqSerie','eqSap','eqDescricao'].forEach(id=>{if($(id))$(id).value=''});
 renderEquipments();renderEquipmentSelect();renderDashboard();
}function renderEquipments(){
 const e=get('equipments',[]);
 $('equipBody').innerHTML=e.map((x,i)=>`<tr><td>${safe(x.tag||'')}</td><td>${safe(x.serie||'')}</td><td>${safe(x.codigoSap||'')}</td><td>${safe(x.nome||'')}</td><td>${safe(x.descricao||'')}</td><td>${safe(x.area||'')}</td><td>${getModules().qrcode?'QR-'+safe(x.tag||x.serie||x.codigoSap||x.id):'Desativado'}</td><td><button class="danger smallBtn" onclick="delEquipment(${i})">Excluir</button></td></tr>`).join('');
}function delEquipment(i){let e=get('equipments',[]);if(!confirm('Excluir equipamento?'))return;e.splice(i,1);set('equipments',e);renderEquipments();renderEquipmentSelect();renderDashboard()}function renderEquipmentSelect(){
 const e=get('equipments',[]),c=getEquipmentIdConfig();
 if($('equipList')){
  const vals=[];
  e.forEach(x=>{if(c.tag&&x.tag)vals.push(x.tag);if(c.serie&&x.serie)vals.push(x.serie);if(c.sap&&x.codigoSap)vals.push(x.codigoSap);if(x.nome)vals.push(x.nome);if(c.descricao&&x.descricao)vals.push(x.descricao)});
  $('equipList').innerHTML=[...new Set(vals)].map(v=>`<option value="${safe(v)}"></option>`).join('');
 }
}function normalizeSearch(v){return String(v||'').trim().toLowerCase()}
function findEquipmentByAny(value){
 const v=normalizeSearch(value),c=getEquipmentIdConfig();if(!v)return null;
 return get('equipments',[]).find(x=>(c.tag&&normalizeSearch(x.tag)===v)||(c.serie&&normalizeSearch(x.serie)===v)||(c.sap&&normalizeSearch(x.codigoSap)===v)||normalizeSearch(x.nome)===v||(c.descricao&&normalizeSearch(x.descricao)===v));
}
function suggestEquipmentSearch(){
 const v=normalizeSearch($('equipSearch')?.value);if(!v)return;const c=getEquipmentIdConfig();
 const matches=get('equipments',[]).filter(x=>(c.tag&&normalizeSearch(x.tag).includes(v))||(c.serie&&normalizeSearch(x.serie).includes(v))||(c.sap&&normalizeSearch(x.codigoSap).includes(v))||normalizeSearch(x.nome).includes(v)||(c.descricao&&normalizeSearch(x.descricao).includes(v))).slice(0,20);
 if($('equipList'))$('equipList').innerHTML=matches.map(x=>`<option value="${safe(x.tag||x.serie||x.codigoSap||x.nome||x.descricao)}">${safe(x.nome||x.descricao||'')}</option>`).join('');
}
async function fillEquipmentFromSearch(){
 const searchValue=$('equipSearch')?.value||'',equipment=findEquipmentByAny(searchValue),config=getEquipmentIdConfig();
 if(equipment){if($('tag'))$('tag').value=equipment.tag||'';if($('equipamento'))$('equipamento').value=equipment.nome||'';if($('area'))$('area').value=equipment.area||'';if($('fabricante'))$('fabricante').value=equipment.fabricante||'';if($('modelo'))$('modelo').value=equipment.modelo||'';if($('serie'))$('serie').value=equipment.serie||'';if($('codigoSap'))$('codigoSap').value=equipment.codigoSap||'';if($('descricaoEquip'))$('descricaoEquip').value=equipment.descricao||'';return}
 if(config.sap){try{const item=await getSapDescription(searchValue);if(item){if($('codigoSap'))$('codigoSap').value=item.codigo;if($('descricaoEquip'))$('descricaoEquip').value=item.descricao;return}}catch(error){console.warn(error)}}
 if(!config.manual&&searchValue.trim())alert('Equipamento ou código SAP não encontrado.')
}
async function fillDescriptionBySap(){
 const sap=String($('codigoSap')?.value||'').trim().replace(/\.0$/,'');if(!sap)return;
 const equipment=get('equipments',[]).find(item=>String(item.codigoSap||'').trim()===sap);
 if(equipment){if($('descricaoEquip'))$('descricaoEquip').value=equipment.descricao||equipment.nome||'';return}
 try{const item=await getSapDescription(sap);if(item&&$('descricaoEquip'))$('descricaoEquip').value=item.descricao||''}catch(error){console.warn(error)}
}
function fillEquipment(){fillEquipmentFromSearch()}function addExecutorRow(){executors.push({login:'',nome:'',matricula:'',cargo:'',assinatura:''});renderExecutors()}function renderExecutors(){const users=get('users',[]);$('executorsBody').innerHTML=executors.map((e,i)=>`<tr><td><select onchange="selectExecutor(${i},this.value)"><option value="">Selecionar</option>${users.map(u=>`<option value="${safe(u.login)}" ${e.login===u.login?'selected':''}>${safe(u.nome)}</option>`).join('')}</select></td><td><input value="${safe(e.matricula||'')}" oninput="executors[${i}].matricula=this.value"></td><td><input value="${safe(e.cargo||'')}" oninput="executors[${i}].cargo=this.value"></td><td>${e.assinatura?`<img class="sigThumb" src="${e.assinatura}"> <button class="smallBtn ok" onclick="openSignatureModal(${i})">Assinado</button>`:`<button class="smallBtn light" onclick="openSignatureModal(${i})">✍️ Assinar</button>`}</td><td><button class="smallBtn danger" onclick="removeExecutor(${i})">Remover</button></td></tr>`).join('')}function selectExecutor(i,login){const u=get('users',[]).find(x=>x.login===login);executors[i].login=login;if(u){executors[i].nome=u.nome;executors[i].matricula=u.matricula||'';executors[i].cargo=u.cargo||''}renderExecutors()}function removeExecutor(i){executors.splice(i,1);renderExecutors()}function openSignatureModal(i){activeSigIndex=i;$('sigTitle').innerText='Assinatura - '+(executors[i].nome||'Executante')+' (pode virar o celular de lado)';$('signatureModal').classList.remove('hidden');setupSignatureCanvas(executors[i].assinatura)}function closeSignatureModal(){$('signatureModal').classList.add('hidden');activeSigIndex=null}function setupSignatureCanvas(data){
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
 renderPrefixOptions(r.prefixo||String(r.numero||'RM').split('-')[0]);
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
 if($('descricaoEquip'))$('descricaoEquip').value=r.descricaoEquip||'';
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
  prioridade:getWorkflowConfig().priorityEnabled?$('prioridade').value:'',
  prefixo:$('reportPrefix')?$('reportPrefix').value:'RM',
  aprovador:selectedApprover(),
  approvalEnabled:getWorkflowConfig().approvalEnabled,
  status:statusOverride||$('status').value,
  tag:$('tag').value,
  equipamento:$('equipamento').value,
  area:$('area').value,
  fabricante:$('fabricante').value,
  modelo:$('modelo').value,
  serie:$('serie').value,
  codigoSap:$('codigoSap')?$('codigoSap').value:'',
  descricaoEquip:$('descricaoEquip')?$('descricaoEquip').value:'',
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
   alert(st==='Aguardando aprovação'?'Relatório enviado para '+(r.aprovador?.nome||'aprovação')+': '+r.numero:(st==='Concluído'?'Relatório finalizado: '+r.numero:'Relatório salvo: '+r.numero));
   clearForm();
   renderHistory();
   renderApprovals();
   renderDashboard();
   showTab(st==='Aguardando aprovação'&&getWorkflowConfig().approvalEnabled?'aprovacoes':'historico');
 }catch(e){
   alert('Erro ao salvar relatório: '+e.message);
 }
}
function saveDraft(){
 try{
   if($('status')) $('status').value='Em elaboração';
   let reps=get('reports',[]);
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
 const c=getWorkflowConfig();
 if(!c.signatureRequired)return true;
 const lista=(executors||[]).filter(e=>e.nome||e.matricula||e.cargo);
 if(!lista.length){alert('Adicione pelo menos um executante.');return false}
 const pendentes=lista.map((e,i)=>({i:i+1,nome:e.nome||('Executante '+(i+1)),ok:!!e.assinatura})).filter(x=>!x.ok);
 if(pendentes.length){
  alert('Não é possível finalizar o relatório.\n\nAssinatura pendente:\n'+pendentes.map(x=>'Executante '+x.i+' - '+x.nome).join('\n'));
  return false;
 }
 return true;
}
function submitForApproval(){
 const c=getWorkflowConfig();
 if(!validateRequired())return;
 if(!validateSignaturesForApproval())return;
 if(c.approvalEnabled&&!selectedApprover()){
  alert('Selecione o aprovador responsável.');
  return;
 }
 const st=c.approvalEnabled?'Aguardando aprovação':'Concluído';
 if($('status'))$('status').value=st;
 saveReportWithStatus(st);
}function clearForm(){
 ['tag','equipamento','area','fabricante','modelo','serie','codigoSap','descricaoEquip','om','problemas','causas','acoes','obs'].forEach(id=>{if($(id))$(id).value=''});
 if($('equipSearch'))$('equipSearch').value='';
 if($('equipSelect'))$('equipSelect').value='';
 if($('dataRelatorio'))$('dataRelatorio').value=todayISO();
 if($('dataFim'))$('dataFim').value=todayISO();
 if($('tipo'))$('tipo').value='Preventiva';
 if($('prioridade'))$('prioridade').value='Baixa';
 if($('status'))$('status').value='Em elaboração';
 renderPrefixOptions();
 renderApproverOptions();
 get('customFields',[]).forEach(f=>{if($(f.id))$(f.id).value=''});
 photos=[];
 renderPhotos();
 executors=[{login:currentUser.login,nome:currentUser.nome,matricula:currentUser.matricula||'',cargo:currentUser.cargo||'',assinatura:''}];
 renderExecutors();
 renderTypeFields();
 if($('correctionNotice')){$('correctionNotice').classList.add('hidden');$('correctionNotice').innerHTML=''}
 newReportNumber();
}function setHistoryStatusFilter(st){if($('filterStatus'))$('filterStatus').value=st;renderHistory()}
function renderHistory(){let reps=get('reports',[]).slice().reverse(),q=($('searchTerm')?.value||'').toLowerCase(),st=$('filterStatus')?.value||'',tp=$('filterType')?.value||'';reps=reps.filter(r=>(!st||r.status===st)&&(!tp||r.tipo===tp)&&(!q||JSON.stringify([r.numero,r.tag,r.equipamento,(r.executors||[]).map(e=>e.nome)]).toLowerCase().includes(q)));$('historyBody').innerHTML=reps.map(r=>`<tr><td>${safe(r.numero)}</td><td>${brDate(r.data)}</td><td>${safe(r.tag)}</td><td>${safe(r.equipamento)}</td><td>${safe((r.executors||[]).map(e=>e.nome).join(', '))}</td><td>${statusBadge(r.status)}</td><td><button class="smallBtn" onclick="printSaved('${r.id}')">PDF</button> <button class="smallBtn light" onclick="loadReportForEdit('${r.id}')">Editar</button> <button class="smallBtn light" onclick="shareReportWhatsApp('${r.id}')">WhatsApp</button></td></tr>`).join('')}function renderApprovals(){
 const w=getWorkflowConfig();
 if(!w.approvalEnabled){$('approvalList').innerHTML='<p>A aprovação eletrônica está desativada.</p>';return}
 let reps=get('reports',[]).filter(r=>r.status==='Aguardando aprovação'||r.status==='Correção solicitada');
 if(currentUser.nivel==='Gestor')reps=reps.filter(r=>r.aprovador?.login===currentUser.login);
 $('approvalList').innerHTML=reps.length?reps.map(r=>`
 <div class="approvalBox">
  <b>${safe(r.numero)}</b> — ${safe(r.tag)} / ${safe(r.equipamento)} ${statusBadge(r.status)}
  <br><span class="small">Executantes: ${safe((r.executors||[]).map(e=>e.nome).join(', '))}</span>
  <br><span class="small"><b>Aprovador:</b> ${safe(r.aprovador?.nome||'Não informado')}</span>
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
 if(!['Gestor','Administrador','Proprietário'].includes(currentUser.nivel)){alert('Apenas gestor ou administrador pode aprovar.');return}
 const r=get('reports',[]).find(x=>x.id===id);
 if(currentUser.nivel==='Gestor'&&r?.aprovador?.login!==currentUser.login){alert('Este relatório foi destinado a outro aprovador.');return}
 updateReportStatus(id,'Aprovado','');
}function rejectReport(id){
 if(!['Gestor','Administrador','Proprietário'].includes(currentUser.nivel)){alert('Apenas gestor ou administrador pode reprovar.');return}
 const r=get('reports',[]).find(x=>x.id===id);
 if(currentUser.nivel==='Gestor'&&r?.aprovador?.login!==currentUser.login){alert('Este relatório foi destinado a outro aprovador.');return}
 const m=prompt('Informe o motivo da reprovação:');if(m===null||!m.trim())return;
 updateReportStatus(id,'Reprovado',m);
}function correctionReport(id){
 if(!['Gestor','Administrador','Proprietário'].includes(currentUser.nivel)){alert('Apenas gestor ou administrador pode solicitar correção.');return}
 const r=get('reports',[]).find(x=>x.id===id);
 if(currentUser.nivel==='Gestor'&&r?.aprovador?.login!==currentUser.login){alert('Este relatório foi destinado a outro aprovador.');return}
 const m=prompt('Informe o que precisa ser corrigido:');if(m===null||!m.trim())return;
 updateReportStatus(id,'Correção solicitada',m);
}
function sec(t,v){return v?`<div class="pdfSectionTitle">${safe(t)}</div><div class="pdfText">${safe(v)}</div>`:''}function reportHTML(r){
 const c=get('company',{}),m=getModules(),w=getWorkflowConfig();
 const approvalOn=r.approvalEnabled!==undefined?r.approvalEnabled:w.approvalEnabled;
 const sk=statusKey(r.status);
 const typeSecs=(r.typeFields||[]).map(x=>sec(x.nome,x.valor)).join('');
 const custom=(r.customValues||[]).filter(x=>x.valor).map(x=>sec(x.nome,x.valor)).join('');
 const photoRows=(r.photos||[]).map((p,i)=>`${i%2===0?'<tr>':''}<td><img src="${p.src}"><div class="pdfCaption"><b>${safe(p.categoria||'Evidência')}:</b> ${safe(p.comment||'')}</div></td>${i%2===1?'</tr>':''}`).join('')+((r.photos||[]).length%2?'<td></td></tr>':'');
 const approval=approvalOn&&r.approval?`<div class="pdfApproval"><b>Status da aprovação:</b> ${safe(r.approval.status)}<br><b>Gestor:</b> ${safe(r.approval.gestor?.nome||'')} — ${safe(r.approval.gestor?.cargo||'')}<br><b>Data/hora:</b> ${safe(r.approval.data||'')}${r.approval.motivo?`<br><b>Comentário:</b> ${safe(r.approval.motivo)}`:''}</div>`:'';
 const qr=m.qrcode?`<div class="pdfQr"><div class="qrBox">QR CODE<br>${safe(r.numero)}</div><div><b>Validação digital do relatório</b><br>Na versão profissional, este QR Code abrirá o relatório original no sistema.<br><b>Relatório:</b> ${safe(r.numero)}<br><b>Equipamento:</b> ${safe(r.tag||r.serie||r.codigoSap||r.equipamento)}</div></div>`:'';
 const signCards=(r.executors||[]).map((e,i)=>`<div class="pdfSignCard"><div class="pdfSignRole">EXECUTANTE ${i+1}</div><div class="pdfSignSpace">${e.assinatura?`<img class="pdfSignImgCard" src="${e.assinatura}">`:''}</div><div class="pdfSignLine"></div><div class="pdfSignName">${safe(e.nome)}</div><div class="pdfSignMeta">${safe(e.cargo)}${e.cargo&&e.matricula?' - ':''}${e.matricula?'Mat.: '+safe(e.matricula):''}</div></div>`).join('');
 let wmMode=w.watermarkMode||'auto';
 if(wmMode==='auto')wmMode=approvalOn?'status':'area';
 const wmText=wmMode==='status'?(r.status||''):wmMode==='area'?(r.area||''):'';
 const watermark=wmMode==='none'||!wmText?'':`<div class="pdfWmLayer">${wmMode==='status'?`<div class="pdfWmStatus wm-${sk}">${safe(wmText)}</div>`:`<div class="pdfWmText">${safe(wmText)}</div>`}</div>`;
 const priorityCell=w.priorityEnabled&&r.prioridade?`<td><b>Prioridade:</b> ${safe(r.prioridade)}</td>`:'';
 const generalCols=w.priorityEnabled&&r.prioridade?4:3;
 const statusSeal=approvalOn?`<div class="pdfStatusSeal seal-${sk}">${safe(r.status)}</div>`:'';
 const managerCard=approvalOn?`<div class="pdfSignCard pdfSignManager"><div class="pdfSignRole">RESPONSÁVEL TÉCNICO / GESTOR</div><div class="pdfSignSpace">${r.approval?.status==='Aprovado'?'Assinado eletronicamente':''}</div><div class="pdfSignLine"></div><div class="pdfSignName">${safe(r.aprovador?.nome||c.gestor||'')}</div><div class="pdfSignMeta">${safe(r.aprovador?.cargo||c.gestorCargo||'')}</div></div>`:'';
 return `<div class="reportPaper">
 ${watermark}
 <div class="reportContent">
  <div class="pdfHead">
   <div class="pdfLogo">${c.logo?`<img src="${c.logo}">`:''}</div>
   <div class="pdfTitle"><div>${safe(c.nome||'NOME DA EMPRESA')}</div><div>${safe(c.setor||'')}</div><div>RELATÓRIO DE MANUTENÇÃO</div>${c.endereco?`<div style="font-size:8pt;color:#000;margin-top:1mm">${safe(c.endereco)}</div>`:''}</div>
   <div class="pdfMeta"><div><b>Nº:</b> ${safe(r.numero)}</div>${r.dataFim&&r.dataFim!==r.data?`<div><b>Fim:</b> ${brDate(r.dataFim)}</div>`:''}<div><b>Status:</b> ${safe(r.status)}</div>${statusSeal}</div>
  </div>
  <div class="pdfSectionTitle">Dados gerais</div>
  <table class="pdfTable"><tr><td><b>Tipo:</b> ${safe(r.tipo)}</td>${priorityCell}<td><b>Data início:</b> ${brDate(r.data)}</td><td><b>Data fim:</b> ${brDate(r.dataFim||r.data)}</td></tr></table>
  <div class="pdfSectionTitle">Dados do equipamento</div>
  <table class="pdfTable"><tr><td><b>TAG:</b> ${safe(r.tag)}</td><td><b>Equipamento:</b> ${safe(r.equipamento)}</td><td><b>Área/Sistema:</b> ${safe(r.area)}</td></tr><tr><td><b>Fabricante:</b> ${safe(r.fabricante)}</td><td><b>Modelo:</b> ${safe(r.modelo)}</td><td><b>Nº série:</b> ${safe(r.serie)}</td></tr>${r.codigoSap||r.descricaoEquip?`<tr><td><b>Código SAP:</b> ${safe(r.codigoSap)}</td><td colspan="2"><b>Descrição:</b> ${safe(r.descricaoEquip)}</td></tr>`:''}<tr><td colspan="3"><b>OM/OS:</b> ${safe(r.om)}</td></tr></table>
  ${typeSecs}${sec('Problemas identificados',r.problemas)}${sec('Possíveis causas',r.causas)}${sec('Ações executadas',r.acoes)}${sec('Observações finais',r.obs)}${custom}
  ${(r.photos||[]).length?`<div class="pdfSectionTitle">Evidências fotográficas</div><table class="pdfPhotos">${photoRows}</table>`:''}
  <div class="pdfFinalBlock">
   <div class="pdfSignSection"><div class="pdfSectionTitle">Assinaturas</div><div class="pdfSignCards">${signCards}${managerCard}</div></div>
   ${approval}
   <div class="pdfEndBlock">${qr}<div class="pdfFooter"><div>Gerado por Sistema de Relatórios de Manutenção</div><div>Relatório: ${safe(r.numero)} | Versão: 7.4 PWA | Emitido em: ${emitidoEm()}</div></div></div>
  </div>
 </div>
 </div>`;
}function openReportInNewTab(r){
 const report = reportHTML(r);
 const styleTags = Array.from(document.querySelectorAll('style')).map(s=>s.innerHTML).join('\n');
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
body{background:#fff;margin:0}
.reportPaper{margin:0 auto}
@media print{
  body{background:#fff;margin:0}
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


/* V7.0 Real - PWA e Backup */
#installPwaBtn{display:none}
.pwaBadge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;background:#ecfdf5;color:#166534;padding:4px 8px;font-size:12px;font-weight:700}
.offlineBadge{background:#fff7ed;color:#9a3412}
.backupActions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.appInfo{background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:10px;font-size:13px;color:var(--muted)}

/* V7.1 - Identificação inteligente de equipamentos */
.equipIdConfig{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:8px}
.equipIdConfig label{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:9px;background:#fafafa}
.equipIdConfig input{width:auto}
.manualHint{padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#475569;font-size:12px;margin-top:6px}
@media(max-width:780px){.equipIdConfig{grid-template-columns:1fr}}

/* V7.2 - fluxo configurável, prefixos e aprovador */
.workflowConfig{display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:9px}
.workflowConfig label.configCheck{display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:10px;padding:10px;background:#fafafa}
.workflowConfig label.configCheck input{width:auto}
.configPanel{border:1px solid var(--border);border-radius:12px;padding:12px;background:#f8fafc;margin-top:10px}
#wrapAprovador.hidden,#wrapPrioridade.hidden,#wrapPrefixo.hidden{display:none!important}
.st-done{background:#dbeafe;color:#1e3a8a}
.seal-done{background:#dbeafe;color:#1e3a8a}
@media(max-width:780px){.workflowConfig{grid-template-columns:1fr}}
</style>
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#001f8f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Relatórios Manutenção">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
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

let deferredPwaPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPwaPrompt=e;const b=document.getElementById('installPwaBtn');if(b)b.style.display='inline-block';});
async function installPWA(){if(!deferredPwaPrompt){alert('Se o botão de instalação não abrir, use o menu do navegador e escolha "Adicionar à tela inicial" ou "Instalar app".');return}deferredPwaPrompt.prompt();await deferredPwaPrompt.userChoice;deferredPwaPrompt=null;const b=document.getElementById('installPwaBtn');if(b)b.style.display='none'}
function updatePwaStatus(){const el=document.getElementById('pwaStatus');if(!el)return;if(navigator.onLine){el.textContent='Online';el.classList.remove('offlineBadge')}else{el.textContent='Offline';el.classList.add('offlineBadge')}}
window.addEventListener('online',updatePwaStatus);window.addEventListener('offline',updatePwaStatus);
if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('./service-worker.js').catch(()=>{});updatePwaStatus();});}
function exportBackup(){const keys=['users','company','customFields','requiredFields','modules','workflowConfig','equipmentIdConfig','equipments','reports','sapCatalogMeta'];const data={versao:'7.4 PWA',exportadoEm:new Date().toISOString(),dados:{}};keys.forEach(k=>data.dados[k]=get(k,[]));const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='backup_relatorios_manutencao_'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}
function importBackup(e){const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(!data.dados){alert('Arquivo de backup inválido.');return}if(!confirm('Importar este backup? Os dados atuais deste aparelho serão substituídos.'))return;Object.keys(data.dados).forEach(k=>set(k,data.dados[k]));alert('Backup importado com sucesso. O aplicativo será recarregado.');location.reload()}catch(err){alert('Erro ao importar backup: '+err.message)}};reader.readAsText(f);e.target.value=''}

installLoginHandlers();try{init();updateSapStatus();installFieldHelp();const saved=sessionStorage.getItem('currentUser');if(saved){currentUser=JSON.parse(saved);openApp()}}catch(error){console.error(error);setLoginMessage('Erro ao iniciar o aplicativo. Atualize a página.','error')}
