# Telegram Image Gallery

A web application that allows you to view and manage images from your Telegram saved messages. Built with React, TypeScript, and Node.js, using Telegram's MTProto protocol for secure authentication.

## Features

- 🔐 Secure authentication with Telegram
- 📱 Two-factor authentication (2FA) support
- 🖼️ View saved images from Telegram
- 🔄 Real-time updates and refresh
- 💫 Responsive design

## Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher)
- Bun package manager
- Telegram API credentials (api_id and api_hash)

## Project Structure
📁 telegram-gallery/
├── 📁 packages/
│   ├── 📁 client/                 # Frontend React application
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/     # Reusable UI components
│   │   │   │   ├── 📁 ui/        # Basic UI components
│   │   │   │   └── 📁 features/  # Feature-specific components
│   │   │   ├── 📁 pages/         # Page components
│   │   │   ├── 📁 hooks/         # Custom React hooks
│   │   │   ├── 📁 utils/         # Utility functions
│   │   │   ├── 📁 types/         # TypeScript type definitions
│   │   │   ├── 📁 styles/        # Global styles and themes
│   │   │   └── 📁 config/        # Frontend configuration
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── 📁 server/                # Backend Express server
│       ├── 📁 src/
│       │   ├── 📁 controllers/   # Request handlers
│       │   ├── 📁 services/      # Business logic
│       │   ├── 📁 middleware/    # Express middleware
│       │   ├── 📁 types/         # TypeScript type definitions
│       │   └── 📁 utils/         # Utility functions
│       ├── 📁 storage/
│       │   └── 📁 sessions/      # Telegram session storage
│       ├── .env.example
│       └── package.json
│
├── 📁 shared/                    # Shared code between packages
│   ├── 📁 types/                 # Shared TypeScript types
│   └── 📁 utils/                 # Shared utilities
│
├── .gitignore                    # Git ignore file
├── .env.example                  # Root environment variables
├── package.json                  # Root package.json for workspaces
├── README.md                     # Project documentation
└── tsconfig.json                # Base TypeScript configuration

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/telegram-gallery.git
cd telegram-gallery
2. Obtain Telegram API Credentials

Visit https://my.telegram.org/apps
Log in with your phone number
Create a new application
Note down your api_id and api_hash

3. Backend Setup
bashCopycd server
bun install

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start the server
bun --hot index.ts
4. Frontend Setup
bashCopycd client
bun install
bun dev
The application will be available at http://localhost:5173
Environment Variables
Backend (.env)
envCopyAPI_ID=your_api_id
API_HASH=your_api_hash
PORT=3000
Frontend (.env)
envCopyVITE_API_URL=http://localhost:3000
Security Considerations

Never commit .env files to version control
Store API credentials securely
The application stores session data locally in the sessions directory
Use HTTPS in production

Development
The project uses:
- React with TypeScript for the frontend
- Express with Bun for the backend
- MTProto for Telegram API interaction
- shadcn/ui for components

Authentication Flow
- Phone number verification
- SMS code verification
- Two-factor authentication (if enabled)
- Session management
- Secure message fetching

Contributing
- Fork the repository
- Create your feature branch (git checkout -b feature/AmazingFeature)
- Commit your changes (git commit -m 'Add some AmazingFeature')
- Push to the branch (git push origin feature/AmazingFeature)
- Open a Pull Request

### License
This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgments
- MTProto - Telegram's secure protocol
- shadcn/ui - UI components
- Telegram API - Official Telegram API documentation

### Support
If you encounter any issues or have questions, please file an issue on the GitHub repository.