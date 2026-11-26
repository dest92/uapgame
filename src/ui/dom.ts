/** Helper mínimo para crear elementos tipados sin framework. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, props: { className?: string; text?: string; attrs?: Record<string, string> } = {}, children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  for (const [k, v] of Object.entries(props.attrs ?? {})) node.setAttribute(k, v);
  for (const c of children) node.appendChild(c);
  return node;
}
