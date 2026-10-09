/** classnames join (dependency-free cn; tailwind-merge omitted deliberately). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
