---
name: next-task
description: Implement the next unchecked task from docs/spec/tasks.md following the MindPin spec. Use when asked to continue the build, do the next task, or work on a specific task number.
---

# Next task

1. Open `docs/spec/tasks.md` and find the first unchecked task, or the task number the user named.
2. Read the requirements it cites in `docs/spec/requirements.md` and the relevant parts of `docs/spec/design.md`.
3. Tell the user which task you are starting and list the acceptance criteria it must satisfy. If anything is unclear or conflicts, ask before coding.
4. For a UI task, ask for the Figma frame link if none was given and read it through the Figma MCP server.
5. Write tests for the acceptance criteria, then implement until they pass.
6. Run the tests, the type check, and the linter. Fix what fails.
7. Tick the task's checkbox in `docs/spec/tasks.md`.
8. Summarize what changed, which criteria are now covered, and anything left open. Do not start the following task until the user says so.
