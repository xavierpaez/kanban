## Component Architecture

The Kanban board will be divided into four main components:

- **KanbanPage** — Main entry point. Responsible for loading the required data and rendering the board.
- **KanbanBoard** — Manages the board's state and coordinates drag-and-drop interactions between columns.
- **KanbanColumn** — Represents a single status (To Do, Doing, Done) and renders its ordered list of cards.
- **KanbanCard** — Represents an individual task, displaying its details and assigned Rick and Morty character.

### Supporting Components

- **CreateItemForm** — Handles creating new tasks.
- **CharacterSelector** — Allows users to select a character fetched from the Rick and Morty API.

### Data Flow

Character data is fetched through the GraphQL API and made available to the item creation form.

Board state is managed at the board level, with updates triggered by item creation and drag-and-drop interactions.

Components should remain focused on their individual responsibilities, keeping the application easy to extend without introducing unnecessary abstractions.
