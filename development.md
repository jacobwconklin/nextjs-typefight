# Development Guidelines

## Frameworks & Technologies

### Core Stack
- **Framework**: Next.js with App Router
- **Language**: TypeScript
- **Styling**: SCSS (Sass)
- **Database**: DynamoDB (via AWS)
- **Hosting**: AWS

### TypeScript Standards
- **Avoid `any` type**: Use proper typing as much as possible
- Define interfaces and types for all data structures
- Leverage TypeScript's type system for safety and developer experience

## Architecture & Data Flow

### Server-Side Components
- Server-side components directly interact with the database
- Database is the single source of truth for:
  - Game logic
  - Player status
  - Team status

### Database Abstraction
- **DB-Agnostic Design**: All server-side logic must be database-agnostic
- **Separate DB Interface Layer**: 
  - Server-side scripts specifically interface with DynamoDB
  - Allows future swapping to MongoDB or other databases
  - Keep business logic separate from database implementation

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
- Server-side components for database interactions
- DB-agnostic business logic
- Reusable SCSS styles
- Consistent naming conventions

### Code Organization
- Separate database interface layer from business logic
- Keep game-specific logic modular
- Server components as primary data access layer

## Testing Requirements

### Unit Testing
- **Required**: Unit tests must be generated for each utility function created
- **Required**: Unit tests must be generated for each server function created
- **Focus Areas**:
  - Utility functions
  - Server-side functions
  - Business logic
  - Database interface layer

### Frontend/UI Testing
- **Not Required**: UI and frontend testing is not a priority at this time
- Focus development effort on functionality over frontend test coverage

## Performance Considerations

### Database Contact Strategy
- **Primary Concern**: Frequency of database contact during games
- **Balance Required**: 
  - Reduce database strain (minimize requests)
  - Keep player lag down (maintain responsiveness)

### Approaches to Consider
- **Polling**: Regular interval checks for game state updates
  - Pros: Simple implementation
  - Cons: Can create high DB load with many players
- **Key-Time Requests**: Contact database only at critical moments
  - Pros: Reduces DB strain significantly
  - Cons: May introduce perceived lag if not timed well
- **Hybrid Approach**: Combine polling at lower frequency with event-driven updates at key moments

### Optimization Guidelines
- Minimize database reads during active gameplay
- Batch updates when possible
- Use client-side state for non-critical updates
- Only sync critical game state changes to database
- Consider caching strategies for frequently accessed data

## Deployment

- **Hosting**: AWS
- **Database**: DynamoDB on AWS
- Ensure all AWS-specific configurations are properly set up
