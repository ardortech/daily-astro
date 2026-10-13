// Every user-facing zh-TW string lives here. To add English, copy this file
// to en.js with the same shape and register it in ./index.js.
// Functions are used where a string needs values interpolated.

export default {
  lang: 'zh-TW',

  app: {
    name: '每日星座',
    nameLatin: 'DAILY ASTRO',
    myChart: '我的星盤',
    sampleNote: '原型展示：運勢文字由真實星象（太陽、月亮、上升）計算後套用範本產生；名師更新為示意資料。',
  },

  tabs: { today: '今日', feed: '名師更新', notify: '通知' },

  signs: ['牡羊', '金牛', '雙子', '巨蟹', '獅子', '處女', '天秤', '天蠍', '射手', '魔羯', '水瓶', '雙魚'],
  sign: name => `${name}座`,
  elements: ['火', '土', '風', '水'],
  weekdays: '日一二三四五六',
  phases: ['新月', '眉月', '上弦月', '盈凸月', '滿月', '虧凸月', '下弦月', '殘月'],
  bodies: { sun: '太陽', moon: '月亮', moonApprox: '月亮（約）', rising: '上升' },

  cityRegions: {
    tw: '台灣', hk: '香港', mo: '澳門', cn: '中國大陸', sg: '新加坡', my: '馬來西亞',
    jp: '日本', kr: '韓國', us: '美國', ca: '加拿大', uk: '英國', au: '澳洲',
  },
  cities: {
    taipei: '台北', newtaipei: '新北', keelung: '基隆', taoyuan: '桃園', hsinchu: '新竹',
    miaoli: '苗栗', taichung: '台中', changhua: '彰化', chiayi: '嘉義', tainan: '台南',
    kaohsiung: '高雄', pingtung: '屏東', yilan: '宜蘭', hualien: '花蓮', taitung: '台東',
    hongkong: '香港', macau: '澳門',
    beijing: '北京', shanghai: '上海', guangzhou: '廣州', shenzhen: '深圳', xiamen: '廈門',
    fuzhou: '福州', hangzhou: '杭州', nanjing: '南京', chengdu: '成都', wuhan: '武漢',
    singapore: '新加坡', kualalumpur: '吉隆坡', penang: '檳城', kuching: '古晉',
    tokyo: '東京', osaka: '大阪', fukuoka: '福岡', sapporo: '札幌', seoul: '首爾', busan: '釜山',
    losangeles: '洛杉磯', sanfrancisco: '舊金山', seattle: '西雅圖', newyork: '紐約', boston: '波士頓',
    chicago: '芝加哥', houston: '休士頓', honolulu: '檀香山',
    vancouver: '溫哥華', toronto: '多倫多', montreal: '蒙特婁',
    london: '倫敦', manchester: '曼徹斯特',
    sydney: '雪梨', melbourne: '墨爾本', brisbane: '布里斯本', perth: '伯斯',
  },

  // [theme, advice] for the house the moon transits (index 0 = 1st house)
  houses: [
    ['自我與形象', '適合換個髮型、主動開口，你今天說的話分量比平常重。'],
    ['金錢與價值', '收入、花費、自我價值感都被放大，適合整理帳目或談報酬。'],
    ['溝通與學習', '訊息、會議、短途移動特別多，把想法寫下來會更清楚。'],
    ['家庭與安全感', '心思容易回到家裡，適合打掃、陪家人吃飯、整理情緒。'],
    ['創作與戀愛', '靈感與玩心上升，適合約會、做喜歡的事、展示作品。'],
    ['工作與健康', '瑣事多但效率高，適合清待辦、運動、調整作息。'],
    ['伴侶與合作', '一對一關係是主題，合作談判或和另一半溝通都有進展。'],
    ['深度與共享資源', '適合處理貸款、保險、共同財務，也容易觸碰深層情緒。'],
    ['遠方與信念', '想出走、想學新東西，適合規劃旅行、上課、讀書。'],
    ['事業與名聲', '工作表現被看見的一天，適合向上報告、爭取機會。'],
    ['朋友與社群', '人脈帶來好消息，適合參加聚會、在社群發聲。'],
    ['休息與內在', '能量偏低、直覺偏強，適合放慢、獨處、早點睡。'],
  ],

  // [name, advice] by sign distance 0..6
  aspects: [
    ['合相', '情緒和行動同一個方向，衝勁很強，但容易只看自己的角度。'],
    ['半六合', '小小的不協調，多一點彈性就好。'],
    ['六合', '順手的一天，主動一點會有回應。'],
    ['四分相', '情緒和目標拉扯，容易急躁或說話太衝，重要決定緩一緩。'],
    ['三分相', '心情和做事節奏一致，是一週裡最好推進的日子之一。'],
    ['梅花相', '感覺不太對勁卻說不出原因，別硬撐，調整期待。'],
    ['對分相', '容易和身邊的人意見相左，先聽完再回應。'],
  ],

  // by element index (火 土 風 水); hex values live in src/astro
  luckyColors: [
    ['珊瑚紅', '琥珀橘', '正紅'],
    ['橄欖綠', '可可棕', '燕麥米'],
    ['天空藍', '薰衣草紫', '銀灰'],
    ['海軍藍', '湖水綠', '珍珠白'],
  ],
  luckyItems: [
    ['金色細手鍊', '紅繩', '亮面皮帶', '太陽眼鏡'],
    ['木質手串', '皮革錶帶', '玉石墜子', '帆布托特包'],
    ['絲巾', '耳環', '輕薄圍巾', '銀戒指'],
    ['珍珠耳環', '月光石', '香水', '水晶手鍊'],
  ],

  today: {
    wheelLabel: '今日月亮位置',
    wheelCenter: '月',
    headline: (sign, theme) => `${sign}座的今天：${theme}`,
    risingUnknown: '上升 未知',
    moonLine: { pre: '今日月亮在 ', sign: s => `${s}座`, house: '・落在你的第 ', houseSuffix: ' 宮' },
    keyLabel: '今日重點',
    keyTitle: (n, theme) => `月亮行經第 ${n} 宮：${theme}`,
    scoreLabels: ['整體', '愛情', '事業', '財運'],
    starsAria: (k, v) => `${k} ${v} 顆星`,
    watchLabel: '要注意',
    watchBody: (asp, text) => `月亮與你的太陽成${asp}：${text}`,
    luckyColorLabel: '幸運色',
    luckyColorWhy: el => `月亮在${el}象星座，帶點${el}象色調幫你接住今天的節奏。`,
    luckyItemLabel: '幸運配件',
    luckyItemWhy: (hasRising, sign, el) => `呼應你的${hasRising ? '上升' : '太陽'}${sign}座（${el}象）。`,
    miniFeedLabel: '這週名師更新',
    miniFeedEmpty: '還沒有追蹤任何老師。',
  },

  feed: {
    title: '名師更新',
    intro: '追蹤的老師發布週運、月運時推播提醒，點進原頻道觀看。',
    all: '全部',
    kinds: { weekly: '週運', monthly: '月運', live: '直播' },
    upcoming: '即將發布',
    new: 'NEW',
    upcomingNote: '發布後會推播通知你',
    watch: '到原頻道觀看 →',
    footnote: '只顯示標題與連結，內容請到老師的頻道看。正式版會自動偵測新影片／新文章。',
  },

  authors: {
    tang: { name: '唐綺陽', short: '唐', where: 'YouTube・唐綺陽官方專屬頻道', cadence: '週運・月運' },
    mafalda: { name: '瑪法達', short: '瑪', where: '鏡週刊・瑪法達星座運勢', cadence: '週運（每週三）' },
    susan: { name: 'Susan Miller', short: 'S', where: 'Astrology Zone', cadence: '月運' },
  },

  notify: {
    title: '通知設定',
    previewLabel: '推播預覽',
    previewIcon: '星',
    previewTitle: (sign, theme) => `${sign}座今日：${theme}`,
    previewBody: (color, item, tense) => `幸運色${color}・配件${item}。${tense ? '說話慢半拍。' : '適合主動出擊。'}`,
    daily: '每日運勢',
    dailyHint: '每天早上推送一則',
    time: '推送時間',
    following: '追蹤的老師',
    followAria: name => `追蹤${name}`,
    enable: '開啟通知',
    note: '正式版會呼叫瀏覽器的通知授權（iPhone 需先「加入主畫面」才能收推播）。此原型只示範流程。',
    demoToast: time => `示範：每天 ${time} 推送`,
    followed: '已追蹤',
    unfollowed: '已取消追蹤',
  },

  onboard: {
    title: '建立你的星盤',
    intro: '出生時間越準，上升星座越準。不確定時間的話，只會用太陽與月亮。',
    date: '出生日期',
    time: '出生時間',
    city: '出生地',
    noTime: '我不知道出生時間',
    save: '儲存並看今日運勢',
    sample: '範例資料已預先填好，可直接修改。',
    saved: '已儲存你的星盤',
    moonApproxNote: '你出生那天月亮換了星座，沒有出生時間無法確定是哪一個。',
  },

  install: {
    title: '加入主畫面',
    body: '點 Safari 的「分享」按鈕，再選「加入主畫面」，就能像 App 一樣全螢幕開啟，之後也才能收到推播。',
    ios26: 'iOS 26 的分享按鈕在網址列旁的「⋯」裡。',
    otherBrowser: '請改用 Safari 開啟此頁，再點「分享」→「加入主畫面」。',
    dismiss: '知道了',
    shareAria: '分享圖示',
  },
};
