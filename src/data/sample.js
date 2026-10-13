// Fixture data copied from design/prototype.html. Phase 5 replaces this with
// rows from the author tracker (title / date / link only — never forecast text).
// Titles and `when` are external post metadata, not UI copy, so they stay here.
export const AUTHORS = [
  { id: 'tang', url: 'https://www.youtube.com/channel/UCK7LdglLCApOTaylxX8hW2Q' },
  { id: 'mafalda', url: 'https://www.mirrormedia.mg/' },
  { id: 'susan', url: 'https://www.astrologyzone.com/horoscopes/' },
];

// h = hours since published (negative = upcoming)
export const FEED = [
  { a: 'mafalda', kind: 'weekly', title: '瑪法達星座運勢 10.14～10.20', when: '週三 15:58 預計', h: -46, upcoming: true },
  { a: 'tang', kind: 'weekly', title: '唐綺陽 10/12–10/18 星座運勢週報', when: '今天 12:00', h: 9 },
  { a: 'tang', kind: 'live', title: '唐綺陽直播：天秤季下半場怎麼過', when: '昨天 21:00', h: 24 },
  { a: 'mafalda', kind: 'weekly', title: '瑪法達星座運勢 10.07～10.13', when: '10/7 15:58', h: 132 },
  { a: 'susan', kind: 'monthly', title: 'Your October Horoscope by Susan Miller', when: '10/1', h: 270 },
  { a: 'tang', kind: 'monthly', title: '唐綺陽 10 月星座運勢', when: '9/29 21:00', h: 330 },
];

export const SAMPLE_BIRTH = { date: '1992-08-14', time: '09:20', city: 'taipei', noTime: false };
