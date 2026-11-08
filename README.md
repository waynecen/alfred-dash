# Dashboard

A personal dashboard for your tasks, calendar, habits and goals, with an AI assistant that can help you plan your day. There's no account to create: everything you add stays in your browser. The look is deliberately quiet: ink on paper, fine rules, and no colour.

## What you can do

- **Boards.** Make as many pages of widgets as you like, and drag and resize the widgets into place. Each board has its own layout, and every board shares the same data.
- **Tasks.** Add a task in one line, with its date, priority, tags and how often it repeats. Tasks can have due dates and steps, and you can act on several at once. Drag a task onto the calendar to schedule it.
- **Planning.**
  - **Today** shows everything for the day in one column.
  - **Calendar** has a month view and a week view.
  - **Focus** is a session timer.
  - **Clock** includes world clocks.
  - Reminders pop up for upcoming events and for tasks that are due.
- **Growth.** Track habits with streaks and a 12-week history. Set goals that you count yourself or that fill up as tagged tasks are done. A weekly review looks back over the week.
- **AI assistant.** Chat with Claude about your day and ask it to move things around. It suggests changes as cards, and nothing changes until you press **Apply**. There is also a Daily Brief and a Task Assistant that can break a task into steps.
- **And more.** Notes, weather, a summary of your progress, light and dark themes, a command palette, keyboard shortcuts, and **Undo** for anything you delete.

## Getting started

1. Pick a starter layout, or use **Add widget** to choose your own. Drag a widget by its handle to move it, and drag its right or bottom edge (or the corner) to resize it.
2. Add boards with **+** next to the board tabs. Double-click a tab to rename it, and use its **×** to close it.
3. Add tasks in plain words. The extras are read from what you type and taken out of the task's name:

   | Type                        | Means                                                        |
   | --------------------------- | ------------------------------------------------------------ |
   | `today`, `tomorrow`, `fri`  | Due that day (also `next week`, `in 3 days`, `20 nov`)       |
   | `!high`, `!med`, `!low`     | Priority                                                     |
   | `#home`                     | A tag                                                        |
   | `every week`                | Repeats (also `every day`, `every 2 weeks`, `every friday`)  |

   For example, `Pay rent fri !high #home every month` adds "Pay rent". It is due on Friday, has high priority and the tag #home, and repeats monthly.
4. Press **Ctrl+K** to search for anything: commands, boards, widgets, and adding a task.

## Using the AI assistant

The AI features run on Claude and use your own Anthropic API key, so you only pay for what you use.

1. Create a key in the [Anthropic Console](https://console.anthropic.com/settings/keys).
2. In the dashboard, open **Settings → AI assistant** and paste the key.

**Your key:**
- **Where it's kept:** in this browser only. It isn't saved anywhere else, and it isn't included in backups.
- **How it's used:** it's sent with each AI request so that the request can be passed on to Anthropic. It isn't stored or logged along the way.
- **Billing:** all usage is billed to your Anthropic account. It's a good idea to set a monthly spend limit in the Console.
- **Removing it:** you can remove the key from Settings at any time.

**What the assistant can do:** it can only suggest changes, such as adding a task or event, moving a due date, ticking off a habit, starting a focus session, or adding to your notes. You decide what to apply, and every change it makes can be undone.

Everything apart from the AI widgets works without a key.

## Your data

Everything you add is saved in your browser. There's no account and no copy on a server.

Because of that:
- **It doesn't sync.** Your data doesn't follow you to another browser or device by itself.
- **Clearing site data erases it.** If you clear this site's data in your browser, your dashboard goes with it.

Use **Settings → Data** to look after your data:

- **Export backup** downloads a file of everything: tasks, events, habits, goals, notes and layouts.
- **Import backup** replaces what's in this browser with a backup. It asks you first.
- **Clear all data** empties this browser. You can undo this.

To move to a new browser or device, export a backup there and import it in the new one.

## Keyboard shortcuts

| Keys           | What they do                                                  |
| -------------- | ------------------------------------------------------------- |
| Ctrl+K or /    | Command palette: run commands, add a task, or ask Claude      |
| N              | Add a task                                                    |
| T              | Go to the Today widget                                        |
| F              | Start, pause or carry on the focus timer                      |
| 1 to 9, [ , ]  | Switch boards                                                 |
| ?              | Show every shortcut, including the ones on a focused item     |
