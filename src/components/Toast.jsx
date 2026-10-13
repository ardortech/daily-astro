export function Toast({ msg }) {
  return msg ? <div class="toast" role="status">{msg}</div> : null;
}
