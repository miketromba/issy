/**
 * issy API Server
 * 
 * Provides REST API endpoints for the issue tracking system.
 * Uses the shared library for all issue operations.
 */

import { serve } from "bun";
import { resolve } from "node:path";
import index from "./index.html";

// Import shared library
import {
  setIssuesDir,
  getAllIssues,
  getIssue,
  createIssue,
  updateIssue,
  closeIssue,
  reopenIssue,
  deleteIssue,
  filterAndSearchIssues,
  filterByQuery,
  type CreateIssueInput,
  type UpdateIssueInput,
} from "@miketromba/issy-core";

// Initialize issues directory from env or current working directory
const DEFAULT_ROOT = process.env.ISSUES_ROOT || process.cwd();
const ISSUES_DIR = process.env.ISSUES_DIR || resolve(DEFAULT_ROOT, ".issues");
setIssuesDir(ISSUES_DIR);

const PORT = Number(process.env.ISSUES_PORT || process.env.PORT || 1554);

const server = serve({
  port: PORT,
  routes: {
    // API: List all issues with optional filtering and search
    // Supports both legacy filters (status, priority, type, search) and 
    // new query language via 'q' parameter (e.g., q=is:open priority:high)
    "/api/issues": {
      GET: async (req) => {
        const url = new URL(req.url);
        const allIssues = await getAllIssues();
        
        // New query language support via 'q' parameter
        const query = url.searchParams.get("q");
        if (query) {
          return Response.json(filterByQuery(allIssues, query));
        }
        
        // Legacy filter parameters
        const status = url.searchParams.get("status") || undefined;
        const priority = url.searchParams.get("priority") || undefined;
        const type = url.searchParams.get("type") || undefined;
        const search = url.searchParams.get("search") || undefined;
        
        // If any legacy filters are provided, apply them
        if (status || priority || type || search) {
          const filtered = filterAndSearchIssues(allIssues, {
            status,
            priority,
            type,
            search,
          });
          return Response.json(filtered);
        }

        return Response.json(allIssues);
      },
    },

    // API: Get single issue by ID
    "/api/issues/:id": {
      GET: async (req) => {
        const issue = await getIssue(req.params.id);
        if (!issue) {
          return Response.json({ error: "Issue not found" }, { status: 404 });
        }
        return Response.json(issue);
      },

      // Update an issue
      PATCH: async (req) => {
        try {
          const input: UpdateIssueInput = await req.json();
          const issue = await updateIssue(req.params.id, input);
          return Response.json(issue);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },

    // API: Create a new issue
    "/api/issues/create": {
      POST: async (req) => {
        try {
          const input: CreateIssueInput = await req.json();
          const issue = await createIssue(input);
          return Response.json(issue, { status: 201 });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },

    // API: Close an issue
    "/api/issues/:id/close": {
      POST: async (req) => {
        try {
          const issue = await closeIssue(req.params.id);
          return Response.json(issue);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },

    // API: Reopen an issue
    "/api/issues/:id/reopen": {
      POST: async (req) => {
        try {
          const issue = await reopenIssue(req.params.id);
          return Response.json(issue);
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },

    // API: Delete an issue
    "/api/issues/:id/delete": {
      DELETE: async (req) => {
        try {
          await deleteIssue(req.params.id);
          return Response.json({ success: true });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          return Response.json({ error: message }, { status: 400 });
        }
      },
    },

    // API: Health check
    "/api/health": {
      GET: () => Response.json({ status: "ok", service: "issy" }),
    },

    // Serve frontend for everything else
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`📋 issy running at ${server.url}`);
