# Development Guidelines

## Frameworks & Technologies

### Core Stack
- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Styling**: SCSS (Sass)
- **Backend**: WebSocket-based backend server (stateful) — holds authoritative game state and communicates with clients over WebSocket.
- **Hosting**: AWS

### TypeScript Standards
- **Avoid `any` type**: Use proper typing as much as possible
- Define interfaces and types for all data structures
- Leverage TypeScript's type system for safety and developer experience

## Architecture & Data Flow

### Server-Side Components
- A separate backend WebSocket server holds authoritative game state and game logic
- The backend server is the single source of truth for:
  - Game logic
  - Player status
  - Team status

### Backend & Protocol Abstraction
- **Protocol-Agnostic Design**: Design server and client to communicate via a clear message/event interface
- **Separate Transport Layer**: 
  - Server-side scripts handle WebSocket message routing and state management
  - Allows future swapping or scaling of backend transport without changing business logic
  - Keep business logic separate from transport/serialization implementation

### Client vs Server Logic
- Game-specific logic distribution (client vs server vs database) will be defined per game
- Each game plan will specify what logic stays client-side vs server-side

## Styling & Design System

### SCSS Approach
- **No Tailwind**: Do not use Tailwind CSS
- **Global SCSS Rules**: Define global styles and reuse as much as possible
- **Consistency**: Prioritize reusable styles for consistency across the application

### Design Philosophy
- **Progressive Enhancement**: 
  1. First: Make it exist (functionality first)
  2. Then: Make it look good (iterate on design)
- **Style Iteration**: Designs will be refined as we build

### Visual Style
- **Art Direction**: Gamey and beginner-friendly feel
- **Asset Style**: 
  - Use clipart and SVGs
  - Not very high resolution
  - Friendly, approachable aesthetic

## Reusable Assets

### Player Icons
- User will provide player icon assets
- Store and reference consistently across the application

### Other Images
- Obtain or generate as needed
- Follow the clipart/SVG, low-resolution style guide
- Maintain consistent visual language

## Project Structure

*To be defined as project develops*

## Coding Standards

### General Principles
- TypeScript strict typing (avoid `any`)
- Server-side components for backend state and WebSocket interactions
- Backend-agnostic business logic
- Reusable SCSS styles
- Consistent naming conventions

### Code Organization
- Separate transport/interface layer (WebSocket message handling) from business logic
- Keep game-specific logic modular
- Server components as the authoritative state and logic layer

## Testing Requirements

### Unit Testing
- **Required**: Unit tests must be generated for each utility function created
- **Required**: Unit tests must be generated for each server function created
- **Focus Areas**:
  - Utility functions
  - Server-side functions
  - Business logic
  - Backend interface layer (WebSocket message handling)

### Frontend/UI Testing
- **Not Required**: UI and frontend testing is not a priority at this time
- Focus development effort on functionality over frontend test coverage

## Performance Considerations

### Real-time Communication Strategy
- **Primary Concern**: Efficient real-time state synchronization between clients and backend
- **Balance Required**: 
  - Reduce network roundtrips and server load
  - Keep player lag low and gameplay responsive

### Approaches to Consider
- **WebSocket Push Events**: Backend pushes state changes to connected clients
  - Pros: Low latency, efficient for many players
  - Cons: Requires a stateful backend and connection management
- **Client-Side Prediction & Local State**: Use local updates for instant feedback and reconcile with authoritative server state
- **Fallback Polling**: Use polling only as a fallback for degraded network or unsupported environments

### Optimization Guidelines
- Favor event-driven (push) updates over frequent polling
- Batch or debounce outgoing events when appropriate
- Use client-side caching and prediction for non-critical updates
- Only synchronize authoritative state changes from the backend
- Consider scaling strategies (sharding, socket clustering) for many concurrent players

## Deployment

- **Hosting**: AWS
- **Backend**: Deploy WebSocket backend server (hosted on AWS, container platform, or other provider)
- Ensure all hosting and network configurations (load balancers, WebSocket proxies, TLS) are properly set up
