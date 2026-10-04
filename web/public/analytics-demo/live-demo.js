/* API-first demo layer. The approved pre-enhancement build is preserved in approved-versions/. */
state.episodeWindow=state.episodeWindow||'first7';

const liveDemoState={connected:false,annotations:[]};
const episodeWindows={first24:'First 24 hours',first7:'First 7 days',first28:'First 28 days',lifetime:'Lifetime'};
const savedKey='wtfos-youtube-demo-investigations';
const metricDefinitions={
  views:{title:'Views',copy:'The number of valid views in the selected scope. Use views as an outcome, then inspect impressions, CTR, and attention to understand how the result was created.',pair:'Read with · impressions, watch time, publish age'},
  'watch time':{title:'Watch time',copy:'Total hours watched. It combines reach and depth, so a change can come from more viewers, longer viewing, or both.',pair:'Read with · views, AVD, retention'},
  subscribers:{title:'Subscribers',copy:'Subscribers gained in the selected scope. The count shows scale; subscriber yield shows how efficiently views converted into channel growth.',pair:'Read with · views, subscriber yield, audience mix'},
  impressions:{title:'Impressions',copy:'How often YouTube showed the thumbnail on counted surfaces. This is the first distribution signal, before click efficiency.',pair:'Read with · CTR, traffic source, publish age'},
  distribution:{title:'CTR',copy:'Impressions click-through rate measures click efficiency on counted impressions. A higher CTR does not guarantee more reach or stronger attention.',pair:'Read with · impressions, traffic source, AVD'},
  attention:{title:'AVD + retention',copy:'Average view duration and retention describe depth of attention after the click. Timeline events help locate where attention changed.',pair:'Read with · episode duration, chapters, editorial events'},
  'subscriber value':{title:'Subscriber yield',copy:'Subscribers gained divided by views. It helps compare growth efficiency across episodes, but should follow reach and attention in the reading order.',pair:'Read with · views, subscribers, matched publish age'},
  'audience mix':{title:'Audience mix',copy:'The balance between subscribed and non-subscribed viewers. Preserve the exact YouTube API definition and denominator in the production response.',pair:'Read with · traffic source, new vs returning viewers'}
};

function windowLabel(){return episodeWindows[state.episodeWindow]||episodeWindows.first7}
function escapeHtml(value){return String(value).replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[char]))}

function replaceText(root){
  if(!root)return;
  const replacements=[
    [/Weekly Performance \+ selected comparison\.?/gi,'YouTube Analytics API · channel metrics + selected comparison'],
    [/Weekly Performance \+ Data Sheet\.?/gi,'YouTube Analytics API · channel + video metrics'],
    [/Data Sheet inferences \+ Channel Audit\.?/gi,'YouTube Analytics API · historical video catalogue'],
    [/Channel Audit · Impression Tiers\.?/gi,'YouTube Analytics API · historical video catalogue'],
    [/Temp Data \+ Data Sheet/gi,'YouTube Analytics API · video metrics'],
    [/Weekly Performance/gi,'YouTube Analytics API · channel metrics'],
    [/Temp Data/gi,'YouTube Analytics API · video metrics'],
    [/Data Sheet/gi,'YouTube Analytics API · calculated video metrics'],
    [/Channel Audit/gi,'YouTube Analytics API · historical catalogue'],
    [/supplied 9-episode snapshot/gi,'demo video catalogue'],
    [/9 supplied episodes/gi,'9 demo episodes'],
    [/supplied reference episodes/gi,'demo catalogue episodes'],
    [/supplied snapshot/gi,'demo video catalogue'],
    [/supplied episodes/gi,'demo episodes'],
    [/imported comparison data/gi,'earlier API history'],
    [/imported weekly snapshot/gi,'synced API response'],
    [/imported reporting week/gi,'synced reporting period'],
    [/imported baseline/gi,'available API baseline'],
    [/imported weeks/gi,'available weeks'],
    [/imported data/gi,'available history'],
    [/imported row/gi,'API response'],
    [/workbook snapshot/gi,'demo API response'],
    [/workbook reference data/gi,'demo API response'],
    [/workbook reporting week/gi,'synced reporting period'],
    [/workbook row/gi,'API response'],
    [/workbooks/gi,'demo API payload'],
    [/workbook/gi,'demo API payload'],
    [/reference snapshot/gi,'API-ready demo'],
    [/reference data/gi,'demo API response'],
    [/imported/gi,'available'],
    [/API REQUIRED/g,'CONNECT API']
  ];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    if(node.parentElement?.closest('code,script,style'))continue;
    let value=node.nodeValue;
    replacements.forEach(([pattern,next])=>{value=value.replace(pattern,next)});
    node.nodeValue=value;
  }
}

