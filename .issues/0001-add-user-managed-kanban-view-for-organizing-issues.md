---
title: Add user-managed kanban view for organizing issues
description: Kanban board view for visual project planning and issue organization
priority: medium
type: improvement
labels: ui, planning
status: open
created: 2026-02-04T06:00:03
---

## Overview

Add a kanban-style board view to the web UI that allows users to visually organize and plan their issues. This would complement the existing list view by providing a drag-and-drop interface for project management workflows.

## Proposed Solution

Introduce a kanban board where users can:
- Define custom columns/stages (e.g., "Backlog", "In Progress", "Review", "Done")
- Drag and drop issues between columns to track progress
- Visually see issue distribution across different stages

The column configuration should be user-managed, allowing flexibility for different workflows and project types.

## Future Considerations

- Swimlanes for grouping by priority, label, or type
- WIP (work-in-progress) limits per column
- Filtering the board view with the existing query syntax
- Persisting board layout preferences

