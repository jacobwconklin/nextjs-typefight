# SpaceBarInvaders - Game Plan

## Game Overview

**SpaceBarInvaders** is a cooperative typing defense game where players protect Earth by typing words that appear over incoming space dangers (asteroids, UFOs, etc.).

## Game Flow

### Gameplay Screen

#### Visual Layout
- **Earth**: Positioned at the center of the page
- **Space Dangers**: Spawn from all sides of the screen
  - Each danger has:
    - An image/visual representation
    - A word displayed above it
  - All dangers move toward Earth

#### Typing Mechanics
- **Word Targeting**: Any player can type the word for any danger
- **Destruction**: When a word is typed correctly:
  - A missile fires from Earth
  - The danger is destroyed
- **Cooperative Play**: Multiple players can work together to defend Earth

#### Danger Types
- **Asteroids**: Standard dangers
- **UFOs**: 
  - Move faster than other dangers
  - Have larger/longer words
  - Higher priority targets

#### Round System
- Game progresses through rounds
- Each round increases:
  - Total number of dangers
  - Spawn rate/density
  - Difficulty

#### Damage System
- When a danger reaches Earth:
  - Explosion effect on the planet
- **Game Over Condition**: If 3 dangers reach Earth, the game ends

### Credits/Results Screen

#### Display Information
- **Survival Time**: How long players survived
- **Dangers Defeated**: Total count of destroyed enemies

#### Options
- **Play Again**: Restart the game
- **Return to Games Page**: Go back to game selection

## Technical Considerations

### Real-time Synchronization (Multiplayer)
- Danger spawning and movement synchronized across all players
- Word typing validation and missile firing
- Damage tracking (explosions, hit count)
- Round progression

### Game Mechanics
- Spawn system with increasing difficulty
- Movement physics for dangers (speed, direction toward Earth)
- Collision detection (danger reaching Earth)
- Word generation/assignment to dangers
- Priority system for faster/more dangerous enemies

### Visual Effects
- Missile firing animation from Earth
- Explosion effects on Earth
- Danger destruction animations
- Round transition effects
