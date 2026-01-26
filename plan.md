# TypeFight - Development Plan

## Project Overview

**TypeFight** is a fun typing practice experience for all people, with a slight skew toward younger audiences.

## Development Approach

### Iterative Page-by-Page Development
- **Complete each page fully** before moving to the next
- **Local testing**: Each page must be running locally and tested
- **Visual approval**: Each page must look satisfactory before proceeding
- **Sequential building**: We will not create the entire project at once
- **Piece-by-piece**: Add functionality page by page, incrementally
- **Final say**: The user has final say on when to move to the next portion

This approach ensures each component is fully functional, tested, and visually approved before building the next piece of the application.

## Home Page

### Visual Design
- Background effect: Falling random letters in faded green color (Matrix-style aesthetic)

### Navigation Options
1. **Host a game**
2. **Join a game**
3. **Play solo**

## Customization Screen

After selecting an option, users are taken to a customization screen where they can configure:
- **ALIAS** (username/nickname)
- **COLOR** (player color)
- **FONT** (text font preference)
- **ICON** (player icon/avatar)

## Game Flow

### Host Flow
1. Select "Host a game"
2. Customize (alias, color, font, icon)
3. Click "Start"
4. Taken to access code page
5. Share access code with players
6. When ready, host clicks "Begin" → All players moved to game page

### Join Flow
1. Select "Join a game"
2. Customize (alias, color, font, icon)
3. Enter access code
4. Click "Start"
5. Wait on lobby/waiting screen
6. When host begins → Moved to game page

### Solo Flow
1. Select "Play solo"
2. Customize (alias, color, font, icon)
3. Click "Start"
4. Taken directly to game page

## Games Page

### Visual Design
- Grid/layout of game cards
- Each card displays:
  - Game image (static)
  - Gameplay GIF (shown on hover)
  - Card expands and lights up on hover

### Game Selection Behavior

#### Multiplayer Sessions
- **Host**: Only host can select/start a game
- **Other Players**: Can click on a game card to indicate preference
  - Their icon appears at the top of the game card
  - Visible to all players in the session
  - Shows voting/preference system

#### Solo Mode
- Player can directly click any game card to start playing

### Available Games
1. **QuickKeys**
2. **SpaceBarInvaders**
3. **TextSplosion**
4. **TypeFlight**

*(See individual game plan files for detailed specifications)*

## Progress Summary

### Completed Features
- **Home Page**: Implemented with Matrix-style falling letters background and navigation buttons for Host, Join, Solo modes.
- **Customization Screen (/player/[mode])**: Full player setup with alias, color picker, font selection, icon grid. Mode-based background colors, alias maxlength enforcement, word-wrap, and responsive design. Supports optional join code prefill from URL (/player/join/<code>).
- **PlayerTypeContext**: App-wide React context for managing player type (host/join/solo) and join code state.
- **Party Page (/party/[code])**: Lobby screen with join code display, copy button, QR code linking to full join URL, real-time players table via DB polling, and host-only start button.
- **Database Layer**: In-memory DynamoDB simulation with TypeScript schemas for Player and PartySession. Includes functions for code generation, party creation, player management, and game start polling.
- **Routing & Flow**:
  - Host: Generates unique 8-char code, creates party, adds player, navigates to /party/<code>.
  - Join: Validates entered code, adds player if valid, navigates to /party/<code>; shows error for invalid codes.
  - Solo: Bypasses party, navigates directly to /games.
- **Additional Enhancements**: ESLint updated to latest, QR code generation, mobile-friendly styling, context provider wrapping root layout.

### Next Steps
- Implement /games page with game selection grid.
- Develop individual game pages (QuickKeys, etc.).
- Replace in-memory DB with real DynamoDB integration.
- Add game logic and real-time updates. 
- Testing and refinements.
