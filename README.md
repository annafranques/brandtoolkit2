# Brand Toolkit

A Node.js application for managing and displaying brand assets following the DIRTT Brand System structure.

## Features

- **Complete Brand System Structure**: 
  - ESSENCE: Purpose, Design Principles, Tone of Voice
  - EXPLANATION: Logo, Typography, Color, Graphic Language, Art Direction, Motion
  - EXPRESSION: Design Examples, Messaging, Resources, Glossary
- **Brand Name Customization**: Changeable brand name throughout the system
- **Left Sidebar Navigation**: Fixed navigation with smooth scrolling
- **Admin Panel**: Comprehensive interface for editing all brand content
- **Public Display**: DIRTT-inspired design with black sidebar and colored main content
- **File-based Storage**: JSON file storage (simple and reliable)

## Structure

```
brand-toolkit/
├── server.js          # Express server and API routes
├── package.json       # Dependencies and scripts
├── data/             # Data directory (created automatically)
│   └── content.json  # Brand content storage
└── public/           # Static files
    ├── index.html    # Public-facing site
    ├── admin.html    # Admin panel
    ├── app.js        # Public site JavaScript
    ├── admin.js      # Admin panel JavaScript
    ├── styles.css    # Public site styles
    └── admin.css     # Admin panel styles
```

## API Endpoints

- `GET /api/content` - Get all brand content
- `PUT /api/content` - Update all brand content
- `PATCH /api/content/:section` - Update specific section
- `POST /api/assets` - Upload new asset
- `DELETE /api/assets/:id` - Delete asset
- `GET /api/health` - Health check

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Access the application:
- Public site: http://localhost:3000
- Admin panel: http://localhost:3000/admin

## Deployment

The application is ready for deployment to Hostinger's Node.js hosting. The build process will run automatically on the server.

## Notes

- Content is stored in `data/content.json`
- Images are stored as base64 encoded strings
- The `data/` directory is created automatically
- Make sure the server has write permissions to the `data/` directory


