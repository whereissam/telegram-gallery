# 📱 Telegram Image Gallery

A modern web application for viewing and managing images from your Telegram saved messages. Built with React, TypeScript, and Node.js, leveraging Telegram's MTProto protocol for secure authentication and data access.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Bun](https://img.shields.io/badge/bun-latest-orange.svg)

## ✨ Key Features

- **Secure Authentication** - Direct integration with Telegram's official authentication system
- **Enhanced Security** - Full support for Two-factor authentication (2FA)
- **Smart Gallery Management** - Intuitive interface for viewing and organizing saved images
- **Real-time Updates** - Instant synchronization with your Telegram saved messages
- **Modern Design** - Fully responsive interface that works on all devices
- **Performance Optimized** - Fast loading and efficient image handling

## 🚀 Quick Start

### Prerequisites

Before installation, ensure you have:
- Node.js (version 18 or higher)
- Bun package manager installed
- Telegram API credentials (api_id and api_hash)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/telegram-gallery.git
   cd telegram-gallery
   ```

2. **Set Up API Credentials**
   - Visit [Telegram API Development Tools](https://my.telegram.org/apps)
   - Create a new application
   - Save your `api_id` and `api_hash`

3. **Configure Backend**
   ```bash
   cd packages/server
   bun install
   cp .env.example .env
   ```
   Edit `.env` with your credentials:
   ```env
   API_ID=your_api_id
   API_HASH=your_api_hash
   PORT=3000
   ```

4. **Configure Frontend**
   ```bash
   cd ../client
   bun install
   cp .env.example .env
   ```
   Add required environment variables:
   ```env
   VITE_API_URL=http://localhost:3000
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1 - Backend
   cd packages/server
   bun --hot index.ts

   # Terminal 2 - Frontend
   cd packages/client
   bun dev
   ```

   Access the application at `http://localhost:5173`

## 📁 Project Structure

```
telegram-gallery/
├── packages/
│   ├── client/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/     # UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── hooks/         # Custom React hooks
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── server/                # Express backend
│       ├── src/
│       │   ├── controllers/   # Request handlers
│       │   ├── services/      # Business logic
│       │   └── ...
│       └── package.json
│
└── shared/                    # Shared utilities
    ├── types/
    └── utils/
```

## 🔒 Security Best Practices

- Never commit `.env` files to version control
- Store API credentials securely using environment variables
- Enable HTTPS in production environments
- Regularly update dependencies for security patches
- Implement rate limiting for API endpoints
- Use secure session storage
- Validate all user inputs

## 🛠 Development Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- shadcn/ui for component library
- TanStack Query for data fetching
- Tailwind CSS for styling

### Backend
- Express.js with TypeScript
- Bun runtime for improved performance
- MTProto for Telegram API integration
- JWT for session management
- Zod for validation

## 🔄 Authentication Flow

1. **Initial Authentication**
   - Phone number submission
   - Verification code validation
   - 2FA password (if enabled)

2. **Session Management**
   - Secure token generation
   - Automatic session refresh
   - Logout handling

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Use conventional commits format

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Telegram API](https://core.telegram.org/api) - Official Telegram API documentation
- [MTProto](https://core.telegram.org/mtproto) - Telegram's secure protocol
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Bun](https://bun.sh/) - JavaScript runtime & tooling

## 💬 Support

Need help? Here are some options:

- Create an issue in the [GitHub repository](https://github.com/yourusername/telegram-gallery/issues)
- Join our [Discord community](https://discord.gg/yourdiscord)
- Check out the [FAQ](docs/FAQ.md)

## 📈 Roadmap

- [ ] Image batch operations
- [ ] Advanced search capabilities
- [ ] Folder organization
- [ ] Image editing features
- [ ] Mobile applications
- [ ] Offline support