/** Memberships are loaded under RLS; visitors without a membership explore the public demo. */
export function shouldExploreDemo(membershipCount: number) {
  return membershipCount === 0;
}