function updateConnectionStatus(){
  $('#api-status-dot').classList.toggle('connected',liveDemoState.connected);
  $('#api-status-title').textContent=liveDemoState.connected?'Connected preview':'API-ready demo';
  $('#api-status-copy').textContent=liveDemoState.connected?'OAuth and synchronization states are previewed. No external request was made.':'Example responses show the final interface before OAuth and live metrics are connected.';
  $('#header-data-state').textContent=liveDemoState.connected?'connected preview · sync placeholder':'demo mode · API connection placeholder';
  $('#trust-connection').textContent=liveDemoState.connected?'YouTube Analytics · connected preview':'Demo API response';
  $('#trust-sync').textContent=liveDemoState.connected?'Just now · simulated':'Placeholder · production timestamp';
}

function updateTrust(){
  let count=weeks(range()).length;
  $('#trust-coverage').textContent=has()?`${count} reporting ${count===1?'period':'periods'} · ${state.content==='full'?'full episodes':'selected videos'}`:`${state.content==='short'?'Clips & Shorts':'All formats'} · awaiting live sync`;
  $('#trust-comparison').textContent=state.cohort==='matched'?`${windowLabel()} · matched age`:`${windowLabel()} · ${cohort()}`;
  updateConnectionStatus();
}

function updateEpisodeWindow(){
  let select=$('#filter-window');
  select.value=state.episodeWindow;
  select.disabled=!has();
  select.onchange=e=>{state.episodeWindow=e.target.value;render()};
  let chips=$('#scope-chips');
  if(has()&&ep()&&!chips.querySelector('[data-window-chip]'))chips.insertAdjacentHTML('beforeend',`<b data-window-chip>${windowLabel()}</b>`);
  if(has()&&ep()&&!$('#chat-scope').textContent.includes(windowLabel()))$('#chat-scope').textContent+=` · episode window: ${windowLabel()}`;
  let boundary=$('#episode-detail .comparison-boundary p');
  if(boundary&&state.cohort==='episode')boundary.textContent=`The production comparison uses ${windowLabel().toLowerCase()} for both episodes. Demo values show the final layout; the live API query will enforce equal post-publish age.`;
  if(boundary&&state.cohort==='matched')boundary.textContent=`Production will automatically compare ${windowLabel().toLowerCase()} against videos of the same format and publish age. This demo shows the unavailable state until live history is synchronized.`;
  if(boundary&&state.cohort==='snapshot')boundary.textContent=`This compares the episode with the current channel episode average for ${windowLabel().toLowerCase()}.`;
}

function decorateMetricHelp(){
  document.querySelectorAll('.metric-card').forEach(card=>{
    let label=card.querySelector('p'),key=label?.textContent.trim().toLowerCase();
    if(!label||!metricDefinitions[key]||label.querySelector('.metric-info'))return;
    label.insertAdjacentHTML('beforeend',`<button class="metric-info" type="button" data-metric="${key}" aria-label="Explain ${key}">?</button>`);
  });
  document.querySelectorAll('.decision-strip article').forEach(card=>{
    let label=card.querySelector('p'),key=label?.textContent.trim().toLowerCase();
    if(!label||!metricDefinitions[key]||label.querySelector('.metric-info'))return;
    label.insertAdjacentHTML('beforeend',`<button class="metric-info" type="button" data-metric="${key}" aria-label="Explain ${key}">?</button>`);
  });
  document.querySelectorAll('.metric-info').forEach(button=>button.onclick=()=>showMetricDefinition(button.dataset.metric));
}

