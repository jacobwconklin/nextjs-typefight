# QuickKeys - Game Plan

## Game Overview

**QuickKeys** is a speed typing competition where players race to type through a wall of text as fast as possible.

## Game Flow

### 1. Text Selection Screen
- **Access**: Host (multiplayer) or solo player can select text
- **Display**: List of available texts
- **Text Information**: Each text shows:
  - Name/title
  - Length
- **Actions**:
  - Select a text to start the game
  - Host can exit back to game selection page

### 2. Typing Screen

#### Visual Layout
- **Text Display Area** (top of page):
  - Large block spanning width of screen
  - Only 5 lines visible at a time
  - Auto-scrolls up when top line is completed (typed lines become invisible)
  - Already typed letters are grayed out
  - Current letter to type is bold
  - Text below 5 visible lines is cut off

#### Typing Mechanics
- **Correct Letter**: 
  - Letter becomes grayed out after being typed
  - Progress continues to next character
- **Incorrect Letter**:
  - Text block border glows red and shakes slightly
  - Player must type the correct letter to progress (no backspace)
  - Error count increments

#### Progress Tracking
- **Progress Bar** (below text):
  - Horizontal line showing all players' progress
  - Each player's icon positioned at: `(playerIndex / totalWordCount) * lineWidth`
  - All players start at far left (index 0)
  - Icon z-index ordering:
    1. Local player's icon always on top
    2. Other players ordered by progress (furthest ahead on top)
  - Real-time position updates on each word completion

#### Game End Condition
- All players must finish typing the entire text
- Players remain on screen until everyone completes

### 3. Results Screen

#### Display Information
- **Player Rankings**: Listed in order of finish time (fastest first)
- **Statistics per Player**:
  - Total time to complete the text
  - Words per minute (WPM) rate

#### Host Options
- **Play Again**: Select a new text and restart
- **Select New Game**: Return to games selection page

## Technical Considerations

### Session State Structure

The QuickKeys game state object contains:

```typescript
{
  finished: boolean,           // Determines if game is over
  textName: string | null,     // Which text was selected (null = show text select)
  playerPositions: {           // Each player's progress
    [playerId]: {
      index: number,           // Number of words completed
      time: number | null,     // Duration to finish (null until complete)
      errors: number           // Number of mistakes made
    }
  }
}
```

**View Routing Logic:**
- No textName → Text selection view
- textName + not finished → Game view (typing screen)
- textName + finished → Game over view (results)

**Update Events:**
- `text-selected`: When host/solo selects a text
- `word-completed`: On each word typed (updates index and errors)
- `text-completed`: When player finishes entire text (sets time and errors)

### Text Management
- Text library/database needed
- Text metadata (name, length, content)
- Text selection UI

### Real-time Synchronization (Multiplayer)
- Progress updates for all players
- Finish time tracking
- Results calculation and display

### Typing Validation
- Character-by-character validation
- Error detection and feedback
- Progress calculation
- WPM calculation formula: (characters typed / 5) / time in minutes
