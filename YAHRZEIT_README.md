# Yahrzeit Shiur Live Stream

This feature enables live streaming for Yahrzeit commemoration shiurs using Daily.co video infrastructure.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your Daily.co settings:

```bash
cp .env.example .env
```

Update the following variables in your `.env` file:
```
# Daily.co Video Streaming
DAILY_API_KEY=your-daily-api-key
DAILY_ROOM_URL=https://your-team.daily.co/yahrzeit-shiur
```

### 3. Daily.co Setup
1. Create a Daily.co account at https://daily.co
2. Create a new room for the yahrzeit shiur
3. Get your API key from the Daily.co dashboard
4. Update the environment variables with your credentials

### 4. Development
Start the development server:
```bash
npm run dev
```

Visit `http://localhost:4321/yahrzeit` to test the live stream page.

### 5. Production Deployment
The application is configured for Netlify deployment. The environment variables will need to be set in your Netlify dashboard:

1. Go to your Netlify site settings
2. Add the following environment variables:
   - `DAILY_API_KEY`
   - `DAILY_ROOM_URL`
3. Deploy the site

## Features

- **Live Video Streaming**: High-quality video and audio streaming
- **Interactive Chat**: Participants can ask questions and engage
- **Screen Sharing**: Presenters can share their screen
- **Participant Management**: See who's in the stream
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic theme detection

## Usage

### For Presenters
1. Navigate to `/yahrzeit` when the shiur is scheduled
2. Click "Join Stream" to enter the video call
3. Enable camera and microphone when ready
4. Use screen sharing for presenting materials
5. Monitor chat for questions and comments

### For Participants
1. Visit `/yahrzeit` at the scheduled time
2. Join the stream with or without video
3. Use chat to ask questions
4. Participate in the discussion

## Technical Implementation

- **Frontend**: Astro with React components
- **Video SDK**: Daily.co JavaScript SDK
- **Styling**: Tailwind CSS with dark mode support
- **Deployment**: Netlify with environment variable support

## Security Considerations

- Daily.co room URLs should be kept private
- API keys are stored in environment variables
- Room access can be controlled via Daily.co dashboard settings
- Consider enabling waiting room for moderated access

## Troubleshooting

### Common Issues

1. **Video not loading**: Check Daily.co room URL and API key
2. **Audio not working**: Ensure browser permissions are granted
3. **Screen sharing fails**: Some browsers restrict screen sharing on HTTP
4. **Chat not working**: Verify Daily.co app message configuration

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

## Future Enhancements

- Recording functionality
- Breakout rooms for smaller discussions
- Q&A moderation system
- Calendar integration for scheduling
- Multi-language support
