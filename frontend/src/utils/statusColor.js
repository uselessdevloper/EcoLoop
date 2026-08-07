/** Maps a confidence percentage to a semantic tone used across Review + Feedback. */
export function confidenceTone(confidencePct) {
  if (confidencePct >= 75) return "success";
  if (confidencePct >= 50) return "warning";
  return "danger";
}

export function toneClasses(tone) {
  switch (tone) {
    case "success":
      return "bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]";
    case "danger":
      return "bg-error-container text-on-error-container border-error/30";
    case "warning":
    default:
      return "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-container/30";
  }
}
