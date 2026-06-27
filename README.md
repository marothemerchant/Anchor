# Anchor Agent

**Natural Language Browser Automation with AI**

Anchor Agent is a terminal-style application that lets you automate web tasks using plain English. Describe what you want to accomplish, and Anchor handles the browser automation—no coding required.

> **Example:** "Navigate to github.com and find the trending repositories" → Anchor Agent uses your chosen AI model to interact with the Anchor Browser API and completes the task.

---

## Features

✨ **Multi-AI Provider Support**
- OpenAI (GPT-4, GPT-4o)
- Google Gemini
- Groq (ultra-fast, open models)
- Anchor AI (optimized for browser automation)

🌐 **Anchor Browser Integration**
- Control browsers programmatically via REST API
- No code needed—describe tasks in plain English
- Multi-step workflow support with session persistence
- Screenshot capture, element detection, form filling

⚡ **Real-Time Streaming**
- Stream responses as they're generated
- See progress in real-time with status indicators
- Precise timing metrics for each task

🔧 **Developer-Friendly**
- Type-safe (TypeScript)
- Clean terminal UI (zero distractions)
- API key validation with live status feedback
- Customizable system prompts and temperature

---

## Quick Start

### Prerequisites

- Node.js 18+ or use Replit
- API keys for at least one provider:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Google Gemini API Key](https://aistudio.google.com/app/apikey)
  - [Groq API Key](https://console.groq.com/keys)
  - [Anchor Browser API Key](https://anchorbrowser.io)

### Installation

1. **Clone or open in Replit:**
   ```bash
   git clone https://github.com/marothemerchant/Anchor.git
   cd Anchor
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start the dev server:**
   ```bash
   cd artifacts/anchor-agent
   pnpm dev
   ```

4. **Open in your browser:**
   - Visit `http://localhost:5173` (or the URL shown in terminal)

---

## Usage

### 1. Add Your API Key

Click the **⚙️ Settings** button (top right) and paste your API key for your chosen provider:

- **OpenAI Key:** Starts with `sk-`
- **Gemini Key:** Starts with `AIza`
- **Groq Key:** Starts with `gsk_`
- **Anchor Key:** Your Anchor Browser API token

The status indicator will show:
- `OK` — Key is valid ✓
- `FAIL` — Key is invalid ✗
- `...` — Currently checking
- `——` — Not yet tested

### 2. Select Your AI Model

Use the dropdown in the header to choose your model. The app automatically uses the matching API key.

### 3. Describe Your Task

Type a natural language task in the command input at the bottom:

```
Navigate to google.com and search for "Anchor Browser API documentation"
```

Press **Enter** or click **RUN** to execute.

### 4. Watch It Happen

- The AI agent translates your task into browser actions
- Anchor Browser executes those actions
- Results stream back to your terminal in real-time

---

## Example Tasks

```
# Simple queries
"What is the title of amazon.com?"
"Get the current Bitcoin price from coinmarketcap.com"

# Form submission
"Go to github.com/login and enter username 'test' and password 'demo'"

# Scraping
"Visit news.ycombinator.com and get the top 5 story titles"

# Multi-step workflows
"Open google.com, search for 'weather New York', and tell me the temperature"
```

---

## How It Works

```
┌─────────────────────┐
│  Natural Language   │
│   "Search Google"   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   AI Model (LLM)    │
│  Interprets intent  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Anchor Browser API  │
│  Executes actions   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Web Browser       │
│  Navigates & clicks │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Your Terminal     │
│  Shows results      │
└─────────────────────┘
```

### Behind the Scenes

1. **You** describe a task in plain English
2. **LLM** understands the intent and generates a browser action
3. **Anchor API** executes that action in a real browser
4. **Response** is parsed and displayed in your terminal

---

## Settings

### System Prompt

Customize how the AI approaches tasks. Default:

```
You are ANCHOR AGENT, a precise terminal AI. Be concise and direct.
```

Example custom prompt:

```
You are a web automation expert. Always verify actions succeeded before reporting. 
Be verbose about what you're doing. Use proper formatting.
```

### Temperature

Controls AI creativity:
- **0.0** — Deterministic, focused
- **0.7** — Balanced (default)
- **2.0** — Creative, exploratory

Lower = more predictable. Higher = more varied responses.

---

## Troubleshooting

### "NO KEY" Error

**Problem:** You haven't added an API key yet.

**Solution:** 
1. Click Settings (⚙️)
2. Paste your API key
3. Click TEST to validate

### "FAIL" Status

**Problem:** Your API key is invalid or expired.

**Solution:**
1. Double-check the key (copy-paste from the provider's website)
2. Ensure it hasn't expired
3. Generate a new key if needed
4. Click TEST again

### CORS Error in Console

**Problem:** Browser blocks requests to Anchor API directly.

**Solution:** This is expected for browser-based apps. The app includes error recovery. If you see network errors:
1. Check your internet connection
2. Verify your API key is correct
3. Try the task again (retry logic is built in)

### Task Fails or Returns Confusing Output

**Problem:** The AI generated an incorrect action.

**Solution:**
1. Rephrase your task more specifically
2. Try a simpler task first
3. Check the system prompt (maybe customize it)
4. Try a different AI model
5. Check Anchor Browser API docs: https://docs.anchorbrowser.io

---

## Advanced Features

### Multi-Step Workflows

Sessions persist across tasks, so you can chain actions:

```
Task 1: "Navigate to github.com"
Task 2: "Search for 'Anchor Browser'"
Task 3: "Click on the first result"
```

Each task uses the same browser session, maintaining state.

### Switching Providers Mid-Conversation

You can change AI models between tasks without clearing history. This is useful for:
- Using Groq for speed, then OpenAI for complexity
- Testing different models
- Cost optimization

### Custom System Prompts

Tailor the AI's behavior by editing the system prompt in Settings. Examples:

**For data extraction:**
```
Extract structured data as JSON. Include only verified information.
```

**For testing:**
```
Try to break the website. Report all errors and edge cases found.
```

---

## Architecture

```
artifacts/anchor-agent/
├── src/
│   ├── components/
│   │   ├── CommandInput.tsx      # Task input field
│   │   ├── ConversationThread.tsx # Message display
│   │   ├── ModelSelector.tsx      # Provider dropdown
│   │   └── SettingsPanel.tsx      # Configuration panel
│   ├── hooks/
│   │   └── useAnchorAgent.ts      # Core logic (API calls, streaming)
│   ├── pages/
│   │   └── terminal.tsx           # Main layout
│   ├── App.tsx                    # App container
│   └── main.tsx                   # Entry point
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

### Key Files

- **`useAnchorAgent.ts`**: Core hook handling:
  - Multi-provider API integration (OpenAI, Gemini, Groq, Anchor)
  - Streaming responses
  - Session persistence
  - API key validation

- **`SettingsPanel.tsx`**: API key management and configuration

- **`ConversationThread.tsx`**: Message display with status indicators

---

## Environment Variables

Optionally pre-populate API keys via environment variables:

```bash
VITE_OPENAI_API_KEY=sk-...
VITE_GEMINI_API_KEY=AIza...
VITE_GROQ_API_KEY=gsk_...
VITE_ANCHOR_API_KEY=anchor_...
```

---

## Contributing

We welcome contributions! To get started:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Areas for Contribution

- [ ] Task history/saved workflows
- [ ] Screenshot preview in UI
- [ ] Element detection visualization
- [ ] Performance metrics dashboard
- [ ] Task templates/examples
- [ ] Error recovery improvements
- [ ] Documentation

---

## Roadmap

- ✅ Multi-AI provider support
- ✅ Session persistence
- ✅ Real-time streaming
- 🚧 Task history & replay
- 🚧 Performance dashboard
- 🚧 Webhook triggers
- 🚧 Batch task execution
- 🚧 Mobile app

---

## API Reference

### Supported Anchor Browser Actions

Anchor Agent abstracts these via natural language. Examples:

- **Navigation:** "Go to", "Visit", "Open"
- **Interaction:** "Click", "Type", "Fill form"
- **Extraction:** "Get", "Read", "Extract"
- **Screenshots:** "Take screenshot", "Show page"
- **Waiting:** "Wait for", "Wait until"

For full Anchor Browser API docs: https://docs.anchorbrowser.io

---

## Pricing

**Anchor Agent itself:** Free and open-source

**API Costs** (you pay for):
- OpenAI API: ~$0.01-0.15 per task (depending on model)
- Google Gemini: Free tier available
- Groq: Free tier available  
- Anchor Browser: [Check pricing](https://anchorbrowser.io/pricing)

---

## Security

- ⚠️ **Never commit API keys** to git
- ✅ Use environment variables for production
- ✅ Anchor Agent doesn't store keys permanently (session-based)
- ✅ All API calls use HTTPS

---

## Support

- 📖 [Anchor Browser Docs](https://docs.anchorbrowser.io)
- 💬 Open an issue on GitHub
- 🐦 Reach out on [Twitter](https://twitter.com)

---

## License

MIT — Feel free to use, modify, and distribute.

---

## Acknowledgments

Built with:
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [TailwindCSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev)
- [Anchor Browser API](https://anchorbrowser.io)

---

**Made with ❤️ by [marothemerchant](https://github.com/marothemerchant)**

*Turn your ideas into browser automation.*
