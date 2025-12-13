# Client Prioritisation & Email Generation System

A React-based financial adviser dashboard with rule-based client prioritisation and AI-powered email generation.

## Features

1. **Rule-Based Client Prioritisation**
   - Transparent scoring based on AUA, fees, engagement, and account complexity
   - Clients automatically sorted by priority score
   - Visual priority badges (High/Medium/Low)

2. **Client Detail View**
   - Comprehensive client information modal
   - Portfolio breakdown and engagement metrics
   - Priority score visualization with detailed breakdown

3. **AI Email Generation**
   - OpenAI-powered personalized outreach emails
   - Secure serverless function architecture
   - Context-aware based on client priority and data

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example
cp .env.example .env
```

Add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**IMPORTANT:** 
- Do NOT prefix with `REACT_APP_`
- This key is only accessed by the serverless function
- Never commit `.env` to version control

### 3. Run Locally

```bash
npm start
```

For local testing of the serverless function, you can use Vercel CLI:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Run with Vercel dev server (supports serverless functions)
vercel dev
```

### 4. Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy
vercel --prod
```

Add the `OPENAI_API_KEY` environment variable in Vercel:
1. Go to your project settings on Vercel
2. Navigate to Environment Variables
3. Add `OPENAI_API_KEY` with your API key
4. Redeploy if necessary

## Architecture

### Frontend (React)
- `src/prioritisation.js` - Rule-based scoring logic
- `src/ClientDetailModal.js` - Client detail view with email generation UI
- `src/Dashboard.js` - Main dashboard with prioritized client list

### Backend (Vercel Serverless Function)
- `api/generate-email.js` - OpenAI integration (server-side only)

### Security
- OpenAI API key is NEVER exposed to the client
- All AI calls go through the serverless function
- No client-side OpenAI SDK usage

## Priority Scoring System

Clients are scored on a 0-100 scale:

| Factor | Max Points | Weight |
|--------|-----------|--------|
| Total AUA | 50 | Highest |
| Total Fees | 25 | High |
| Engagement (12 months) | 15 | Medium |
| Account Complexity | 10 | Low |

**Tiers:**
- High: 75-100 points
- Medium: 45-74 points
- Low: 0-44 points

## Database Schema Requirements

The app expects a `client` table in Supabase with these fields:

- `id` - Unique identifier
- `name` - Client name
- `email` - Client email
- `phone` - Client phone (optional)
- `total_aua` - Total assets under advice (numeric)
- `total_fees` - Total fees paid (numeric)
- `logins_last_12_months` - Portal login count (integer)
- `meetings_last_12_months` - Meeting count (integer)
- `number_of_accounts` - Number of accounts (integer)

## Usage

1. **View Prioritised Clients**: Dashboard automatically displays clients sorted by priority score
2. **View Client Details**: Click "View Details" on any client
3. **Generate Email**: In the client detail modal, add optional context and click "Generate Email"
4. **Copy Email**: Click "Copy to Clipboard" to use the generated email

## Notes

- Uses `gpt-4o-mini` for cost-effective email generation
- No emojis in generated emails (professional tone)
- All functionality works in production on Vercel
- Compatible with existing Supabase authentication setup
