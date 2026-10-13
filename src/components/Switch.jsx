export function Switch({ checked, onChange, ariaLabel }) {
  return (
    <label class="switch">
      <input type="checkbox" checked={checked} aria-label={ariaLabel} onChange={e => onChange(e.currentTarget.checked)} />
      <span />
    </label>
  );
}
