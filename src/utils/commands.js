// The actions the command palette (Ctrl/Cmd+K) can run. Each command is
//   { id, label, group, keywords?, run, always? }
// `always` commands depend on what was typed (like "Add task …") and are shown whenever
// there is a query, after the ones that matched. New features add their commands here.
//   widgets: the registry     shownIds: the widgets on the dashboard     query: what was typed
//   actions: { addWidget, removeWidget, focusWidget, addTask, toggleTheme, resetLayout, openSettings }
//   theme: the theme in use, 'light' or 'dark'
export function buildCommands({ widgets, shownIds, query = '', actions, theme }) {
  const commands = [];

  for (const [id, widget] of Object.entries(widgets)) {
    if (shownIds.includes(id)) {
      commands.push(
        {
          id: `focus-${id}`,
          group: 'Widgets',
          label: `Go to ${widget.title}`,
          keywords: 'focus jump find',
          run: () => actions.focusWidget(id),
        },
        {
          id: `remove-${id}`,
          group: 'Widgets',
          label: `Remove ${widget.title} widget`,
          keywords: 'delete close hide',
          run: () => actions.removeWidget(id),
        }
      );
    } else {
      commands.push({
        id: `add-${id}`,
        group: 'Widgets',
        label: `Add ${widget.title} widget`,
        keywords: `new show ${widget.description ?? ''}`,
        run: () => actions.addWidget(id),
      });
    }
  }

  commands.push(
    {
      id: 'toggle-theme',
      group: 'Appearance',
      label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      keywords: 'theme dark light colour color',
      run: actions.toggleTheme,
    },
    {
      id: 'reset-layout',
      group: 'Layout',
      label: 'Reset layout',
      keywords: 'sizes positions default arrange',
      run: actions.resetLayout,
    },
    {
      id: 'open-settings',
      group: 'General',
      label: 'Open settings',
      keywords: 'preferences options',
      run: actions.openSettings,
    }
  );

  const text = query.trim();
  if (text) {
    commands.push({
      id: 'add-task',
      group: 'Tasks',
      label: `Add task “${text}”`,
      run: () => actions.addTask(text, 'medium'),
      always: true,
    });
  }

  return commands;
}

// How well one piece of text matches the query: lower is better, null is no match.
// Whole-label prefix beats a word prefix, which beats a substring, which beats the letters
// appearing in order ("adn" finds "Add Notes").
function score(text, query) {
  if (text.startsWith(query)) return 0;
  if (text.split(/\s+/).some((word) => word.startsWith(query))) return 1;
  if (text.includes(query)) return 2;
  let at = 0;
  for (const char of text) {
    if (char === query[at]) at++;
    if (at === query.length) return 3;
  }
  return null;
}

// The commands to show for a query, best match first. Keywords count, but less than the label.
export function matchCommands(commands, query) {
  const q = query.trim().toLowerCase();
  const fixed = commands.filter((command) => !command.always);
  const extra = commands.filter((command) => command.always);
  if (!q) return fixed;

  const ranked = fixed
    .map((command) => {
      const label = score(command.label.toLowerCase(), q);
      const keywords = command.keywords ? score(command.keywords.toLowerCase(), q) : null;
      const best = label ?? (keywords === null || keywords > 2 ? null : keywords + 4);
      return { command, best };
    })
    .filter(({ best }) => best !== null)
    // Array.sort is stable, so equal scores keep their original order.
    .sort((a, b) => a.best - b.best)
    .map(({ command }) => command);

  return [...ranked, ...extra];
}
