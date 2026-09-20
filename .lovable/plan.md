# JEE Tracker for StudyFlow

## Goal
Add one offline, local-storage-based **JEE Tracker** workspace to the existing StudyFlow app without replacing or duplicating current features. It will ship with an editable Class 11 JEE Main + Advanced syllabus pack and default settings for JEE 2028, Class 11, and a 6h 30m daily target.

## What will be built

### 1. Navigation and first-time setup
- Add only one new main navigation item: **JEE Tracker**.
- Add internal views: Dashboard, Syllabus, PYQs, Modules, Lectures, Revision, Backlog, Tests, Mistake Book, and JEE Analytics.
- Show a one-time setup flow with editable target year, class, daily goal, and subject/chapter/topic selection.
- Require confirmation before importing; protect against duplicate imports.

### 2. Editable Class 11 syllabus pack
- Store Physics, Chemistry, and Mathematics chapters/topics from the attached specification in a separate versioned configuration file with stable IDs.
- Support subject, chapter, and topic selection during setup.
- Support adding, renaming, and removing custom chapters/topics while preserving unrelated StudyFlow data.
- Keep the structure ready for future Class 12 or full-syllabus packs.

### 3. Syllabus progress tree
- Build collapsible subject and chapter rows.
- Implement full checkbox cascading: parent updates children; children derive checked, unchecked, or indeterminate parent state.
- Calculate progress from actual topics, not hard-coded chapter counts.
- Keep syllabus completion separate from preparation health.
- Add a topic detail view for Concept, Lecture, Notes, Module, Main PYQ, Advanced PYQ, Revision, confidence, and priority.

### 4. Connected JEE tracking tools
- **Lectures:** teacher, duration, resource, and status tracking.
- **PYQs:** Main/Advanced metadata, year/session, result, time, difficulty, mistake tag, and notes; no copyrighted question text.
- **Modules:** institute/module/exercise and attempted/correct/incorrect totals.
- **Revision:** configurable Day 1/3/7/15/30 scheduling that creates entries in existing StudyFlow Tasks/Calendar.
- **Backlog:** simple chapter/topic selection, duplicate prevention, priority/status, automatic suggestions, and actions to start, create a task, schedule, or complete without resetting progress.
- **Tests and Mistake Book:** local test records, score/accuracy tracking, and linked mistakes.

### 5. Dashboard, search, and analytics
- Show target details, days remaining without inventing an official exam date, today’s target, studied time, and remaining time from existing sessions.
- Generate traceable recommendations only from stored backlog, revisions, weak topics, lectures, PYQs, modules, and tests.
- Add one search across tracker records.
- Show JEE-only study hours, subject distribution, syllabus completion, PYQs, modules, revisions, tests, and accuracy.

### 6. Existing StudyFlow integration
- “Start” selects the JEE subject and opens the existing Focus Timer.
- “Create Task” writes to the existing StudyFlow task list.
- Revision/test scheduling writes to existing tasks/calendar-compatible data.
- Topic actions open existing Study Materials, Short Notes, and Doubt Solver views.
- Existing Dashboard, Tasks, Timer, Calendar, Materials, Notes, Doubts, Progress, Shop, settings, and economy remain intact.

### 7. Persistence and safety
- Persist all JEE settings, imported syllabus, progress, lectures, PYQs, modules, backlog, revisions, tests, and mistakes using the current `localStorage` sync pattern.
- Use local `YYYY-MM-DD` dates.
- Do not create cloud tables, migrations, authentication, or server storage.
- Add all JEE keys to the existing export/import backup where applicable.
- Never add demo progress or delete existing StudyFlow data.

## Technical details
- Create focused JEE types, seed data, state hook, and workspace components instead of placing the large syllabus inside UI files.
- Reuse existing Button, Input, Select, Dialog, Tabs, Progress, and semantic theme tokens.
- Extend `TabId` and main page navigation; add the single sidebar/mobile entry.
- Extend task/session metadata only with optional fields needed for JEE linking, preserving old stored records.
- Use memoized derived data and render topic lists only inside expanded chapters.

## Validation
- Verify first-time selection/import, duplicate protection, persistence, and syllabus removal safeguards.
- Verify checked/unchecked/indeterminate cascade and dynamic progress.
- Verify task, timer, calendar, materials, short-notes, and doubt-solver handoffs.
- Verify PYQ, module, lecture, backlog, revision, test, mistake, search, and analytics flows.
- Verify desktop and mobile layouts, dark mode, and that existing StudyFlow pages still work.

## Expected file scope
- New JEE files for types, Class 11 syllabus configuration, local state hook, tracker shell, setup, syllabus tree, dashboard, records, backlog, and analytics.
- Modified integration files: `src/lib/types.ts`, `src/components/Sidebar.tsx`, `src/components/MobileBottomNav.tsx`, `src/pages/Index.tsx`, and `src/components/SettingsPanel.tsx` if backup/settings integration requires it.
- A complete created/modified file list will be provided for the EXE update.
