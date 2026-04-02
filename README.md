# Web Parser

Web Parser is a Next.js application that converts any public webpage into clean Markdown. It supports three parsing modes: simple HTTP fetch, auth-aware fetch with custom cookies or Playwright storage state, and interactive rendering via a headless Chromium browser for JavaScript-heavy pages. Results are stored locally and available for download.

## Local Development

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Install the Chromium browser used by Playwright:
   ```bash
   npx playwright install chromium
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Fly.io

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/

2. Launch the app (first time only):
   ```bash
   fly launch
   ```

3. Create a persistent volume for the SQLite database:
   ```bash
   fly volumes create web_parser_data --size 1
   ```

4. Deploy:
   ```bash
   fly deploy
   ```

## Example Inputs

**Simple URL:**
```
https://example.com
```

**Cookies string:**
```
session=abc123; token=xyz789; user_id=42
```

**Storage state JSON:**
```json
{
  "cookies": [{"name":"session","value":"abc123","domain":"example.com","path":"/"}],
  "origins": []
}
```
