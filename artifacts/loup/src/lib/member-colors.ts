type BaseMember = { id: number; isCurrentUser?: boolean };

export function getMemberIndex(memberId: number, members?: BaseMember[]) {
  if (!members) return memberId;
  const sorted = [...members].sort((a, b) => a.id - b.id);
  const nonCurrent = sorted.filter(m => !m.isCurrentUser);
  const idx = nonCurrent.findIndex(m => m.id === memberId);
  return idx >= 0 ? idx : memberId;
}

export function getMemberColor(memberId: number, isCurrentUser: boolean = false, members?: BaseMember[]) {
  if (isCurrentUser) return "hsl(var(--primary))";
  const index = getMemberIndex(memberId, members);
  return `hsl(var(--pack-${(index % 6) + 1}))`;
}

export function getMemberBg(memberId: number, isCurrentUser: boolean = false, members?: BaseMember[]) {
  if (isCurrentUser) return "hsl(var(--primary) / 0.15)";
  const index = getMemberIndex(memberId, members);
  return `hsl(var(--pack-${(index % 6) + 1}) / 0.15)`;
}
