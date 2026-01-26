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
  - Shows text with current line underlined
  - Only 5 lines visible at a time
  - Current line positioned at the very top
  - Auto-scrolls up after each line is completed

#### Typing Mechanics
- **Correct Letter**: 
  - Changes from white to player's selected color
  - Letter becomes grayed out after being typed
- **Incorrect Letter**:
  - Text shakes
  - Error message appears below the text
  - Player must type the correct letter to progress (no backspace required)

#### Progress Tracking
- **Progress Bar** (below text):
  - Shows all players' progress through the text
  - Each player's icon displayed on the bar
  - Real-time position updates

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
