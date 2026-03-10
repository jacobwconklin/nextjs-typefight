This game will use the same 10x10 grid and player icons and style used in TypeFlight. Players will spawn in around the outside layer onto separate cells. This game will be played in a series of turns. Each turn will be two phases the typing phase and the watching phase. When a turn starts, the player will be able to type words to do each of the following movements and actions. Each action is performed just like the movements in typeflight by typing a random word into a input field on the sidebar on the left of the screen. 

Movements:
- Move up one square
- Move left one square
- Move right one square
- Move down one square
- Wait -> Player does not move at all
the board does not loop, so you cannot move off of the edge in any direction. You can move into another square occupied by another player.

Actions:
- Punch
- Kick
- Block 
Each action must be followed by a movement command. This will be the direction that the action is performed in. Then the player must make at least one movement or "wait" before they can perform another action. 
I will explain what squares are affected by each action later. For now punch and block can both affect the square that the user is standing on, and kick will affect the square in front of the player in the direction typed by them after the action word. 

The typing phase will go on for 20 seconds. Players will see only their own movements and actions. All of their movements and actions will be saved in an array. This will be sent to the backend, and then the backend will broadcast out the movements of all players. The starting player will go back to where they were before the typing phase, and then the watching phase will play out the actions of all players simultaneously. Each movement or action will take 1 second to play out and most appear to occur as in sync as possible so players can try to predict what other players will do on the same second of the turn. Therefore a player who typed quickly will keep performing actions and movements after the other players' arrays have been exhausted. A player who is kicked or punched without blocking will be eliminated and no longer able to play. Players that kick or punch each other at the same time are both eliminated. This will continue until one player is left as the winner or the remaining players finish each other off at the same time resulting in a draw. 

After each watch phase, any players positioned on the outermost ring of the grid will be moved inward one ring. Then the outermost ring will be blacked out and removed from play and no longer accessible to players. This will continue until there is only a 3x3 grid remaining at which point the encroaching will stop. The game always starts with a 10x10 grid. 


## Typekwando Implementation Plan

- [x] Define shared game data model (grid bounds, player state, action queue entry shape, turn phase enums, elimination flags, ring depth).
- [x] Scaffold backend Typekwando controller and state manager in `websocket-tf-be` with per-session game lifecycle hooks.
- [x] Implement player spawn logic on unique outer-ring cells for a 10x10 board.
- [x] Add typing-phase start/stop orchestration (20-second timer, per-player input acceptance window, phase broadcast events).
- [x] Implement command parser/validator for movement (`up`, `left`, `right`, `down`, `wait`) and action commands (`punch`, `kick`, `block` + required direction).
- [x] Enforce action cadence rule (after any action, require at least one movement or `wait` before next action).
- [x] Store each player’s typed command sequence for the turn without revealing others during typing phase.
- [x] Reset all players to pre-typing positions before watch-phase playback begins.
- [x] Implement watch-phase playback engine that resolves one queued command per second, synchronizing all players as closely as possible.
- [x] Implement simultaneous resolution rules for combat outcomes (including mutual elimination when attacks land on the same second).
- [x] Apply block interaction logic so blocked attacks do not eliminate the defender.
- [x] Mark eliminated players, remove them from future command resolution, and broadcast elimination updates.
- [x] Implement end-of-turn ring encroachment: shift players inward from outer ring, blackout removed ring, clamp playable area.
- [ ] Stop encroachment once the active board reaches 3x3.
- [x] Add win/draw detection after each watch phase (single survivor = winner, zero survivors = draw) and publish match result event.
- [x] Build frontend Typekwando game page UI using TypeFlight board style, player icons, and sidebar typing input flow.
- [x] Implement local typing-phase UX: own-command preview, timer display, validation feedback, and locked input after timeout.
- [x] Implement watch-phase frontend replay animation (1-second ticks, synchronized movement/action rendering, elimination effects, ring blackout updates).
- [x] Integrate websocket event contract between frontend and backend for phase transitions, command submission, playback frames, and result states.
- [ ] Add reconnection/disconnect handling for mid-turn players and session cleanup on match end.
- [ ] Add focused tests for parser rules, action cadence constraints, simultaneous combat resolution, ring encroachment, and endgame conditions.
- [ ] Run end-to-end multiplayer test passes (2+ players) and tune timing synchronization for stable cross-client playback.

## Progress Log

- [x] Added Typekwando game-over screen modeled after TypeFlight, including one stats table with each player’s total words typed and elimination order.
- [x] Added backend tracking for cumulative words typed per player and elimination order, and included both in the `typekwando-game-over` websocket payload.


