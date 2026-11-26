
const FIELD_HELP={
 cfgReportPrefix:['Prefixo','Digite livremente as iniciais desejadas. Exemplos: RM, ELE, MEC, CAL ou PS2.'],
 cfgNumberTemplate:['Modelo da numeração','Use {PREFIXO}, {AA}, {AAAA}, {MM} e {SEQ}.'],
 cfgSequenceDigits:['Dígitos da sequência','Define 001, 0001, 000001 etc.'],
 cfgShowStatus:['Mostrar status','Exibe ou oculta o status no formulário e no PDF.'],
 cfgApprovalEnabled:['Aprovação eletrônica','Ative quando os relatórios precisarem ser enviados a um aprovador.'],
 cfgApproverRequired:['Aprovador obrigatório','Exige selecionar o aprovador antes de finalizar o relatório.'],
 cfgShowPriority:['Mostrar prioridade','Ative somente se a empresa utiliza prioridade.'],
 cfgWatermarkMode:['Marca d’água','Escolha Status, Área/Sistema, Setor/Oficina ou nenhuma.'],
 cfgSapEnabled:['Usar Código SAP','Ativa Código SAP e Descrição Longa. Não cria integração direta com o SAP.'],
 sapExcelFile:['Planilha Excel','Selecione a planilha exportada contendo Código SAP e Descrição Longa.'],
 sapSheetSelect:['Aba da planilha','A planilha de referência utiliza a aba BASE GERAL.'],
 sapImportMode:['Modo de atualização','Substituir apaga a base anterior; adicionar/atualizar mantém os códigos existentes.'],
 sapCodeColumn:['Coluna do Código SAP','Na planilha de referência, o código está na coluna Material.'],
 sapDescriptionColumn:['Coluna da descrição','Na planilha de referência, a descrição está em Descrição Longa.'],
 sapHeaderRow:['Linha do cabeçalho','Na planilha de referência, o cabeçalho fica na linha 2.'],
 numero:['Número do relatório','Gerado automaticamente conforme a configuração.'],
 equipSearch:['Localizar equipamento','Pesquise somente por TAG ou Nº de série.'],
 tag:['TAG','Identificação funcional. A mesma TAG pode ter sido usada por equipamentos diferentes.'],
 serie:['Nº de série','Identificador mais específico do equipamento.'],
 codigoSap:['Código SAP','Opcional. Serve apenas para consultar a Descrição Longa.'],
 descricaoLonga:['Descrição Longa','Descrição técnica preenchida pela planilha ou manualmente.'],
 aprovador:['Aprovador','Responsável pela aprovação quando o fluxo eletrônico estiver habilitado.'],
 problemas:['Problemas identificados','Descreva defeitos, sintomas e condições encontradas.'],
 causas:['Possíveis causas','Registre a causa provável ou confirmada.'],
 acoes:['Ações executadas','Descreva serviços, ajustes, substituições, medições e testes.'],
 obs:['Observações finais','Informe condição de entrega, pendências e recomendações.'],
 eqTag:['TAG do equipamento','TAG atual ou anteriormente usada. TAG repetida é permitida.'],
 eqSerie:['Nº de série','Quando informado, não deve ser duplicado.'],
 eqSap:['Código SAP','Opcional e usado somente para consulta da descrição.'],
 eqDescricaoLonga:['Descrição Longa','Descrição completa do equipamento.']
};
function showHelp(){document.getElementById('helpOverlay')?.classList.remove('hidden');showHelpTab('config')}
function closeHelp(){document.getElementById('helpOverlay')?.classList.add('hidden')}
function showHelpTab(name){document.querySelectorAll('.helpTab').forEach(b=>b.classList.toggle('active',b.dataset.helpTab===name));document.querySelectorAll('.helpContent').forEach(x=>x.classList.add('hidden'));document.getElementById('help-content-'+name)?.classList.remove('hidden')}
function showFieldHelp(id){const i=FIELD_HELP[id];if(!i)return;document.getElementById('fieldHelpTitle').textContent=i[0];document.getElementById('fieldHelpText').textContent=i[1];document.getElementById('fieldHelpPopup').classList.remove('hidden')}
function closeFieldHelp(){document.getElementById('fieldHelpPopup')?.classList.add('hidden')}
function installFieldHelp(){Object.keys(FIELD_HELP).forEach(id=>{const field=document.getElementById(id);if(!field)return;const label=field.closest('div')?.querySelector('label');if(!label||label.querySelector('.helpTip'))return;const b=document.createElement('button');b.type='button';b.className='helpTip';b.textContent='?';b.title='Explicação deste campo';b.onclick=e=>{e.preventDefault();e.stopPropagation();showFieldHelp(id)};label.appendChild(b)})}
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('helpFab')?.addEventListener('click',showHelp);document.getElementById('helpCloseBtn')?.addEventListener('click',closeHelp);document.getElementById('fieldHelpClose')?.addEventListener('click',closeFieldHelp);document.querySelectorAll('.helpTab').forEach(b=>b.addEventListener('click',()=>showHelpTab(b.dataset.helpTab)));document.getElementById('helpOverlay')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeHelp()});installFieldHelp();new MutationObserver(installFieldHelp).observe(document.body,{childList:true,subtree:true})});
