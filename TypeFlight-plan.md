# TypeFlight - Game Plan

## Game Overview

**TypeFlight** is a cooperative survival typing game where players navigate a grid to avoid dangers and help each other survive.

## Game Flow

### Gameplay Screen

#### Grid System
- **10x10 Grid**: Main playing area
- **Player Placement**: Each player's icon randomly placed on the grid at start
- **Wrapping/Looping**: Players can move off one edge and reappear on the opposite side
  - Example: Move left off grid → appear on far right

#### Movement System
- **Compass Interface**: Displayed on the side of the page (outside the grid)
  - Shows 4 directions: Up, Right, Down, Left
  - Each direction has a random word assigned
- **Movement Mechanics**:
  - Player types the word for a direction
  - Icon moves one block in that direction
  - Words are unique per player
  - Words change after being typed
- **Client-Side Processing**:
  - Word generation and display handled entirely client-side
  - Only direction changes sent to server

#### Danger System
- **Danger Types**: Lightning strikes, fires, ice, and more
- **Warning System**: 
  - Grid blocks that will be affected are highlighted before the danger strikes
  - Gives players time to react and move away
- **Constant Occurrence**: Dangers appear continuously throughout the game

#### Objective
- **Primary Goal**: Stay alive as long as possible
- **Cooperative Play**: Players work together to survive

#### Resurrection System
- **Mechanic**: Players can resurrect downed teammates
- **Process**:
  1. Move player icon over a downed player's position
  2. Type a resurrection phrase
- **Resurrection Phrase**:
  - Initial length: 10 words
  - Increases by 5 words each time a player goes down
  - Example: First death = 10 words, second death = 15 words, third = 20 words, etc.

### Results Screen

#### Display Information
- **Survival Time**: How long players survived

#### Options
- *(To be determined - likely Play Again and Return to Games Page)*

## Technical Considerations

### Grid Management
- 10x10 grid state synchronization
- Player position tracking
- Danger placement and highlighting
- Collision detection (dangers hitting players)

### Movement System
- Client-side word generation (unique per player)
- Direction change events sent to server
- Wrapping logic for grid edges
- Real-time position updates for all players

### Danger System
- Danger spawning algorithm
- Warning/highlight system before strikes
- Multiple danger types with different behaviors
- Damage/death detection

### Resurrection Mechanics
- Downed player state tracking
- Position overlap detection
- Phrase generation with increasing difficulty
- Phrase validation and resurrection logic

### Real-time Synchronization (Multiplayer)
- Player positions synchronized
- Danger spawns and strikes synchronized
- Death/resurrection state updates
- Survival time tracking
