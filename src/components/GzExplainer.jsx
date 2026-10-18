import { useState } from 'preact/hooks';
import { t } from '../i18n';

const STEM_EL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const BRANCH_EL = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const EL_VAR = ['var(--el-wood)', 'var(--el-fire)', 'var(--el-earth)', 'var(--el-metal)', 'var(--el-water)'];

export function GzExplainer({ char, onClose }) {
  const [overview, setOverview] = useState(!char);
  const G = t.zodiac.gzExplainer;
  const stemIdx = t.stems.indexOf(char);
  const branchIdx = t.branches.indexOf(char);
  const isStem = stemIdx >= 0;
  const isBranch = branchIdx >= 0;

  const detail = (isStem || isBranch) && !overview;
  const elIdx = isStem ? STEM_EL[stemIdx] : isBranch ? BRANCH_EL[branchIdx] : -1;

  return (
    <div class="gz-sheet-backdrop" onClick={onClose}>
      <div class="gz-sheet" onClick={e => e.stopPropagation()}>
        <div class="gz-sheet-header">
          <h3>{detail ? G.whatIs(char) : G.title}</h3>
          <div class="gz-sheet-actions">
            {detail && <button class="gz-btn" onClick={() => setOverview(true)}>？</button>}
            <button class="gz-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {detail ? (
          <div class="gz-detail">
            <div class="gz-char" style={{ color: EL_VAR[elIdx] }}>{char}</div>
            <div class="gz-meta">
              <span class="gz-tag">{isStem ? G.stem : G.branch}</span>
              <span class="gz-tag" style={{ background: EL_VAR[elIdx], color: '#fff' }}>{G.element(t.wuxing[elIdx])}</span>
              {isBranch && <span class="gz-tag">{G.animal(t.animals[branchIdx])}</span>}
            </div>
          </div>
        ) : (
          <div class="gz-overview">
            <div>
              <h4>{G.stemTitle}</h4>
              <p class="gz-desc">{G.stemDesc}</p>
              <div class="gz-grid">
                {G.stemPairs.map(([pair, el]) => (
                  <div key={pair}><span style={{ color: EL_VAR[t.wuxing.indexOf(el)] }}>{pair}</span> <small>{el}</small></div>
                ))}
              </div>
            </div>
            <div>
              <h4>{G.branchTitle}</h4>
              <p class="gz-desc">{G.branchDesc}</p>
              <div class="gz-grid gz-grid-branch">
                {G.branchPairs.map(([br, animal]) => {
                  const bi = t.branches.indexOf(br);
                  return <div key={br}><span style={{ color: EL_VAR[BRANCH_EL[bi]] }}>{br}</span> <small>{animal}</small></div>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
