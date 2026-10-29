import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

class Element {
  className = "";
  style = {};
  disabled = false;
  type = "";
  value = "";
  onsubmit?: (event: {preventDefault: () => void}) => void;
  onclick?: () => Promise<void>;
  parentElement!: Element;
  setAttribute() {}
  before(node: Element) { this.children.push(node); }
  textContent = "";
  children: Element[] = [];
  scrollTop = 0;
  scrollHeight = 1;
  append(...nodes: Element[]) { this.children.push(...nodes); }
  replaceChildren() { this.children = []; }
}

describe("production analytics assistant", () => {
  it("replaces fixture responses with the protected API and renders data as text", async () => {
    const conversation = new Element();
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      status: "answered", answer: "Verified API answer", scope: { videoId: "video_test1" },
      metrics: [{ label: "Net subscriber growth", value: 75 }],
      sources: [{label: "Malformed link", url: "not-a-url"}, { label: "<script>untrusted title</script>", url: "https://www.youtube.com/watch?v=video_test1" }],
    }) });
    const context = vm.createContext({
      document: { querySelector: (selector: string) => selector === "#conversation" ? conversation : null, createElement: () => new Element() },
      fetch, URL, URLSearchParams, window: { location: { search: `?channel=UC${"a".repeat(22)}` } }, AbortSignal, Date, console,
      range: () => ({ from: "2026-09-01", to: "2026-09-30" }),
      state: { episode: "all" }, answer: vi.fn(),
    });
    vm.runInContext(readFileSync("public/analytics-demo/analytics-assistant.js", "utf8"), context);
    await context.answer('Subscriber growth for "Example"?');
    expect(fetch.mock.calls[0][0]).toBe("/beta/api/analytics/assistant");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ startDate: "2026-09-01", endDate: "2026-09-30" });
    expect(conversation.children.at(-1)?.textContent).toBe("Verified API answer");
    context.state.episode = 'video_test2';
    await context.answer('Compare the selected videos');
    expect(JSON.parse(fetch.mock.calls[1][1].body).videoId).toBe('video_test2');
    expect(JSON.parse(fetch.mock.calls[1][1].body).recentMessages).toEqual([{role:'user',content:'Subscriber growth for \"Example\"?'},{role:'assistant',content:'Verified API answer'}]);
    const list = conversation.children.at(-1)?.children.find(node => node.className === 'answer-metrics');
    expect(list?.children[0].children[1].textContent).toBe("75");
    expect(conversation.children.at(-1)?.children.find(node => node.className === 'answer-evidence')?.children[0].children[0].textContent).toBe("<script>untrusted title</script>");
  });
  it.each(['ranking', 'comparison', 'video_comparison'])("renders structured %s results without raw HTML", async kind => {
    const conversation = new Element();
    const result = { status: 'answered', answer: 'Summary', scope: { title: 'Video A', startDate: '2026-09-01', endDate: '2026-09-30' },
      ...(kind === 'ranking' ? { ranking: [{ title: '<b>Video</b>', videoId: 'video_test1', label: 'Subscribers gained', value: 87 }] } : {
        comparison: { ...(kind === 'video_comparison' ? { title: '<b>Video B</b>' } : {}), startDate: '2026-08-02', endDate: '2026-08-31' }, metrics: [{ label: 'Views', value: 100, previous: null, change: null }],
      }),
    };
    const context = vm.createContext({ document: { querySelector: (selector: string) => selector === "#conversation" ? conversation : null, createElement: () => new Element() },
      fetch: vi.fn().mockResolvedValue({ ok: true, json: async () => result }), URL, URLSearchParams, window: { location: { search: `?channel=UC${"a".repeat(22)}` } }, AbortSignal, Date, console,
      range: () => ({ from: '2026-09-01', to: '2026-09-30' }), state: { episode: 'all' }, answer: vi.fn(),
    });
    vm.runInContext(readFileSync('public/analytics-demo/analytics-assistant.js', 'utf8'), context);
    await context.answer('Question');
    const response = conversation.children.at(-1)!;
    expect(response.textContent).toBe('Summary');
    expect(response.children[0].textContent).toContain('2026-09-01');
    if (kind === 'ranking') {
      expect(response.children[1].className).toBe('answer-ranking');
      expect(response.children[1].children[0].children[0].textContent).toBe('<b>Video</b>');
    } else {
      const table = response.children[1].children[0];
      expect(table.children[0].children[0].children.map(node => node.textContent)).toEqual(kind === 'video_comparison' ? ['Metric', 'Video A', 'Video B', 'Change'] : ['Metric', 'Current', 'Previous', 'Change']);
      expect(table.children[1].children[0].children.map(node => node.textContent)).toEqual(['Views', '100', 'Unavailable', 'Unavailable']);
    }
  });

  it("saves the transcript to the account and reopens it as safe text", async () => {
    let snapshot: {id: string; messages: Array<{role: string; content: string}>} | null = null;
    const fetch = vi.fn(async (path: string, options?: {method?: string; body?: string}) => {
      if (path.endsWith('/assistant')) return {ok: true, json: async () => ({status: 'answered', answer: '<b>Stored answer</b>'})};
      if (options?.method === 'POST') { snapshot = JSON.parse(options.body!); return {ok: true, json: async () => ({id: snapshot!.id})}; }
      if (path.endsWith('/investigations')) return {ok: true, json: async () => ({investigations: snapshot ? [{id: snapshot.id, title: 'Question'}] : []})};
      return {ok: true, json: async () => snapshot};
    });
    const setup = () => {
      const conversation = new Element(), list = new Element(), count = new Element(), container = new Element(); list.parentElement = container;
      const nodes: Record<string, Element> = {'#conversation':conversation,'#saved-list':list,'#saved-count':count};
      const context = vm.createContext({document:{querySelector:(s:string)=>nodes[s] || null,createElement:()=>new Element()}, fetch, URL, URLSearchParams, window: { location: { search: `?channel=UC${"a".repeat(22)}` } }, AbortSignal, Date, console,
        crypto:{randomUUID:()=> '12345678-1234-4123-8123-123456789abc'}, range:()=>({from:'2026-09-01',to:'2026-09-30'}),state:{episode:'all'},answer:vi.fn(),renderSaved:vi.fn()});
      vm.runInContext(readFileSync('public/analytics-demo/analytics-assistant.js','utf8'),context);
      return {context,conversation,list,count,container};
    };
    const first=setup(); await first.context.answer('Question');
    await first.container.children[0].children[0].onclick!();
    expect(snapshot!.messages).toEqual([{role:'user',content:'Question'},{role:'assistant',content:'<b>Stored answer</b>'}]);
    expect(first.count.textContent).toBe('1');
    expect(fetch.mock.calls.filter(([path])=>path.endsWith('/investigations')).length).toBe(2);
    expect(first.container.children[0].children[2].textContent).toBe('Saved to your account.');
    const reopened=setup(); await new Promise(resolve=>setTimeout(resolve,0));
    await reopened.list.children[0].children[0].onclick!();
    expect(reopened.conversation.children.at(-1)?.textContent).toBe('<b>Stored answer</b>');
  });

  it("allows suggestions to be hidden and shown without clearing chat", async () => {
    const conversation = new Element(), chips = new Element();
    const context = vm.createContext({document:{querySelector:(s:string)=>s==='#conversation'?conversation:s==='.prompt-chips'?chips:null,createElement:()=>new Element()}});
    vm.runInContext(readFileSync('public/analytics-demo/analytics-assistant.js','utf8'),context);
    const toggle=chips.children[0];
    expect(toggle.textContent).toBe('Hide suggestions');
    await toggle.onclick!(); expect(toggle.textContent).toBe('Show suggestions');
    await toggle.onclick!(); expect(toggle.textContent).toBe('Hide suggestions');
    expect(conversation.children.length).toBe(1);
  });

  it("preserves a second draft while busy and reenables the composer after failure", async () => {
    const conversation=new Element(),compose=new Element(),input=new Element(),submit=new Element();
    const nodes:Record<string,Element>={'#conversation':conversation,'.chat-compose':compose,'.chat-compose input':input,'.chat-compose button':submit};
    let reject!: (error: Error)=>void;
    const fetch=vi.fn(()=>new Promise((_resolve,failed)=>{reject=failed;}));
    const context=vm.createContext({document:{querySelector:(s:string)=>nodes[s]||null,createElement:()=>new Element()},fetch,URL,URLSearchParams,window:{location:{search:`?channel=UC${"a".repeat(22)}`}},AbortSignal,Date,range:()=>({from:'2026-09-01',to:'2026-09-30'}),state:{episode:'all'},answer:vi.fn()});
    vm.runInContext(readFileSync('public/analytics-demo/analytics-assistant.js','utf8'),context);
    input.value='First question';compose.onsubmit!({preventDefault(){}});
    expect(input.value).toBe('');expect(submit.disabled).toBe(true);
    input.value='My next question';compose.onsubmit!({preventDefault(){}});
    expect(input.value).toBe('My next question');expect(fetch).toHaveBeenCalledTimes(1);
    reject(new Error('network'));await new Promise(resolve=>setTimeout(resolve,0));
    expect(submit.disabled).toBe(false);expect(input.value).toBe('My next question');
    expect(conversation.children.at(-1)?.textContent).toContain('could not complete');
  });

});
