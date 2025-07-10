# Inconsistency Elicitation for AI Safety Research

This project investigates inconsistency elicitation as a strategy for detecting and mitigating work sabotage risks in AI systems. The research explores whether strategic inconsistency can be leveraged to identify when models are deliberately providing misleading answers on hard-to-oversee questions.

## Research Overview

A key challenge in AI safety is consistent strategic deception: models accurately identifying hard-to-oversee questions and giving consistent misleading answers on them. This project implements a red-team blue-team experimental framework to test whether inconsistency elicitation can serve as a defense mechanism against such coordinated deception.

The study uses a held-out set of hard questions that models can answer but humans can only answer ~10% of (simulating hard-to-oversee vs. easy-to-oversee situations). Participants play one of two games:

- **Detection Game**: Participants examine AI responses across question sets and determine if the model is behaving normally or withholding information
- **Elicitation Game**: Participants chat with an AI to try to elicit correct answers to questions it might be avoiding

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

### Configuration

#### Environment Variables

- LLM API endpoints configured in `src/config/config.js`
- System prompts defined in `src/utils/systemPrompts.js`
- Model configurations for different experimental conditions

#### URL Parameters

- `game=detection|elicitation` - Force specific game type
- `demo=true` - Enable demo mode (shorter sessions)
- `sp=1|2|3|...` - System prompt variation for elicitation game
- `skip=true` - Skip landing and demographics questions for testing

### Deployment

The application is configured for Netlify deployment with:

- `netlify.toml` - Build and deployment configuration
- Static site generation support
- Environment-specific builds
- Redirect rules for SPA routing

### Data Privacy & Ethics

- **Anonymous Data Collection**: No personal identifiers collected
- **GDPR Compliance**: Proper consent mechanisms and data handling
- **Voluntary Participation**: Clear withdrawal procedures
- **Third-party Processing**: Transparent disclosure of AI service usage
- **Research Purpose**: Data retained for legitimate scientific research

## Contributing

This is an active research project and the code is unstable. For questions about the research methodology or findings, contact the research team at <research-mats@benjaminarnav.com>.
