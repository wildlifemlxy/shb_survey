// Registry of survey projects available after login. Add new projects here as they're onboarded.
export const PROJECTS = [
  {
    id: 'strawHeadedBulbul',
    name: 'Straw Headed Bulbul',
    description: 'A wildlife monitoring initiative tracking Straw-Headed Bulbul populations through survey walks, event coordination, and photo documentation across Singapore\'s nature reserves and parks.',
    path: '/StrawheadedBulbul',
    image: '/shb.png',
    // Names as they appear in an Accounts document's `project` array (case-insensitive match)
    accountProjectNames: ['Straw-headed Bulbul']
  },
  {
    id: 'rifleRangeRoad',
    name: 'Rifle Range Road Project',
    description: 'A conservation survey workspace for observations, field events, and project activity at Rifle Range Road.',
    path: '/RifleRangeRoad',
    image: '/forest/emergent.png',
    accountProjectNames: ['Rifle Range Road', 'Rifle Road Road']
  }
];

// Filters PROJECTS down to the ones listed in an account's `project` array (case-insensitive).
export function getAccessibleProjects(accountProjectNames = []) {
  const normalized = accountProjectNames.map(name => String(name).trim().toLowerCase());
  return PROJECTS.filter(project =>
    project.accountProjectNames.some(name => normalized.includes(name.toLowerCase()))
  );
}

