/* Live analytics assistant. All values and source links come from the protected API. */
(() => {
  let busy = false;
  let chosenVideo = null;
  const previousQuestions = [];
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
  append('assistant-message', 'Ask about views, watch time, engagement, or subscriber growth for a video or your connected channel. Answers show the date range and YouTube source.');
  answer = async function analyticsAnswer(question) {
    if (busy || typeof question !== 'string' || !question.trim()) return;
    if (question.length > 2000) { append('assistant-message', 'Please keep your question under 2,000 characters.'); return; }
    busy = true;
    append('user-message', question);
    const pending = append('assistant-message', 'Looking up your YouTube analytics…');
    try {
      const selected = range();
      const response = await fetch('/beta/api/analytics/assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question, startDate: selected.from, endDate: selected.to, videoId: chosenVideo || (state.episode !== 'all' ? state.episode : null), previousQuestions }),
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
      if (Array.isArray(result.metrics) && result.metrics.length) {
        const list = document.createElement('dl');
        for (const metric of result.metrics) {
          const label = document.createElement('dt'); label.textContent = metric.label;
          const value = document.createElement('dd'); value.textContent = typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Unavailable';
          list.append(label, value);
        }
        pending.append(list);
      }
      for (const source of result.sources || []) {
        const link = document.createElement('a');
        const url = new URL(source.url);
        if (url.protocol !== 'https:' || !['www.youtube.com', 'developers.google.com'].includes(url.hostname)) continue;
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.textContent = `${source.label}${source.fetchedAt ? ` · fetched ${new Date(source.fetchedAt).toLocaleString()}` : ''}`;
        const line = document.createElement('p'); line.append(link); pending.append(line);
      }
      for (const text of result.limitations || []) {
        const note = document.createElement('p'); note.textContent = text; pending.append(note);
      }
      for (const candidate of result.candidates || []) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = candidate.title;
        button.onclick = () => { chosenVideo = candidate.videoId; void answer(`${question}\nUse video ID ${candidate.videoId}.`); };
        pending.append(button);
      }
    } catch {
      pending.textContent = 'The analytics request could not complete. Please try again; no estimated answer has been substituted.';
    } finally {
      busy = false;
      conversation.scrollTop = conversation.scrollHeight;
    }
  };
})();
