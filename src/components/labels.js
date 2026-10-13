// Small label builders shared by screens: indices → zh-TW via t.
import { STEM_EL } from '../astro';
import { t } from '../i18n';

export const gz = ([s, b]) => t.stems[s] + t.branches[b];
// e.g. 水猴: element of the year stem + animal.
export const animalName = p => t.zodiac.animal(t.wuxing[STEM_EL[p.wuxing.pillars[0][0]]], t.animals[p.zodiac]);
// e.g. 壬水
export const dayMasterName = w => t.stems[w.dayMaster] + t.wuxing[STEM_EL[w.dayMaster]];