function showMetricDefinition(key){
  let definition=metricDefinitions[key];
  if(!definition)return;
  $('#metric-definition-title').textContent=definition.title;
  $('#metric-definition-copy').textContent=definition.copy;
  $('#metric-definition-pair').textContent=definition.pair;
  $('#metric-definition').hidden=false;
  $('#metric-definition').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderAttentionInbox(){
  let n=now(),p=comparison().m,leader=[...episodes].filter(item=>finite(item.subscribers)).sort((a,b)=>b.subscribers-a.subscribers)[0],items;
  if(!n){
    items=[['CONNECT','Connect this scope','No synchronized provider response exists for this selection. Missing API fields remain unavailable and no fixture is substituted.','What data is missing for this selected scope?','context']];
  }else{
    items=[
      [p&&n.impressions<p.impressions?'REVIEW':'KEEP',p&&n.impressions<p.impressions?'Reach is below the comparison':'Reach is holding',p?`Impressions moved ${signed(rel(n.impressions,p.impressions))} and CTR moved ${pp(n.ctr,p.ctr)}.`:'Add a comparison to judge distribution movement.','Why did channel impressions and CTR change in this range?',p&&n.impressions<p.impressions?'':'keep'],
      [p&&n.retention<p.retention?'REVIEW':'KEEP',p&&n.retention<p.retention?'Attention softened':'Attention held up',p?`Retention moved ${pp(n.retention,p.retention)} and AVD is ${time(n.avd)}.`:`Current AVD is ${time(n.avd)} and retention is ${rate(n.retention)}.`,'Why did attention change in this range?',p&&n.retention<p.retention?'':'keep'],
      ['CATALOGUE SIGNAL',leader?`${leader.name} leads subscriber gain`:'Episode growth unavailable',leader?`${exact(leader.subscribers)} subscribers at ${rate(leader.stv)} yield in the synchronized catalogue.`:'No synchronized episode subscriber observations are available for this range.','Which episode gained most subscribers?','context']
    ];
  }
  $('#attention-items').innerHTML=items.map(([tag,title,copy,q,tone])=>`<article class="attention-item ${tone}"><span>${tag}</span><strong>${title}</strong><p>${copy}</p><button type="button" data-attention-question="${q}">investigate →</button></article>`).join('');
  document.querySelectorAll('[data-attention-question]').forEach(button=>button.onclick=()=>askAndReveal(button.dataset.attentionQuestion));
}

function renderAnnotations(){
  let demo=[
    ['API timestamp','episode published'],
    ['event log','title or thumbnail changed'],
    ['team context','clip or promotion released']
  ];
  $('#annotation-list').innerHTML=demo.map(([date,label])=>`<span class="annotation-chip demo">${date} · ${label}</span>`).join('')+liveDemoState.annotations.map(item=>`<span class="annotation-chip">${escapeHtml(item.date)} · ${escapeHtml(item.label)}</span>`).join('');
  if(!$('#annotation-date').value)$('#annotation-date').value=range().to;
}

function nextMove(question){
  let q=question.toLowerCase();
  if(/compare|fair|cohort/.test(q))return`Keep both episodes inside the same ${windowLabel().toLowerCase()} window before acting on the difference.`;
  if(/impression|ctr|distribution|click/.test(q))return'Open traffic sources and thumbnail/title change history, then decide whether the issue is reach or click efficiency.';
  if(/attention|retention|avd|watch/.test(q))return'Open the retention timeline and map the largest movement to chapters or team annotations.';
  if(/subscriber|growth|yield|stv/.test(q))return'Compare subscriber yield with reach and attention before choosing an episode pattern to repeat.';
  return'Save this investigation, assign an owner, and verify the finding against the next synchronized API response.';
}

function decorateLatestAnswer(question){
  let message=[...document.querySelectorAll('#conversation .assistant-message')].at(-1);
  if(!message)return;
  replaceText(message);
  if(message.dataset.structured)return;
  let evidenceNode=message.querySelector('.evidence'),evidence=evidenceNode?.outerHTML||'',clone=message.cloneNode(true);
  clone.querySelector('.evidence')?.remove();
  let body=clone.innerHTML.trim();
  message.dataset.structured='true';
  message.dataset.question=question;
  message.innerHTML=`<div class="answer-section"><span>WHAT THE DATA SAYS</span><div>${body}</div></div><div class="answer-next"><span>NEXT USEFUL MOVE</span><p>${nextMove(question)}</p></div><span class="answer-confidence">CONFIDENCE · DEMO RESPONSE / LIVE API WILL VERIFY</span>${evidence}<div class="answer-tools"><button type="button" data-answer-action="save">save investigation</button><button type="button" data-answer-action="copy">copy brief</button><button type="button" data-answer-feedback="useful">useful</button><button type="button" data-answer-feedback="incorrect">incorrect</button><button type="button" data-answer-feedback="evidence">needs more evidence</button><p class="answer-action-status" aria-live="polite"></p></div>`;
  wireAnswerTools(message);
}

function answerBrief(message){
  return[`WTFOS YouTube investigation`,message.dataset.question||'Analysis question',$('#chat-scope').textContent,message.querySelector('.answer-section')?.innerText||'',message.querySelector('.answer-next')?.innerText||'',message.querySelector('.evidence')?.innerText||''].filter(Boolean).join('\n\n');
}

function getSaved(){try{return JSON.parse(localStorage.getItem(savedKey)||'[]')}catch{return[]}}
function setSaved(items){localStorage.setItem(savedKey,JSON.stringify(items.slice(0,12)))}

function renderSaved(){
  let items=getSaved();
  $('#saved-count').textContent=String(items.length);
  $('#saved-list').innerHTML=items.length?items.map(item=>`<article class="saved-item"><strong>${escapeHtml(item.question)}</strong><small>${escapeHtml(item.scope)}<br>${escapeHtml(item.savedAt)}</small></article>`).join('')+'<button class="saved-clear" type="button">clear saved investigations</button>':'<p>No saved investigations yet.</p>';
  let clear=$('#saved-list .saved-clear');
  if(clear)clear.onclick=()=>{localStorage.removeItem(savedKey);renderSaved()};
}

function wireAnswerTools(message){
  let status=message.querySelector('.answer-action-status');
  message.querySelector('[data-answer-action="save"]').onclick=()=>{
    let items=getSaved(),item={question:message.dataset.question||'Analysis question',scope:$('#chat-scope').textContent,savedAt:new Date().toLocaleString('en-IN'),brief:answerBrief(message)};
    items.unshift(item);setSaved(items);renderSaved();status.textContent='Saved in this browser.';
  };
  message.querySelector('[data-answer-action="copy"]').onclick=async()=>{
    try{await navigator.clipboard.writeText(answerBrief(message));status.textContent='Brief copied.'}catch{status.textContent='Copy is unavailable in this browser.'}
  };
  message.querySelectorAll('[data-answer-feedback]').forEach(button=>button.onclick=()=>{
    message.querySelectorAll('[data-answer-feedback]').forEach(x=>x.classList.remove('selected'));
    button.classList.add('selected');
    status.textContent=button.dataset.answerFeedback==='useful'?'Feedback noted for this session.':'Feedback noted for this session.';
  });
}

function wireLiveControls(){
  $('#api-details-toggle').onclick=()=>{$('#api-handoff').hidden=false;$('#api-details-toggle').setAttribute('aria-expanded','true');$('#api-handoff').scrollIntoView({behavior:'smooth',block:'nearest'})};
  $('#api-handoff-close').onclick=()=>{$('#api-handoff').hidden=true;$('#api-details-toggle').setAttribute('aria-expanded','false')};
  $('#api-connect-demo').onclick=()=>{liveDemoState.connected=true;updateConnectionStatus();$('#api-connect-demo').textContent='connected preview active ✓'};
  $('#metric-definition-close').onclick=()=>{$('#metric-definition').hidden=true};
  document.querySelectorAll('[data-route]').forEach(button=>button.onclick=()=>{
    let route=button.dataset.route;
    if(route==='latest'&&episodes[0]){Object.assign(state,{episode:episodes[0].id,cohort:'matched',episodeWindow:'first7'});render();$('#episode-review').scrollIntoView({behavior:'smooth',block:'start'})}
    if(route==='compare'&&episodes.length>1){Object.assign(state,{episode:episodes[0].id,cohort:'episode',compareEpisode:episodes[1].id});render();$('#episode-review').scrollIntoView({behavior:'smooth',block:'start'})}
    if(route==='change'){Object.assign(state,{episode:'all',range:'latest',start:presets.latest.from,end:presets.latest.to});render();$('#week-heading').scrollIntoView({behavior:'smooth',block:'start'})}
    if(route==='ask'){$('#ask').scrollIntoView({behavior:'smooth',block:'start'});$('.chat-compose input').focus()}
  });
  $('#annotation-form').onsubmit=e=>{
    e.preventDefault();
    let date=$('#annotation-date').value,label=$('#annotation-label').value.trim();
    if(!date||!label){$('#annotation-status').textContent='Add both a date and a short event label.';return}
    liveDemoState.annotations.push({date:pretty(date),label});
    $('#annotation-label').value='';$('#annotation-status').textContent='Demo annotation added. Production should save it against the channel or video.';renderAnnotations();
  };
}

function enhanceLiveDemo(){
  updateEpisodeWindow();
  updateTrust();
  decorateMetricHelp();
  renderAttentionInbox();
  renderAnnotations();
  renderSaved();
  wireLiveControls();
  replaceText(document.querySelector('main'));
}

const coreRender=render;
render=function(){coreRender();enhanceLiveDemo()};
const coreAnswer=answer;
answer=function(question){coreAnswer(question);replaceText(document.querySelector('#conversation'));decorateLatestAnswer(question)};
render();
