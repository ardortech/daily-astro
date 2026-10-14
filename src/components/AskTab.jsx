import { useEffect, useRef, useState } from 'preact/hooks';
import { supabase } from '../lib/supabase.js';
import { t } from '../i18n';

const SUGGEST = ['今天感情運如何？', '這週工作要注意什麼？', '下個月哪天適合搬家？', '明天面試穿什麼顏色？', '水星逆行對我有影響嗎？'];
const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';
const WEEKDAYS = '日一二三四五六';
const SIGNS = ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '魔羯', '水瓶', '雙魚'];
const REL_NAMES = ['六合', '三合', '比和', '平', '害', '刑', '沖'];

function DayCard({ d, best }) {
  const dt = new Date(d.date + 'T00:00:00+08:00');
  const m = dt.getMonth() + 1, day = dt.getDate(), wd = dt.getDay();
  const score = d.score >= 4 ? 5 : d.score >= 3 ? 4 : 3;
  const tag = best
    ? <span class="tagg top">{t.ask.bestTag}</span>
    : d.rel <= 1
      ? <span class="tagg good">{REL_NAMES[d.rel]}</span>
      : <span class="tagg mid">{t.ask.steadyTag}</span>;
  return (
    <div class={`dcard${best ? ' best' : ''}`}>
      <div class="day"><b>{day}</b><span>{m}{t.ask.monthSep}{WEEKDAYS[wd]}</span></div>
      <div class="info">
        <div class="row1"><span class="gzs">{STEMS[d.day[0]]}{BRANCHES[d.day[1]]}{t.ask.dayChar}</span>{tag}<span class="stars" aria-label={t.starsAria(t.scoreLabels[0], score)}>{'★'.repeat(score)}{'☆'.repeat(5 - score)}</span></div>
        <div>{t.ask.goodHourLabel} {d.hours.slice(0, 2).map(h => t.hourRange(h)).join('、') || t.hourRange(d.hours[0] ?? 0)}</div>
        <div class="why" style="font-size:12.5px">{d.why.join('・')}</div>
      </div>
    </div>
  );
}

function formatResetTime(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function AskTab({ profile, initialQ, onBack }) {
  const [messages, setMessages] = useState([]);
  const [remaining, setRemaining] = useState(10);
  const [resetAt, setResetAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const chatRef = useRef();
  const inputRef = useRef();
  const initRef = useRef(false);

  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const animals = '鼠牛虎兔龍蛇馬羊猴雞狗豬';
      const wuxing = ['木', '火', '土', '金', '水'];
      const me = `${wuxing[profile.wuxing?.counts ? [0, 1, 2, 3, 4].reduce((a, b) => profile.wuxing.counts[b] < profile.wuxing.counts[a] ? b : a, 0) : 0]}${animals[profile.zodiac]}`;
      setMessages([{ role: 'ai', html: t.ask.greeting(me) }]);
    }
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (initialQ && initRef.current && !loading && messages.length === 1) send(initialQ);
  }, [initialQ]);

  const send = async (q) => {
    q = q.trim();
    if (!q || loading) return;
    if (remaining <= 0) return;

    setMessages(prev => [...prev, { role: 'me', text: q }]);
    setLoading(true);
    setInput('');

    try {
      if (!supabase) throw new Error('no supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('not signed in');

      const resp = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ question: q, lang: t.lang }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        if (data.error === 'quota_exceeded') {
          setRemaining(0);
          if (data.resetAt) setResetAt(data.resetAt);
          setMessages(prev => [...prev, { role: 'ai', html: t.ask.quotaReset(formatResetTime(data.resetAt)) }]);
        } else {
          setMessages(prev => [...prev, { role: 'ai', html: t.ask.error }]);
        }
        setLoading(false);
        return;
      }

      setRemaining(data.remaining);
      if (data.resetAt) setResetAt(data.resetAt);
      const answerText = data.answer?.trim() || t.ask.emptyAnswer;
      setMessages(prev => [...prev, { role: 'ai', text: answerText, days: data.days }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', html: t.ask.error }]);
    }
    setLoading(false);
  };

  const onSubmit = e => { e.preventDefault(); send(input); };

  const quotaText = remaining <= 0 && resetAt
    ? t.ask.quotaReset(formatResetTime(resetAt))
    : t.ask.remaining(remaining);

  return (
    <section role="tabpanel" class="ask-view">
      <div class="ask-head">
        <button class="back" type="button" onClick={onBack}>← {t.tabs.home}</button>
        <span class="quota">{quotaText}</span>
      </div>
      <h1 style="font-size:24px;font-weight:900;margin-top:4px">{t.ask.title}</h1>
      <p class="why" style="margin:2px 0 0">{t.ask.subtitle}</p>
      <div class="chat" ref={chatRef}>
        {messages.map((m, i) => m.role === 'me'
          ? <div key={i} class="msg me">{m.text}</div>
          : <div key={i} class="msg ai">
              <span class="who">{t.ask.who}</span>
              {m.html ? <div dangerouslySetInnerHTML={{ __html: m.html }} /> : <div>{m.text}</div>}
              {m.days && m.days.map((d, j) => <DayCard key={j} d={d} best={j === 0} />)}
              {!m.html && m.text && <div class="fine">{t.ask.disclaimer}</div>}
            </div>
        )}
        {loading && (
          <div class="msg ai">
            <span class="who">{t.ask.who}</span>
            <span class="typing"><i /><i /><i />　{t.ask.thinking}</span>
          </div>
        )}
      </div>
      <div class="composer">
        <div class="in">
          <div class="chips">
            {SUGGEST.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}
          </div>
          <form onSubmit={onSubmit}>
            <input ref={inputRef} value={input} onInput={e => setInput(e.target.value)}
              placeholder={t.ask.placeholder} autocomplete="off"
              disabled={remaining <= 0} />
            <button class="send" type="submit" disabled={loading || !input.trim() || remaining <= 0}>{t.ask.send}</button>
          </form>
        </div>
      </div>
    </section>
  );
}

export function AskEntry({ go }) {
  return (
    <div class="ask-entry">
      <button class="ask-box" type="button" onClick={() => go('ask')}>
        <span class="dot">吉</span>{t.ask.entryLabel}
      </button>
      <div class="chips">
        {SUGGEST.slice(0, 4).map(s => <button key={s} type="button" onClick={() => go('ask', s)}>{s}</button>)}
      </div>
    </div>
  );
}
