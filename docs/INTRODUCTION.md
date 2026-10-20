# Kanban App — Initial Instructions for Coding Agent

## 1. Project Overview

Build a **React + TypeScript Kanban application** using TanStack Start 1.0.

The application should be a frontend-only Kanban board with three columns:

- **To Do**
- **Doing**
- **Done**

The goal is to build a simple, beautiful, and functional Kanban board, then progressively improve it through clearly defined development stages.

## 2. Technical Requirements

Use **React and TypeScript** for the application.

For drag-and-drop functionality, my preferred library is **dnd-kit**.

Build TanStack Start application with file-based TanStack Router routes, validated search params, route loaders, typed server functions, full-document SSR, and streaming. Keep server-only work behind explicit boundaries, choose the appropriate SSR mode per route, and target the deployment runtime without changing the application model.

## 3. Functional Requirements

### Rick and Morty Character Integration

Fetch character data from the Rick and Morty GraphQL API:

https://rickandmortyapi.com/graphql

Use the API response to populate a list of characters that can be assigned to Kanban items.

### Item Creation

- Users must be able to create new Kanban items through a form.
- Every item must have a Rick and Morty character assigned to it.

### Kanban Board

- Display three columns: To Do, Doing, and Done.
- Items must be draggable between columns.
- Items must be reorderable within the same column.

### Completion Experience

When an item is moved to the **Done** column, display a delightful visual effect.

This could be confetti, an animation, or another creative interaction. You may choose the implementation.

## 4. Planning and Design Process

First, take a look at the initial @architecture-initial.md document, improve if if neccesary and let's continue with a development plan, and visual design.

Define a plan divided into multiple stages, with each stage representing a meaningful improvement to the application.

### Development Stages

- Propose a staged implementation plan before writing code.
- Explain the goals, scope, and expected deliverables of each stage.
- Organize stages so the application improves progressively.
- Present the plan for discussion and approval.
- After completing each approved stage, pause for review and alignment before proceeding to the next.

## Initial Board

The first stage should already deliver a **simple, beautiful, and functional Kanban board**, including basic drag-and-drop functionality.

Ideally, **the first 2–3 stages should cover all the main requirements**, including item creation, item edit and delition, character assignment, drag-and-drop, and the completion animation.

Plan and write other optional features after stage 3 like: search, filtering, sorting, labeling, priority labels, description, etc.

## 5. Design Expectations

Keep the design clean, modern, and visually polished from the beginning.

Pay attention to spacing, typography, layout, and usability. Even the first version should look like a nice, usable application rather than an unfinished prototype. In the design remember to use best ractices for drag and drop indicators. 

Let's agree on the general design direction before coding.

## 6. Collaboration and Execution Rules

1. **Plan before coding.** Propose a simple architecture, design direction, and development stages.
2. **Agree before implementing.** Wait for my approval before starting each stage.
3. **Keep stages meaningful.** Don't split small tasks into unnecessary stages. I want to see a working application early.
4. **Keep things simple.** Avoid overengineering or adding unnecessary abstractions.
5. **Preserve the requirements.** Don't change or remove requirements without discussing them with me.
6. **Explain decisions.** Briefly explain important technical or design choices when needed.

## 7. Collaboration and Execution Rules

Testing & Validation. Add lightweight automated tests as features are implemented:

API tests (Vitest): Test Rick and Morty GraphQL fetching, response handling, and error states using mocked requests.

End-to-end tests (Playwright): Test core user flows in a real browser, including creating, editing, deleting, and dragging Kanban items.

Run relevant tests after each stage and fix failures before requesting approval.

After completing each development phase, run a review using six specialized agents:

React Best Practices
Accessibility
TypeScript & Code Quality
Performance
Security
UI/UX & Responsive Design

Each agent should independently review the implementation and report actionable findings.



## Your First Task

Before writing code:

1. Review the requirements and the `ARCHITECTURE-INITIAL.md` file.
2. Suggest a simple design direction.
3. Propose a short development plan, aiming to complete the core application within 3 stages.
4. Suggest optional features for later stages, but keep them separate from the core plan.

**Let's review and agree on the plan before starting implementation.**

