# TextSplosion - Game Plan

## Game Overview

**TextSplosion** is a competitive multiplayer-only elimination typing game where players take turns in the "hot seat" while others try to eliminate them by inflating a balloon.

## Game Restrictions

- **Multiplayer Only**: Solo players cannot select this game

## Game Flow

### Gameplay Screen

#### Hot Seat System
- **One Player at a Time**: A single player is in the "hot seat"
- **Visual**: Player's icon is attached to a big balloon
- **Objective**: Complete a typing challenge to escape the hot seat

#### Hot Seat Player Challenge
- **Challenge Types** (rotating/varied):
  - Type text backwards
  - Type words for colors even though the words are displayed in different colors
  - Type text shown one letter at a time
  - Other typing challenges with twists
- **Completion**: Player must finish the challenge to escape

#### Other Players (Pumpers)
- **Position**: Icons placed next to pumps
- **Task**: Given large texts to type
- **Mechanic**: 
  - Every time they type a line of text
  - A burst of air is sent from their pump to the balloon
  - Balloon inflates further

#### Elimination System
- **Balloon Inflation**: Balloon grows as players pump air into it
- **Pop Condition**: When balloon reaches a certain size, it pops
- **Result**: Player in the hot seat is eliminated
- **Eliminated Players**: Can still type and pump air for subsequent players

#### Turn Progression
- **Escape**: If hot seat player completes their challenge:
  - They escape the hot seat
  - Go to the back of the line
- **Rotation**: All non-defeated players move up
- **New Hot Seat**: Next player in line enters the hot seat
- **Cycle Continues**: Process repeats with new player in hot seat

#### Win Condition
- **Elimination Format**: Game continues until all but one player are eliminated
- **Winner**: Last remaining player wins the game

## Technical Considerations

### Game State Management
- Hot seat player tracking
- Player queue/line order
- Elimination status for each player
- Balloon size/inflation level

### Challenge System
- Challenge type selection/rotation
- Challenge generation for different types:
  - Backwards typing text generation
  - Color word challenges (words in different colors)
  - One-letter-at-a-time reveal system
  - Other challenge types
- Challenge completion validation

### Pumping System
- Line completion detection for pumpers
- Air burst animation/effect
- Balloon inflation calculation
- Pop threshold and detection

### Real-time Synchronization (Multiplayer)
- Hot seat player updates
- Balloon size synchronization
- Pump actions from all players
- Elimination state updates
- Queue/line order updates
- Challenge progress tracking

### Visual Effects
- Balloon inflation animation
- Balloon pop effect
- Air burst animations from pumps
- Challenge-specific visual effects (color words, letter reveal, etc.)
