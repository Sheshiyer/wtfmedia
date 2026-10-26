/* Live analytics assistant. All values and source links come from the protected API. */
(() => {
  let busy = false;
  let saving = false;
  let chosenVideo = null;
  const previousQuestions = [];
  let transcript = [];
  let savedId = null;
  let dirty = false;
  const conversation = document.querySelector('#conversation');
  if (!conversation) return;
  conversation.replaceChildren();
  const append = (className, text) => {
    const node = document.createElement('div');
    node.className = className;
    node.textContent = text;
    conversation.append(node);
    conversation.scrollTop = conversation.scrollHeight;
    return node;
  };
  const suggestions = document.querySelector('.prompt-chips');
  if (suggestions) {
    suggestions.id = 'analytics-suggestions';
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'suggestions-toggle';
    toggle.textContent = 'Hide suggestions'; toggle.setAttribute('aria-controls', suggestions.id); toggle.setAttribute('aria-expanded', 'true');
    toggle.onclick = () => {
      suggestions.hidden = !suggestions.hidden;
      toggle.textContent = suggestions.hidden ? 'Show suggestions' : 'Hide suggestions';
      toggle.setAttribute('aria-expanded', String(!suggestions.hidden));
    };
    suggestions.before(toggle);
  }
  const savedList = document.querySelector('#saved-list');
  const savedCount = document.querySelector('#saved-count');
  let savedItems = [];
  const api = async (path, options) => {
    const response = await (globalThis.wtfAnalyticsRequest || fetch)(path, { ...options, signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error === 'chat_too_large' ? 'This chat is too large to save. Start a new chat.' : 'Saved chats are unavailable. Please try again.');
    return data;
  };
  if (savedList && savedCount) {
    const controls = document.createElement('div'); controls.className = 'answer-tools';
    const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Save chat';
    const fresh = document.createElement('button'); fresh.type = 'button'; fresh.textContent = 'New chat';
    const status = document.createElement('p'); status.setAttribute('aria-live', 'polite');
    controls.append(save, fresh, status); savedList.parentElement.before(controls);
    const confirmAction = text => new Promise(resolve => {
      const dialog = document.createElement('dialog');
      const label = document.createElement('p'); label.textContent = text;
      const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'Confirm';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Cancel';
      const finish = accepted => { dialog.close(); dialog.remove(); resolve(accepted); };
      accept.onclick = () => finish(true); cancel.onclick = () => finish(false);
      dialog.oncancel = event => { event.preventDefault(); finish(false); };
      dialog.setAttribute('aria-label', text); dialog.append(label, cancel, accept); document.body.append(dialog); dialog.showModal(); cancel.focus();
    });
    const renderAccountSaved = () => {
      savedList.replaceChildren(); savedCount.textContent = String(savedItems.length);
      if (!savedItems.length) { const empty = document.createElement('p'); empty.textContent = 'No saved chats yet. Use Save chat above.'; savedList.append(empty); }
      for (const item of savedItems) {
        const row = document.createElement('article'); row.className = 'saved-item';
        const open = document.createElement('button'); open.type = 'button'; open.textContent = item.title;
        open.onclick = async () => {
          if (busy || saving) return;
          if (dirty && !await confirmAction('Open this saved chat? Unsaved changes to the current chat will be lost.')) return;
          saving = true;
          try {
            const data = await api(`/beta/api/analytics/investigations/${item.id}`);
            transcript = data.messages; dirty = false; savedId = data.id; chosenVideo = null;
            previousQuestions.splice(0, previousQuestions.length, ...transcript.filter(m => m.role === 'user').slice(-4).map(m => m.content));
            conversation.replaceChildren();
            for (const message of transcript) { const node = append(`${message.role}-message`, message.content); node.style.whiteSpace = 'pre-wrap'; }
            status.textContent = 'Saved chat opened. Values reflect when the answers were saved.';
          } catch (error) { status.textContent = error.message; }
          finally { saving = false; }
        };
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete';
        remove.onclick = async () => {
          if (busy || saving || !await confirmAction('Permanently delete this saved chat from your account?')) return;
          saving = true;
          try { await api(`/beta/api/analytics/investigations/${item.id}`, { method: 'DELETE' }); if (savedId === item.id) savedId = null; await loadSaved(); status.textContent = 'Saved chat deleted.'; }
          catch (error) { status.textContent = error.message; }
          finally { saving = false; }
        };
        row.append(open, remove); savedList.append(row);
      }
    };
    const loadSaved = async () => { const data = await api('/beta/api/analytics/investigations'); savedItems = data.investigations; renderAccountSaved(); };
    // Replace the demo's browser-local list renderer with the private account list.
    renderSaved = renderAccountSaved;
    save.onclick = async () => {
      if (busy || saving) { status.textContent = 'Wait for the current request to finish.'; return; }
      if (!transcript.length) { status.textContent = 'Ask a question before saving.'; return; }
      saving = true; save.disabled = true;
      try {
        savedId ||= `ainv_${crypto.randomUUID()}`;
        const saved = await api('/beta/api/analytics/investigations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: savedId, messages: transcript }) });
        dirty = false; savedItems = [saved, ...savedItems.filter(item => item.id !== saved.id)]; renderAccountSaved(); status.textContent = 'Saved to your account.';
      } catch (error) { status.textContent = error.message; }
      finally { saving = false; save.disabled = false; }
    };
    fresh.onclick = async () => {
      if (busy || saving || dirty && !await confirmAction('Start a new chat? Save any changes you want to keep first.')) return;
      transcript = []; dirty = false; savedId = null; chosenVideo = null; previousQuestions.length = 0; conversation.replaceChildren(); status.textContent = '';
    };
    renderAccountSaved();
    void loadSaved().catch(error => { status.textContent = error.message; });
  }
  const compose = document.querySelector('.chat-compose');
  const input = document.querySelector('.chat-compose input');
  const submit = document.querySelector('.chat-compose button');
  if (compose && input) compose.onsubmit = event => {
    event.preventDefault();
    if (busy || saving || !input.value.trim()) return;
    const question = input.value.trim();
    if (question.length <= 2000) input.value = '';
    void answer(question);
  };
  append('assistant-message', 'Ask about views, watch time, engagement, or subscriber growth for a video or your connected channel. Answers show the date range and YouTube source.');
  answer = async function analyticsAnswer(question) {
    if (busy || saving || typeof question !== 'string' || !question.trim()) return;
    if (question.length > 2000) { append('assistant-message', 'Please keep your question under 2,000 characters.'); return; }
    busy = true;
    dirty = true;
    if (submit) { submit.disabled = true; submit.textContent = 'Thinking…'; }
    conversation.setAttribute('aria-busy', 'true');
    append('user-message', question);
    transcript.push({ role: 'user', content: question });
    const pending = append('assistant-message', 'Looking up your YouTube analytics…');
    try {
      const selected = range();
      const response = await (globalThis.wtfAnalyticsRequest || fetch)('/beta/api/analytics/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, startDate: selected.from, endDate: selected.to, videoId: state.episode !== 'all' ? state.episode : chosenVideo, comparisonVideoId: state.compareEpisode || null, comparisonWindow: state.episodeWindow || "first7", previousQuestions, recentMessages: transcript.slice(0, -1).slice(-8).map(message => ({ role: message.role, content: message.content.slice(0, 6000) })) }),
        signal: AbortSignal.timeout(60000),
      });
      const result = await response.json();
      pending.textContent = result.answer || 'The assistant is unavailable. Check your connection and try again.';
      if (!response.ok) return;
      if (result.status === 'answered') {
        previousQuestions.push(question);
        if (previousQuestions.length > 4) previousQuestions.shift();
        chosenVideo = result.scope?.videoId || null;
      }
      const format = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Unavailable';
      if (result.scope) {
        const dates = document.createElement('p'); dates.className = 'answer-period';
        dates.textContent = `${result.scope.startDate} – ${result.scope.endDate}${result.comparison ? ` · compared with ${result.comparison.startDate} – ${result.comparison.endDate}` : ''}`;
        pending.append(dates);
      }
      if (Array.isArray(result.ranking) && result.ranking.length) {
        const ranking = document.createElement('ol'); ranking.className = 'answer-ranking';
        for (const row of result.ranking) {
          const item = document.createElement('li');
          const title = document.createElement('a'); title.textContent = row.title;
          if (/^[A-Za-z0-9_-]{6,24}$/.test(row.videoId)) { title.href = `https://www.youtube.com/watch?v=${row.videoId}`; title.target = '_blank'; title.rel = 'noopener noreferrer'; }
          const value = document.createElement('strong'); value.textContent = `${format(row.value)} ${row.label.toLowerCase()}`;
          item.append(title, value); ranking.append(item);
        }
        pending.append(ranking);
      }
      if (Array.isArray(result.metrics) && result.metrics.length) {
        if (result.comparison) {
          const wrapper = document.createElement('div'); wrapper.className = 'answer-table-wrap';
          const table = document.createElement('table'); table.className = 'answer-table';
          const head = document.createElement('tr');
          for (const text of ['Metric', result.comparison.title ? 'Video A' : 'Current', result.comparison.title ? 'Video B' : 'Previous', 'Change']) { const cell = document.createElement('th'); cell.scope = 'col'; cell.textContent = text; head.append(cell); }
          const thead = document.createElement('thead'); thead.append(head); table.append(thead);
          const body = document.createElement('tbody');
          for (const metric of result.metrics) {
            const row = document.createElement('tr');
            for (const text of [metric.label, format(metric.value), format(metric.previous), `${metric.change > 0 ? '+' : ''}${format(metric.change)}`]) { const cell = document.createElement('td'); cell.textContent = text; row.append(cell); }
            body.append(row);
          }
          table.append(body); wrapper.append(table); pending.append(wrapper);
        } else {
          const list = document.createElement('dl'); list.className = 'answer-metrics';
          for (const metric of result.metrics) {
            const row = document.createElement('div');
            const label = document.createElement('dt'); label.textContent = metric.label;
            const value = document.createElement('dd'); value.textContent = format(metric.value);
            row.append(label, value); list.append(row);
          }
          pending.append(list);
        }
      }
      if (Array.isArray(result.insights) && result.insights.length) {
        const insights = document.createElement('ul');
        for (const text of result.insights) { const item = document.createElement('li'); item.textContent = text; insights.append(item); }
        pending.append(insights);
      }
      const evidence = document.createElement('div'); evidence.className = 'answer-evidence';
      for (const source of result.sources || []) {
        const link = document.createElement('a');
        let url;
        try { url = new URL(source.url); } catch { continue; }
        if (url.protocol !== 'https:' || !['www.youtube.com', 'developers.google.com'].includes(url.hostname)) continue;
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = `${source.label}${source.fetchedAt ? ` · fetched ${new Date(source.fetchedAt).toLocaleString()}` : ''}`;
        const line = document.createElement('p'); line.append(link); evidence.append(line);
      }
      for (const text of result.limitations || []) {
        const note = document.createElement('p'); note.textContent = text; evidence.append(note);
      }
      if (evidence.children.length) pending.append(evidence);
      for (const candidate of result.candidates || []) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = candidate.title;
        button.onclick = () => { chosenVideo = candidate.videoId; void answer(`${question}\nFor ${result.selection || "the requested video"}, use video ID ${candidate.videoId}.`); };
        pending.append(button);
      }
    } catch {
      pending.textContent = 'The analytics request could not complete. Please try again; no estimated answer has been substituted.';
    } finally {
      transcript.push({ role: 'assistant', content: pending.innerText || pending.textContent });
      busy = false;
      if (submit) { submit.disabled = false; submit.textContent = 'ask →'; }
      conversation.setAttribute('aria-busy', 'false');
      conversation.scrollTop = pending.offsetTop || 0;
    }
  };
})();
