// Registry of survey projects available after login. Add new projects here as they're onboarded.
export const PROJECTS = [
  {
    id: 'strawHeadedBulbul',
    name: 'Straw-Headed Bulbul Survey',
    description: 'A wildlife monitoring initiative tracking Straw-Headed Bulbul populations through survey walks, event coordination, and photo documentation across Singapore\'s nature reserves and parks.',
    path: '/StrawheadedBulbul',
    // Names as they appear in an Accounts document's `project` array (case-insensitive match)
    accountProjectNames: ['Straw-headed Bulbul']
  }
];

// Filters PROJECTS down to the ones listed in an account's `project` array (case-insensitive).
export function getAccessibleProjects(accountProjectNames = []) {
  const normalized = accountProjectNames.map(name => String(name).trim().toLowerCase());
  return PROJECTS.filter(project =>
    project.accountProjectNames.some(name => normalized.includes(name.toLowerCase()))
  );
}

