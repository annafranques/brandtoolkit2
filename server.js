require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');
const https = require('https');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Figma API configuration
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

// Helper function to make Figma API requests
function figmaRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${FIGMA_API_BASE}${endpoint}`;
    const options = {
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(json);
          } else {
            reject(new Error(`Figma API error: ${res.statusCode} - ${json.err || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}
const DATA_DIR = path.join(__dirname, 'data');
const FONTS_DIR = path.join(__dirname, 'public', 'fonts');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');

// Storage configuration - MongoDB if MONGO_URL is set, otherwise file-based
const MONGO_URL = process.env.MONGO_URL;
const USE_MONGODB = !!MONGO_URL;
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');

// MongoDB Schema (only used if MONGO_URL is set)
let ContentModel = null;
if (USE_MONGODB) {
  const contentSchema = new mongoose.Schema({
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }, {
    timestamps: true,
    collection: 'content'
  });
  ContentModel = mongoose.model('Content', contentSchema);
}

// Storage functions - MongoDB or file-based
async function getContent() {
  if (USE_MONGODB) {
    // MongoDB storage
    try {
      let contentDoc = await ContentModel.findOne();
      
      if (!contentDoc) {
        const defaultContent = getDefaultContent();
        contentDoc = new ContentModel({ content: defaultContent });
        await contentDoc.save();
        console.log('Default content created in MongoDB');
        return defaultContent;
      }
      
      console.log('Content loaded from MongoDB');
      return contentDoc.content;
    } catch (error) {
      console.error('Error in getContent (MongoDB):', error);
      throw error;
    }
  } else {
    // File-based storage
    try {
      await fs.ensureDir(DATA_DIR);
      
      if (await fs.pathExists(CONTENT_FILE)) {
        const content = await fs.readJson(CONTENT_FILE);
        return content;
      } else {
        const defaultContent = getDefaultContent();
        await fs.writeJson(CONTENT_FILE, defaultContent, { spaces: 2 });
        try {
          fsSync.chmodSync(CONTENT_FILE, 0o644);
        } catch (permError) {
          console.warn('Could not set content.json permissions:', permError.message);
        }
        console.log('Default content.json created');
        return defaultContent;
      }
    } catch (error) {
      console.error('Error in getContent (file-based):', error);
      throw error;
    }
  }
}

async function saveContent(content) {
  if (USE_MONGODB) {
    // MongoDB storage
    try {
      let contentDoc = await ContentModel.findOne();
      
      if (!contentDoc) {
        contentDoc = new ContentModel({ content: content });
      } else {
        contentDoc.content = content;
      }
      
      await contentDoc.save();
      console.log('Content saved successfully to MongoDB');
    } catch (error) {
      console.error('Error saving content (MongoDB):', error);
      throw error;
    }
  } else {
    // File-based storage
    try {
      await fs.ensureDir(DATA_DIR);
      
      try {
        fsSync.chmodSync(DATA_DIR, 0o755);
      } catch (dirError) {
        console.warn('Could not set data directory permissions:', dirError.message);
      }
      
      await fs.writeJson(CONTENT_FILE, content, { spaces: 2 });
      
      try {
        fsSync.chmodSync(CONTENT_FILE, 0o644);
      } catch (permError) {
        console.warn('Could not set content.json permissions:', permError.message);
      }
      
      console.log('Content saved successfully to content.json');
    } catch (error) {
      console.error('Error saving content (file-based):', error);
      throw error;
    }
  }
}

// Ensure data directory exists at startup (for auth.json and other files)
try {
  fs.ensureDirSync(DATA_DIR);
  console.log('Data directory created/verified at startup:', DATA_DIR);
} catch (error) {
  console.error('Error ensuring data directory at startup:', error);
}

// Connect to MongoDB if MONGO_URL is set, otherwise use file-based storage
if (USE_MONGODB) {
  console.log('Attempting to connect to MongoDB...');
  mongoose.connect(MONGO_URL).then(() => {
    console.log('✅ Connected to MongoDB successfully');
    console.log('Database:', mongoose.connection.db.databaseName);
  }).catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Please check MONGO_URL is correctly set');
    process.exit(1);
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
  });
} else {
  console.log('✅ Using file-based storage (data/content.json)');
  console.log('💡 To use MongoDB, set MONGO_URL environment variable');
}

// Ensure fonts directory exists
fs.ensureDirSync(FONTS_DIR);

// Configure multer for font file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FONTS_DIR);
  },
  filename: function (req, file, cb) {
    // Keep original filename
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept font files
    const allowedMimes = [
      'font/otf',
      'font/ttf',
      'application/x-font-ttf',
      'application/x-font-opentype',
      'application/vnd.ms-fontobject',
      'font/woff',
      'font/woff2'
    ];
    const allowedExts = ['.otf', '.ttf', '.woff', '.woff2', '.eot'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only font files (OTF, TTF, WOFF, WOFF2) are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware
app.use(cors());
// Increase limit to 50MB to handle large base64-encoded images (base64 adds ~33% overhead)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'brand-toolkit-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

// Initialize auth file with default password if it doesn't exist
async function initializeAuth() {
  if (!await fs.pathExists(AUTH_FILE)) {
    const defaultPassword = await bcrypt.hash('anna', 10);
    await fs.writeJson(AUTH_FILE, {
      passwordHash: defaultPassword,
      createdAt: new Date().toISOString()
    }, { spaces: 2 });
    console.log('Default admin password created: anna');
  }
}

// Initialize auth on startup
initializeAuth();

// Authentication routes - MUST be before static middleware
app.post('/api/auth/login', async (req, res) => {
  console.log('Login endpoint hit', req.body);
  try {
    const { password } = req.body;
    
    if (!password) {
      console.log('No password provided');
      return res.status(400).json({ error: 'Password required' });
    }
    
    if (!await fs.pathExists(AUTH_FILE)) {
      await initializeAuth();
    }
    
    const authData = await fs.readJson(AUTH_FILE);
    const passwordMatch = await bcrypt.compare(password, authData.passwordHash);
    
    if (!passwordMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    req.session.authenticated = true;
    console.log('Login successful');
    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

// Get typography configuration (public - frontend preview needs this) - MUST be before static middleware
app.get('/api/typography', async (req, res) => {
  try {
    let content;
    try {
      content = await getContent();
    } catch (readError) {
      console.error('Error reading content:', readError);
      // If content is corrupted, return empty structure
      return res.json({
        fonts: [],
        typography: {}
      });
    }
    
    // Ensure content is an object
    if (!content || typeof content !== 'object') {
      content = {};
    }
    
    // Initialize fonts and typographyStyles if they don't exist
    let needsUpdate = false;
    if (!content.fonts || !Array.isArray(content.fonts)) {
      content.fonts = [];
      needsUpdate = true;
    }
    if (!content.typographyStyles || typeof content.typographyStyles !== 'object') {
      content.typographyStyles = {};
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      try {
        await saveContent(content);
      } catch (writeError) {
        console.error('Error saving content:', writeError);
        // Continue anyway - we'll return the initialized structure
      }
    }
    
    res.json({
      fonts: content.fonts || [],
      typography: content.typographyStyles || {}
    });
  } catch (error) {
    console.error('Error getting typography:', error);
    // Return empty structure instead of 500 error
    res.json({
      fonts: [],
      typography: {}
    });
  }
});

// Serve static files from public directory (after API routes to ensure they take precedence)
// Add cache control headers to prevent stale JavaScript files
app.use(express.static('public', {
  setHeaders: (res, path) => {
    // Force no cache for all static files to prevent caching issues
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    // Set proper Content-Type for SVG files
    if (path.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));
app.use('/fonts', express.static('public/fonts'));

// Change password endpoint removed - authentication completely disabled

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes

// Get all content (public - frontend needs this)
app.get('/api/content', async (req, res) => {
  try {
    const content = await getContent();
    const defaultContent = getDefaultContent();
    let needsUpdate = false;
    
    // Migrate old color structure to new array format
    if (content.colors && !Array.isArray(content.colors) && typeof content.colors === 'object') {
      const oldColors = content.colors;
      content.colors = [];
      if (oldColors.primary) {
        content.colors.push({ name: 'primary', hex: oldColors.primary, type: 'primary' });
      }
      if (oldColors.secondary) {
        content.colors.push({ name: 'secondary', hex: oldColors.secondary, type: 'secondary' });
      }
      if (oldColors.accent) {
        content.colors.push({ name: 'accent', hex: oldColors.accent, type: 'secondary' });
      }
      needsUpdate = true;
    }
    
    // Initialize empty sections with default content structure
    // Helper to check if an object is empty or has no meaningful content
    function isEmptySection(section) {
      if (!section || typeof section !== 'object') return true;
      // Arrays are never "empty" in this context - they're valid data structures
      if (Array.isArray(section)) return false;
      if (Object.keys(section).length === 0) return true;
      // Check if all values are empty strings
      return Object.values(section).every(val => {
        if (typeof val === 'object' && val !== null) {
          return isEmptySection(val);
        }
        return val === '' || val === null || val === undefined;
      });
    }
    
    // Initialize logotype if empty - ensure it uses new structure with subsections array
    if (isEmptySection(content.logotype)) {
      content.logotype = {
        mainLogo: '',
        subsections: []
      };
      needsUpdate = true;
    } else if (!content.logotype.subsections || !Array.isArray(content.logotype.subsections)) {
      // Migrate old logotype structure to new structure with subsections array
      const oldLogotype = content.logotype;
      content.logotype = {
        mainLogo: oldLogotype.mainLogo || '',
        subsections: []
      };
      
      // Convert old structure fields to subsections if they exist
      const oldFields = [
        { key: 'main.positive', title: 'Main (Positive)', content: oldLogotype.main?.positive?.content || '', image: oldLogotype.main?.positive?.image || '' },
        { key: 'main.negative', title: 'Main (Negative)', content: oldLogotype.main?.negative?.content || '', image: oldLogotype.main?.negative?.image || '' },
        { key: 'iconotype', title: 'Iconotype', content: oldLogotype.iconotype?.content || oldLogotype.iconotype || '', image: oldLogotype.iconotype?.image || '' },
        { key: 'dimensionsAndMinimumSizes', title: 'Dimensions and Minimum Sizes', content: oldLogotype.dimensionsAndMinimumSizes?.content || oldLogotype.dimensionsAndMinimumSizes || '', image: oldLogotype.dimensionsAndMinimumSizes?.image || '' },
        { key: 'protectionZones', title: 'Protection Zones', content: oldLogotype.protectionZones?.content || oldLogotype.protectionZones || '', image: oldLogotype.protectionZones?.image || '' },
        { key: 'brandCollaborations', title: 'Brand Collaborations', content: oldLogotype.brandCollaborations?.content || oldLogotype.brandCollaborations || '', image: oldLogotype.brandCollaborations?.image || '' },
        { key: 'fundamentals', title: 'Fundamentals', content: oldLogotype.fundamentals?.content || oldLogotype.fundamentals || '', image: oldLogotype.fundamentals?.image || '' },
        { key: 'dosAndDonts', title: 'Do\'s & Don\'ts', content: oldLogotype.dosAndDonts?.content || oldLogotype.dosAndDonts || '', image: oldLogotype.dosAndDonts?.image || '' },
        { key: 'logoApplicationsInStationery', title: 'Logo Applications in Stationery', content: oldLogotype.logoApplicationsInStationery?.content || oldLogotype.logoApplicationsInStationery || '', image: oldLogotype.logoApplicationsInStationery?.image || '' },
        { key: 'logoApplicationsOnPhotography', title: 'Logo Applications on Photography', content: oldLogotype.logoApplicationsOnPhotography?.content || oldLogotype.logoApplicationsOnPhotography || '', image: oldLogotype.logoApplicationsOnPhotography?.image || '' }
      ];
      
      oldFields.forEach(field => {
        if (field.content || field.image) {
          content.logotype.subsections.push({
            title: field.title,
            content: field.content,
            image: field.image
          });
        }
      });
      
      // Handle old usage structure (black, white, color)
      if (oldLogotype.black || oldLogotype.white || oldLogotype.color) {
        const usageSubsection = {
          title: 'Usage',
          hasTabs: true,
          tabs: {}
        };
        
        if (oldLogotype.black) {
          usageSubsection.tabs.dark = {
            content: typeof oldLogotype.black === 'object' ? oldLogotype.black.content : oldLogotype.black,
            image: typeof oldLogotype.black === 'object' ? oldLogotype.black.image : ''
          };
        }
        if (oldLogotype.white) {
          usageSubsection.tabs.light = {
            content: typeof oldLogotype.white === 'object' ? oldLogotype.white.content : oldLogotype.white,
            image: typeof oldLogotype.white === 'object' ? oldLogotype.white.image : ''
          };
        }
        if (oldLogotype.color) {
          usageSubsection.tabs.color = {
            content: typeof oldLogotype.color === 'object' ? oldLogotype.color.content : oldLogotype.color,
            image: typeof oldLogotype.color === 'object' ? oldLogotype.color.image : ''
          };
        }
        
        if (Object.keys(usageSubsection.tabs).length > 0) {
          content.logotype.subsections.push(usageSubsection);
        }
      }
      
      needsUpdate = true;
    }
    
    // Initialize frameRebel if empty  
    if (isEmptySection(content.frameRebel)) {
      content.frameRebel = JSON.parse(JSON.stringify(defaultContent.frameRebel));
      needsUpdate = true;
    }
    
    // Initialize color if empty
    if (isEmptySection(content.color)) {
      content.color = JSON.parse(JSON.stringify(defaultContent.color));
      needsUpdate = true;
    }
    
    // Initialize typographySection if empty
    if (isEmptySection(content.typographySection)) {
      content.typographySection = JSON.parse(JSON.stringify(defaultContent.typographySection));
      needsUpdate = true;
    }
    
    // Migrate introduction content into frameRebel.aboutTheProject if introduction exists
    if (content.introduction && typeof content.introduction === 'object') {
      if (!content.frameRebel) content.frameRebel = {};
      if (!content.frameRebel.aboutTheProject) content.frameRebel.aboutTheProject = {};
      
      // Merge introduction content into aboutTheProject
      if (content.introduction.content && !content.frameRebel.aboutTheProject.content) {
        content.frameRebel.aboutTheProject.content = content.introduction.content;
      }
      if (content.introduction.image && !content.frameRebel.aboutTheProject.image) {
        content.frameRebel.aboutTheProject.image = content.introduction.image;
      } else if (content.introduction.image && content.frameRebel.aboutTheProject.image) {
        // If both have images, prefer introduction image (merge intro content before existing content)
        const existingContent = content.frameRebel.aboutTheProject.content || '';
        const introContent = content.introduction.content || '';
        content.frameRebel.aboutTheProject.content = introContent + '\n\n' + existingContent;
        content.frameRebel.aboutTheProject.image = content.introduction.image;
      }
      
      // Remove introduction
      delete content.introduction;
      needsUpdate = true;
    }
    
    // Ensure other required fields exist
    if (!content.brandName) content.brandName = defaultContent.brandName;
    if (!content.colors) content.colors = defaultContent.colors;
    if (!content.typography) content.typography = defaultContent.typography;
    if (!content.fonts) content.fonts = defaultContent.fonts;
    if (!content.typographyStyles) content.typographyStyles = defaultContent.typographyStyles;
    if (!content.hiddenSections) content.hiddenSections = defaultContent.hiddenSections;
    if (!content.assets) content.assets = defaultContent.assets;
    
    // Save updated content if needed
    if (needsUpdate) {
      await saveContent(content);
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error reading content:', error);
    // Try to return default content as fallback
    try {
      const defaultContent = getDefaultContent();
      res.json(defaultContent);
    } catch (fallbackError) {
      console.error('Error with fallback content:', fallbackError);
      res.status(500).json({ error: 'Failed to read content' });
    }
  }
});

// Helper function to get default content structure
function getDefaultContent() {
  return {
    brandName: 'Brand',
    logo: '',
    colors: [],
    typography: {
      primary: '',
      secondary: ''
    },
    fonts: [],
    typographyStyles: {},
    frameRebel: {
      aboutTheProject: {
        image: '',
        content: 'This brand toolkit provides comprehensive guidelines for maintaining consistency across all brand communications. Use this guide as a reference when creating materials, collaborating with partners, or working with external agencies.\n\nOur brand is built on principles of clarity, authenticity, and innovation. These guidelines ensure that every touchpoint with our audience reflects these core values.\n\nThe Name of the Project represents our commitment to challenging conventions and breaking free from traditional frameworks. This project embodies our mission to create meaningful change in the industry.\n\nWe believe in pushing boundaries, questioning norms, and creating solutions that are both innovative and purposeful. The Name of the Project is more than a brand—it\'s a movement toward reimagining what\'s possible.'
      },
      fundamentalPillars: {
        image: '',
        content: 'Our brand is built on three fundamental pillars:\n\n**1. Authenticity**\nWe stay true to our values and communicate with honesty and transparency.\n\n**2. Innovation**\nWe embrace new ideas and approaches, constantly evolving to meet changing needs.\n\n**3. Impact**\nWe measure success by the positive change we create for our community and the world.'
      },
      toneOfVoice: {
        image: '',
        content: 'Our tone of voice is confident yet approachable, professional yet personable. We speak with clarity and conviction, avoiding jargon while maintaining expertise.\n\n**Key Characteristics:**\n- Clear and direct\n- Inspiring and optimistic\n- Respectful and inclusive\n- Bold but not brash\n\nWhether writing for digital, print, or presentations, maintain this voice consistently across all communications.'
      }
    },
    logotype: {
      main: {
        positive: {
          image: '',
          content: 'The main logotype is our primary brand identifier. The positive version features dark text on light backgrounds, ensuring maximum readability and impact.\n\nUse the positive version on:\n- White or light-colored backgrounds\n- Light photographs\n- Light-colored materials\n\nThe logotype should never be stretched, skewed, or modified in any way. Always maintain the correct proportions and spacing.'
        },
        negative: {
          image: '',
          content: 'The negative version of the logotype is designed for dark backgrounds. It uses light or white elements to create strong contrast and visibility.\n\nUse the negative version on:\n- Dark or black backgrounds\n- Dark photographs\n- Dark-colored materials\n\nEnsure sufficient contrast (minimum 4.5:1) for accessibility compliance. Never place the negative logo on backgrounds that don\'t provide adequate contrast.'
        }
      },
      iconotype: {
        image: '',
        content: 'The iconotype is a simplified symbol version of our brand mark. It can be used independently when space is limited or when a more graphic treatment is needed.\n\n**When to use the iconotype:**\n- Social media profile pictures\n- App icons\n- Favicons\n- Small-scale applications\n- When the full logotype won\'t fit\n\nThe iconotype maintains the same visual language as the main logotype and should be used consistently.'
      },
      dimensionsAndMinimumSizes: {
        image: '',
        content: 'To ensure the logotype remains legible and impactful, it must never be used below the minimum sizes specified:\n\n**Print Applications:**\n- Minimum height: 12mm (0.47 inches)\n- Maintain clear space equal to half the logotype height\n\n**Digital Applications:**\n- Minimum height: 24px for standard displays\n- Minimum height: 48px for high-density displays (Retina)\n\nWhen scaling the logotype, always maintain its aspect ratio. Never compress or stretch it horizontally or vertically.'
      },
      protectionZones: {
        image: '',
        content: 'The protection zone is the minimum clear space that must surround the logotype on all sides. This space ensures the logotype has visual breathing room and maintains its impact.\n\nThe protection zone is equal to the height of the letter "X" in the logotype. No other graphic elements, text, or images should intrude into this space.\n\n**Guidelines:**\n- Maintain clear space on all four sides\n- No overlapping elements\n- No text placement within the zone\n- No decorative elements crossing the boundary'
      },
      brandCollaborations: {
        image: '',
        content: 'When collaborating with partner brands, the logotype should be displayed in a way that respects both brands equally.\n\n**Collaboration Guidelines:**\n- Place logotypes at equal sizes\n- Maintain clear space between brands\n- Use consistent alignment (both left, both centered, or side by side)\n- Never combine or merge logotypes\n- Always respect partner brand guidelines\n\nIf in doubt, consult the brand team before finalizing collaboration materials.'
      },
      fundamentals: {
        image: '',
        content: 'The logotype is built on fundamental design principles that ensure consistency and recognition.\n\n**Core Principles:**\n1. **Consistency** - Always use approved versions\n2. **Clarity** - Ensure legibility at all sizes\n3. **Contrast** - Maintain sufficient contrast with background\n4. **Space** - Respect the protection zone\n5. **Integrity** - Never modify or distort\n\nThese fundamentals apply to all applications, from business cards to billboards, from digital screens to print materials.'
      },
      dosAndDonts: {
        image: '',
        content: '**DO\'S:**\n✓ Use approved logo files only\n✓ Maintain proper clear space\n✓ Use correct version for background\n✓ Scale proportionally\n✓ Use high-resolution files for print\n✓ Follow color specifications\n\n**DON\'TS:**\n✗ Don\'t stretch or distort the logo\n✗ Don\'t add effects (shadows, gradients, outlines)\n✗ Don\'t change colors unless specified\n✗ Don\'t rotate or tilt the logo\n✗ Don\'t use low-resolution files\n✗ Don\'t recreate or modify the logo\n✗ Don\'t place on busy backgrounds\n✗ Don\'t use outdated versions'
      },
      logoApplicationsInStationery: {
        image: '',
        content: 'The logotype should be consistently applied across all stationery items to maintain brand recognition and professionalism.\n\n**Stationery Applications:**\n- Business cards: Top left or centered, following minimum size requirements\n- Letterheads: Top left, with sufficient margin from page edge\n- Envelopes: Top left, maintaining clear space from edges\n- Presentation folders: Front cover, centered or aligned per template\n\nAlways use the appropriate logo version (positive or negative) based on the background color of the stationery item.'
      },
      logoApplicationsOnPhotography: {
        image: '',
        content: 'When placing the logotype on photography, ensure visibility and impact while respecting the image.\n\n**Photography Guidelines:**\n- Use the negative logo on dark photographs\n- Use the positive logo on light photographs\n- Place in areas with consistent tone (avoid busy areas)\n- Maintain minimum size requirements\n- Consider using a subtle background treatment if needed for contrast\n- Never obscure important elements in the photograph\n\nWhen in doubt, test the logo placement at various sizes to ensure it remains readable.'
      }
    },
    color: {
      corporateColors: {
        image: '',
        content: 'Our corporate color palette has been carefully selected to represent our brand values and ensure consistency across all applications.\n\nThe primary colors should be used for main brand elements, while secondary colors provide flexibility for variations and accent applications.\n\nAlways refer to the color palette when creating materials, and ensure colors are accurately reproduced in both digital and print formats. Use the provided color codes (HEX, RGB, CMYK) to maintain consistency.'
      },
      correctApplications: {
        image: '',
        content: 'Colors should be applied thoughtfully to create hierarchy, draw attention, and enhance readability.\n\n**Correct Usage:**\n- Use primary colors for main brand elements\n- Use secondary colors for accents and highlights\n- Maintain sufficient contrast between text and background (minimum 4.5:1 for body text)\n- Use colors to create visual hierarchy\n- Apply colors consistently across related materials\n- Consider color psychology and meaning in context'
      },
      monochromatic: {
        image: '',
        content: 'Monochromatic applications use a single ink color, creating a sophisticated and cost-effective solution for certain print applications.\n\n**When to use monochromatic:**\n- Single-color print jobs\n- Budget-conscious applications\n- When color isn\'t essential to the message\n- Internal documents\n- Certain packaging applications\n\nThe logotype and key elements should remain legible in monochromatic applications. Test grayscale conversions to ensure clarity.'
      },
      incorrectApplications: {
        image: '',
        content: '**Avoid these common color mistakes:**\n\n✗ Using colors not in the approved palette\n✗ Mixing colors in ways that create visual discord\n✗ Insufficient contrast between text and background\n✗ Using too many colors in a single design\n✗ Modifying approved colors (lightening, darkening, or shifting hues)\n✗ Using colors that conflict with partner brands in collaborations\n✗ Ignoring accessibility requirements for color contrast\n\nWhen in doubt, consult the brand guidelines or contact the brand team for approval.'
      }
    },
    typographySection: {
      readingLevels: {
        image: '',
        content: 'Typography hierarchy creates clear reading levels that guide users through content and establish information priority.\n\n**Reading Levels:**\n1. **Level 1 - Display:** Largest size, used for hero headlines and major statements\n2. **Level 2 - Heading 1:** Primary section headings\n3. **Level 3 - Heading 2:** Subsection headings\n4. **Level 4 - Heading 3:** Minor headings and labels\n5. **Level 5 - Body:** Standard body text\n6. **Level 6 - Small:** Captions, footnotes, and fine print\n\nConsistent application of these levels ensures clarity and professional appearance across all materials.'
      }
    },
    hiddenSections: {},
    assets: [],
    updatedAt: new Date().toISOString()
  };
}

// Update content (authentication removed per user request)
app.put('/api/content', async (req, res) => {
  try {
    console.log('Received content update. Logo present:', !!req.body.logo, 'Logo length:', req.body.logo ? req.body.logo.length : 0);
    console.log('Content keys:', Object.keys(req.body));
    
    const newContent = {
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    // Ensure logo SVG content is preserved as-is
    if (req.body.logo && typeof req.body.logo === 'string') {
      newContent.logo = req.body.logo;
    }
    
    // Ensure all required fields exist
    if (!newContent.colors) newContent.colors = [];
    if (!newContent.fonts) newContent.fonts = [];
    if (!newContent.typographyStyles) newContent.typographyStyles = {};
    
    await saveContent(newContent);
    
    // Generate CSS when typography is updated
    if (req.body.typography) {
      try {
        await generateTypographyCSSFromPrimarySecondary(newContent);
      } catch (cssError) {
        console.error('Error generating CSS (non-fatal):', cssError);
        // Don't fail the save if CSS generation fails
      }
    }
    
    res.json({ success: true, content: newContent });
  } catch (error) {
    console.error('Error updating content:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update content', details: error.message });
  }
});

// Update specific section by path (e.g., frameRebel.aboutTheProject) - MUST come before /api/content/:section
app.patch('/api/content/section/*', async (req, res) => {
  try {
    // Extract the section path from the URL (everything after /section/)
    const sectionPath = req.params[0]; // Express wildcard (*) captures in params[0]
    const sectionData = req.body;
    
    if (!sectionPath || !sectionData || Object.keys(sectionData).length === 0) {
      return res.status(400).json({ error: 'Section path and data are required' });
    }
    
    console.log(`PATCH /api/content/section/${sectionPath} - Updating section`);
    
    // Load current content
    const currentContent = await getContent();
    
    // Merge section data into content using the path
    // Example: "frameRebel.aboutTheProject" -> currentContent.frameRebel.aboutTheProject = sectionData
    const pathParts = sectionPath.split('.');
    let target = currentContent;
    
    // Navigate to the parent object (skip the last part which is the key to set)
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!target[part]) {
        target[part] = {};
      }
      target = target[part];
    }
    
    // Set the section data (merge if it's an object)
    const sectionKey = pathParts[pathParts.length - 1];
    if (typeof sectionData === 'object' && typeof target[sectionKey] === 'object' && target[sectionKey] !== null && !Array.isArray(target[sectionKey])) {
      // Merge objects
      target[sectionKey] = { ...target[sectionKey], ...sectionData };
    } else {
      // Replace entirely
      target[sectionKey] = sectionData;
    }
    
    // Update timestamp
    currentContent.updatedAt = new Date().toISOString();
    
    // Save the merged content
    await saveContent(currentContent);
    
    console.log(`Section ${sectionPath} saved successfully`);
    
    // Return the full updated content
    res.json({ success: true, content: currentContent });
  } catch (error) {
    console.error('Error updating section:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update section', details: error.message });
  }
});

// Batch update multiple sections
app.patch('/api/content/sections', async (req, res) => {
  try {
    const sections = req.body.sections; // Array of { path: string, data: object }
    
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({ error: 'Sections array is required' });
    }
    
    console.log(`PATCH /api/content/sections - Updating ${sections.length} sections`);
    
    // Load current content
    const currentContent = await getContent();
    
    // Apply all section updates
    for (const section of sections) {
      const { path, data } = section;
      if (!path || !data) continue;
      
      const pathParts = path.split('.');
      let target = currentContent;
      
      // Navigate to the parent object
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!target[part]) {
          target[part] = {};
        }
        target = target[part];
      }
      
      // Set the section data
      const sectionKey = pathParts[pathParts.length - 1];
      if (typeof data === 'object' && typeof target[sectionKey] === 'object' && target[sectionKey] !== null && !Array.isArray(target[sectionKey])) {
        // Merge objects
        target[sectionKey] = { ...target[sectionKey], ...data };
      } else {
        // Replace entirely
        target[sectionKey] = data;
      }
    }
    
    // Update timestamp
    currentContent.updatedAt = new Date().toISOString();
    
    // Save the merged content
    await saveContent(currentContent);
    
    console.log(`Saved ${sections.length} sections successfully`);
    
    // Return the full updated content
    res.json({ success: true, content: currentContent });
  } catch (error) {
    console.error('Error updating sections:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update sections', details: error.message });
  }
});

// Update specific section (legacy endpoint - kept for backward compatibility)
app.patch('/api/content/:section', async (req, res) => {
  try {
    const content = await getContent();
    const section = req.params.section;
    
    if (req.body.nested) {
      // Handle nested updates like colors.primary
      const keys = section.split('.');
      let current = content;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = req.body.value;
    } else {
      content[section] = req.body.value;
    }
    
    content.updatedAt = new Date().toISOString();
    await saveContent(content);
    
    // Generate CSS when typography is updated
    if (req.body.typography) {
      await generateTypographyCSSFromPrimarySecondary(content);
    }
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// Upload asset (base64 encoded images) (authentication removed per user request)
app.post('/api/assets', async (req, res) => {
  try {
    const content = await getContent();
    const { name, data, type } = req.body;
    
    if (!content.assets) {
      content.assets = [];
    }
    
    const asset = {
      id: Date.now().toString(),
      name: name || `asset-${Date.now()}`,
      data: data, // base64 encoded
      type: type || 'image/png',
      uploadedAt: new Date().toISOString()
    };
    
    content.assets.push(asset);
    content.updatedAt = new Date().toISOString();
    await saveContent(content);
    
    res.json({ success: true, asset });
  } catch (error) {
    console.error('Error uploading asset:', error);
    res.status(500).json({ error: 'Failed to upload asset' });
  }
});

// Delete asset (authentication removed per user request)
app.delete('/api/assets/:id', async (req, res) => {
  try {
    const content = await getContent();
    if (!content.assets) {
      content.assets = [];
    }
    
    content.assets = content.assets.filter(asset => asset.id !== req.params.id);
    content.updatedAt = new Date().toISOString();
    await saveContent(content);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// Toggle section visibility (authentication removed per user request)
app.patch('/api/sections/:sectionId/visibility', async (req, res) => {
  try {
    const content = await getContent();
    const sectionId = req.params.sectionId;
    const { hidden } = req.body;
    
    if (!content.hiddenSections) {
      content.hiddenSections = {};
    }
    
    content.hiddenSections[sectionId] = hidden === true;
    content.updatedAt = new Date().toISOString();
    await saveContent(content);
    
    res.json({ success: true, hidden: content.hiddenSections[sectionId] });
  } catch (error) {
    console.error('Error toggling section visibility:', error);
    res.status(500).json({ error: 'Failed to toggle section visibility' });
  }
});

// Typography Management API (authentication removed per user request)
app.post('/api/fonts/upload', upload.single('fontFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Get font name from request body or extract from filename
    const customFontName = req.body.fontName ? req.body.fontName.trim() : null;
    const originalName = req.file.originalname || req.file.filename;
    const baseName = path.basename(originalName, path.extname(originalName));
    let fontFamily = customFontName || baseName.replace(/[-_]/g, ' ');
    // If not custom name, capitalize first letter of each word
    if (!customFontName) {
      fontFamily = fontFamily.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    
    const fontInfo = {
      id: Date.now().toString(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      fontFamily: fontFamily,
      path: `/fonts/${req.file.filename}`,
      size: req.file.size,
      uploadedAt: new Date().toISOString()
    };
    
    console.log('Uploading font:', fontInfo); // Debug log
    
    // Load content to add font
    const content = await getContent();
    if (!content.fonts) {
      content.fonts = [];
    }
    content.fonts.push(fontInfo);
    await saveContent(content);
    
    res.json({ success: true, font: fontInfo });
  } catch (error) {
    console.error('Error uploading font:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update typography style assignments (authentication removed per user request)
app.put('/api/typography/styles', async (req, res) => {
  try {
    const { styles } = req.body;
    const content = await getContent();
    
    if (!content.typographyStyles) {
      content.typographyStyles = {};
    }
    
    // Replace typography styles (not merge - replace entirely)
    content.typographyStyles = styles;
    
    await saveContent(content);
    
    console.log('Saved typography styles:', JSON.stringify(content.typographyStyles, null, 2)); // Debug log
    
    // Generate CSS with primary/secondary fonts instead of individual assignments
    await generateTypographyCSSFromPrimarySecondary(content);
    
    res.json({ success: true, typography: content.typographyStyles });
  } catch (error) {
    console.error('Error updating typography:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate typography CSS based on primary/secondary font names
async function generateTypographyCSSFromPrimarySecondary(content) {
  const { fonts = [], typography = {} } = content;
  const primaryFontName = content.typography?.primary || '';
  const secondaryFontName = content.typography?.secondary || '';
  
  let css = '';
  
  // Generate @font-face declarations for all fonts
  const fontFamilyMap = new Map();
  fonts.forEach(font => {
    let fontFamily = font.fontFamily;
    if (!fontFamily) {
      const baseName = path.basename(font.filename, path.extname(font.filename));
      fontFamily = baseName.replace(/[-_]/g, ' ');
      fontFamily = fontFamily.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    if (!fontFamilyMap.has(fontFamily)) {
      fontFamilyMap.set(fontFamily, []);
    }
    fontFamilyMap.get(fontFamily).push(font);
  });
  
  fontFamilyMap.forEach((fontFiles, fontFamily) => {
    const ext = path.extname(fontFiles[0].filename).toLowerCase();
    let format = 'opentype';
    
    if (ext === '.woff') format = 'woff';
    else if (ext === '.woff2') format = 'woff2';
    else if (ext === '.ttf') format = 'truetype';
    else if (ext === '.eot') format = 'embedded-opentype';
    
    fontFiles.forEach(font => {
      css += `@font-face {\n`;
      css += `    font-family: '${fontFamily}';\n`;
      css += `    src: url('${font.path}') format('${format}');\n`;
      css += `    font-weight: ${font.fontWeight || 'normal'};\n`;
      css += `    font-style: ${font.fontStyle || 'normal'};\n`;
      css += `}\n\n`;
    });
  });
  
  // Find matching fonts for primary and secondary
  let primaryFontFamily = primaryFontName;
  let secondaryFontFamily = secondaryFontName;
  
  if (fonts.length > 0 && primaryFontName) {
    const matchedFont = fonts.find(f => {
      const fontName = (f.fontFamily || f.originalName || f.filename).toLowerCase();
      return fontName.includes(primaryFontName.toLowerCase()) || 
             primaryFontName.toLowerCase().includes(fontName);
    });
    if (matchedFont) {
      primaryFontFamily = matchedFont.fontFamily || matchedFont.originalName || matchedFont.filename;
    }
  }
  
  if (fonts.length > 0 && secondaryFontName) {
    const matchedFont = fonts.find(f => {
      const fontName = (f.fontFamily || f.originalName || f.filename).toLowerCase();
      return fontName.includes(secondaryFontName.toLowerCase()) || 
             secondaryFontName.toLowerCase().includes(fontName);
    });
    if (matchedFont) {
      secondaryFontFamily = matchedFont.fontFamily || matchedFont.originalName || matchedFont.filename;
    }
  }
  
  // Typography style specifications
  const styleSpecs = {
    display: {
      desktop: { fontSize: '96px', lineHeight: '100%', letterSpacing: '-0.02em' },
      tablet: { fontSize: '72px', lineHeight: '100%', letterSpacing: '-0.02em' },
      mobile: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.02em' }
    },
    heading1: {
      desktop: { fontSize: '60px', lineHeight: '100%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '36px', lineHeight: '100%', letterSpacing: '-0.01em' }
    },
    heading2: {
      desktop: { fontSize: '42px', lineHeight: '110%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '36px', lineHeight: '110%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '28px', lineHeight: '110%', letterSpacing: '-0.01em' }
    },
    heading3: {
      desktop: { fontSize: '32px', lineHeight: '120%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '28px', lineHeight: '120%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '24px', lineHeight: '120%', letterSpacing: '-0.01em' }
    },
    heading4: {
      desktop: { fontSize: '24px', lineHeight: '120%', letterSpacing: '0' },
      tablet: { fontSize: '20px', lineHeight: '120%', letterSpacing: '0' },
      mobile: { fontSize: '18px', lineHeight: '120%', letterSpacing: '0' }
    },
    body1: {
      desktop: { fontSize: '20px', lineHeight: '124%', letterSpacing: '0' },
      tablet: { fontSize: '18px', lineHeight: '124%', letterSpacing: '0' },
      mobile: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' }
    },
    body2: {
      desktop: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' },
      tablet: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0' },
      mobile: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0' }
    },
    button: {
      desktop: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0.01em' },
      tablet: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0.01em' },
      mobile: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0.01em' }
    },
    caption: {
      desktop: { fontSize: '12px', lineHeight: '140%', letterSpacing: '0.04em' },
      tablet: { fontSize: '11px', lineHeight: '140%', letterSpacing: '0.04em' },
      mobile: { fontSize: '10px', lineHeight: '140%', letterSpacing: '0.04em' }
    }
  };
  
  // Use primary font for display and headings, secondary for body (or primary if no secondary)
  const headingFontFamily = primaryFontFamily || 'inherit';
  const bodyFontFamily = secondaryFontFamily || primaryFontFamily || 'inherit';
  
  // Generate CSS classes for typography styles
  Object.keys(styleSpecs).forEach(styleName => {
    const specs = styleSpecs[styleName];
    const fontFamily = (styleName.startsWith('body') || styleName === 'button' || styleName === 'caption') 
      ? bodyFontFamily 
      : headingFontFamily;
    
    // Check for uppercase setting in typographyStyles if available
    const styleConfig = content.typographyStyles?.[styleName];
    
    css += `.typography-${styleName} {\n`;
    css += `    font-family: '${fontFamily}', sans-serif;\n`;
    if (styleConfig && styleConfig.uppercase) {
      css += `    text-transform: uppercase;\n`;
    }
    
    // Desktop (1280px+)
    css += `    font-size: ${specs.desktop.fontSize};\n`;
    css += `    line-height: ${specs.desktop.lineHeight};\n`;
    css += `    letter-spacing: ${specs.desktop.letterSpacing};\n`;
    css += `}\n\n`;
    
    // Tablet (601px-1279px)
    css += `@media (max-width: 1279px) {\n`;
    css += `    .typography-${styleName} {\n`;
    css += `        font-size: ${specs.tablet.fontSize};\n`;
    css += `        line-height: ${specs.tablet.lineHeight};\n`;
    css += `        letter-spacing: ${specs.tablet.letterSpacing};\n`;
    css += `    }\n}\n\n`;
    
    // Mobile (0px-600px)
    css += `@media (max-width: 600px) {\n`;
    css += `    .typography-${styleName} {\n`;
    css += `        font-size: ${specs.mobile.fontSize};\n`;
    css += `        line-height: ${specs.mobile.lineHeight};\n`;
    css += `        letter-spacing: ${specs.mobile.letterSpacing};\n`;
    css += `    }\n}\n\n`;
  });
  
  // Write CSS to file
  const cssPath = path.join(__dirname, 'public', 'typography-generated.css');
  await fs.writeFile(cssPath, css);
  
  return css;
}

// Generate typography CSS based on assignments (kept for backwards compatibility)
async function generateTypographyCSS(content) {
  const { fonts = [], typographyStyles = {} } = content;
  
  let css = '';
  
  // Generate @font-face declarations for all fonts
  const fontFamilyMap = new Map();
  fonts.forEach(font => {
    // Use the fontFamily from the font object, or extract from filename
    let fontFamily = font.fontFamily;
    if (!fontFamily) {
      const baseName = path.basename(font.filename, path.extname(font.filename));
      fontFamily = baseName.replace(/[-_]/g, ' ');
      // Capitalize first letter of each word
      fontFamily = fontFamily.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    if (!fontFamilyMap.has(fontFamily)) {
      fontFamilyMap.set(fontFamily, []);
    }
    fontFamilyMap.get(fontFamily).push(font);
  });
  
  fontFamilyMap.forEach((fontFiles, fontFamily) => {
    const ext = path.extname(fontFiles[0].filename).toLowerCase();
    let format = 'opentype';
    
    if (ext === '.woff') format = 'woff';
    else if (ext === '.woff2') format = 'woff2';
    else if (ext === '.ttf') format = 'truetype';
    else if (ext === '.eot') format = 'embedded-opentype';
    
    fontFiles.forEach(font => {
      css += `@font-face {\n`;
      css += `    font-family: '${fontFamily}';\n`;
      css += `    src: url('${font.path}') format('${format}');\n`;
      css += `    font-weight: ${font.fontWeight || 'normal'};\n`;
      css += `    font-style: ${font.fontStyle || 'normal'};\n`;
      css += `}\n\n`;
    });
  });
  
  // Typography style specifications (based on the images)
  const styleSpecs = {
    display: {
      desktop: { fontSize: '96px', lineHeight: '100%', letterSpacing: '-0.02em' },
      tablet: { fontSize: '72px', lineHeight: '100%', letterSpacing: '-0.02em' },
      mobile: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.02em' }
    },
    heading1: {
      desktop: { fontSize: '60px', lineHeight: '100%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '48px', lineHeight: '100%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '36px', lineHeight: '100%', letterSpacing: '-0.01em' }
    },
    heading2: {
      desktop: { fontSize: '42px', lineHeight: '110%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '36px', lineHeight: '110%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '28px', lineHeight: '110%', letterSpacing: '-0.01em' }
    },
    heading3: {
      desktop: { fontSize: '32px', lineHeight: '120%', letterSpacing: '-0.01em' },
      tablet: { fontSize: '28px', lineHeight: '120%', letterSpacing: '-0.01em' },
      mobile: { fontSize: '24px', lineHeight: '120%', letterSpacing: '-0.01em' }
    },
    heading4: {
      desktop: { fontSize: '24px', lineHeight: '120%', letterSpacing: '0' },
      tablet: { fontSize: '20px', lineHeight: '120%', letterSpacing: '0' },
      mobile: { fontSize: '18px', lineHeight: '120%', letterSpacing: '0' }
    },
    body1: {
      desktop: { fontSize: '20px', lineHeight: '124%', letterSpacing: '0' },
      tablet: { fontSize: '18px', lineHeight: '124%', letterSpacing: '0' },
      mobile: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' }
    },
    body2: {
      desktop: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0' },
      tablet: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0' },
      mobile: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0' }
    },
    button: {
      desktop: { fontSize: '16px', lineHeight: '124%', letterSpacing: '0.01em' },
      tablet: { fontSize: '15px', lineHeight: '124%', letterSpacing: '0.01em' },
      mobile: { fontSize: '14px', lineHeight: '124%', letterSpacing: '0.01em' }
    },
    caption: {
      desktop: { fontSize: '12px', lineHeight: '140%', letterSpacing: '0.04em' },
      tablet: { fontSize: '11px', lineHeight: '140%', letterSpacing: '0.04em' },
      mobile: { fontSize: '10px', lineHeight: '140%', letterSpacing: '0.04em' }
    }
  };
  
  // Generate CSS classes for each typography style
  Object.keys(styleSpecs).forEach(styleName => {
    const styleConfig = typographyStyles[styleName];
    if (!styleConfig || !styleConfig.fontId) return;
    
    const font = fonts.find(f => f.id === styleConfig.fontId);
    if (!font) {
      console.log(`Font not found for ${styleName}, fontId: ${styleConfig.fontId}`);
      return;
    }
    
    // Use the fontFamily from the font object, or extract from filename
    let fontFamily = font.fontFamily;
    if (!fontFamily) {
      const baseName = path.basename(font.filename, path.extname(font.filename));
      fontFamily = baseName.replace(/[-_]/g, ' ');
      // Capitalize first letter of each word
      fontFamily = fontFamily.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }
    const specs = styleSpecs[styleName];
    
    console.log(`Generating CSS for ${styleName} with font: ${fontFamily}`); // Debug
    
    css += `.typography-${styleName} {\n`;
    css += `    font-family: '${fontFamily}', sans-serif;\n`;
    if (styleConfig.uppercase) {
      css += `    text-transform: uppercase;\n`;
    }
    
    // Desktop (1280px+)
    css += `    font-size: ${specs.desktop.fontSize};\n`;
    css += `    line-height: ${specs.desktop.lineHeight};\n`;
    css += `    letter-spacing: ${specs.desktop.letterSpacing};\n`;
    css += `}\n\n`;
    
    // Tablet (601px-1279px)
    css += `@media (max-width: 1279px) {\n`;
    css += `    .typography-${styleName} {\n`;
    css += `        font-size: ${specs.tablet.fontSize};\n`;
    css += `        line-height: ${specs.tablet.lineHeight};\n`;
    css += `        letter-spacing: ${specs.tablet.letterSpacing};\n`;
    css += `    }\n}\n\n`;
    
    // Mobile (0px-600px)
    css += `@media (max-width: 600px) {\n`;
    css += `    .typography-${styleName} {\n`;
    css += `        font-size: ${specs.mobile.fontSize};\n`;
    css += `        line-height: ${specs.mobile.lineHeight};\n`;
    css += `        letter-spacing: ${specs.mobile.letterSpacing};\n`;
    css += `    }\n}\n\n`;
  });
  
  // Write CSS to file
  const cssPath = path.join(__dirname, 'public', 'typography-generated.css');
  await fs.writeFile(cssPath, css);
  
  return css;
}

// Delete font (authentication removed per user request)
app.delete('/api/fonts/:id', async (req, res) => {
  try {
    const fontId = req.params.id;
    const content = await getContent();
    
    const fontIndex = content.fonts?.findIndex(f => f.id === fontId);
    if (fontIndex === -1 || fontIndex === undefined) {
      return res.status(404).json({ success: false, error: 'Font not found' });
    }
    
    const font = content.fonts[fontIndex];
    
    // Delete font file
    try {
      await fs.remove(path.join(FONTS_DIR, font.filename));
    } catch (err) {
      console.warn('Could not delete font file:', err);
    }
    
    // Remove from content
    content.fonts.splice(fontIndex, 1);
    
    // Remove from typography assignments
    if (content.typographyStyles) {
      Object.keys(content.typographyStyles).forEach(style => {
        if (content.typographyStyles[style].fontId === fontId) {
          delete content.typographyStyles[style];
        }
      });
    }
    
    await saveContent(content);
    
    // Regenerate CSS
    await generateTypographyCSS(content);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting font:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve admin page (authentication removed per user request)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Also serve admin.html directly (authentication removed per user request)
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve login page
app.get('/login.html', (req, res) => {
  if (req.session && req.session.authenticated) {
    return res.redirect('/admin.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
// Figma API Routes
app.get('/api/figma/teams', async (req, res) => {
  try {
    const teams = await figmaRequest('/teams');
    res.json(teams);
  } catch (error) {
    console.error('Error fetching Figma teams:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/teams/:teamId/projects', async (req, res) => {
  try {
    const { teamId } = req.params;
    const projects = await figmaRequest(`/teams/${teamId}/projects`);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching Figma projects:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/projects/:projectId/files', async (req, res) => {
  try {
    const { projectId } = req.params;
    const files = await figmaRequest(`/projects/${projectId}/files`);
    res.json(files);
  } catch (error) {
    console.error('Error fetching Figma files:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const results = [];
    
    // Try to get teams (might not work for personal accounts)
    try {
      const teams = await figmaRequest('/teams');
      // Search through all teams, projects, and files
      for (const team of teams.teams || []) {
        try {
          const projects = await figmaRequest(`/teams/${team.id}/projects`);
          for (const project of projects.projects || []) {
            try {
              const files = await figmaRequest(`/projects/${project.id}/files`);
              for (const file of files.files || []) {
                if (file.name && file.name.toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    name: file.name,
                    key: file.key,
                    lastModified: file.lastModified,
                    thumbnailUrl: file.thumbnail_url,
                    project: {
                      name: project.name,
                      id: project.id
                    },
                    team: {
                      name: team.name,
                      id: team.id
                    }
                  });
                }
              }
            } catch (err) {
              console.warn(`Error fetching files for project ${project.id}:`, err.message);
            }
          }
        } catch (err) {
          console.warn(`Error fetching projects for team ${team.id}:`, err.message);
        }
      }
    } catch (teamsError) {
      // Teams endpoint might not be available for personal accounts
      console.warn('Teams endpoint not available, trying alternative methods:', teamsError.message);
      return res.json({ 
        results: [],
        message: 'Unable to search files automatically. Please provide the file key from the Figma URL.',
        help: 'To find the file key: Open the file in Figma, the URL will be like: https://www.figma.com/file/FILE_KEY/...'
      });
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error searching Figma:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/me', async (req, res) => {
  try {
    const me = await figmaRequest('/me');
    res.json(me);
  } catch (error) {
    console.error('Error fetching Figma user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/file/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const file = await figmaRequest(`/files/${fileKey}`);
    res.json(file);
  } catch (error) {
    console.error('Error fetching Figma file:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/file/:fileKey/nodes', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'Node IDs required' });
    }
    const nodes = await figmaRequest(`/files/${fileKey}/nodes?ids=${ids}`);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching Figma nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/figma/file/:fileKey/images', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { ids, format = 'png', scale = 1 } = req.query;
    if (!ids) {
      return res.status(400).json({ error: 'Node IDs required' });
    }
    const images = await figmaRequest(`/images/${fileKey}?ids=${ids}&format=${format}&scale=${scale}`);
    res.json(images);
  } catch (error) {
    console.error('Error fetching Figma images:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to check if a font is a Google Font
function isGoogleFont(fontName) {
  if (!fontName) return false;
  
  // Common Google Fonts list (you can expand this)
  const googleFonts = [
    'Work Sans', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 
    'Poppins', 'Source Sans Pro', 'Raleway', 'Oswald', 'Playfair Display',
    'Merriweather', 'Nunito', 'Ubuntu', 'PT Sans', 'Noto Sans', 'Lora',
    'Fira Sans', 'Dancing Script', 'Crimson Text', 'Bebas Neue', 'Caveat',
    'Quicksand', 'Dosis', 'Indie Flower', 'Shadows Into Light', 'Pacifico',
    'Amatic SC', 'Comfortaa', 'Josefin Sans', 'Anton', 'Libre Baskerville',
    'Yanone Kaffeesatz', 'Righteous', 'Bitter', 'Varela Round', 'Titillium Web'
  ];
  
  // Check if font name matches any Google Font (case-insensitive)
  return googleFonts.some(gf => 
    fontName.toLowerCase().replace(/\s+/g, ' ').trim() === gf.toLowerCase()
  );
}

// Helper function to convert font name to Google Fonts API format
function formatGoogleFontName(fontName) {
  if (!fontName) return '';
  // Replace spaces with + for Google Fonts API
  return fontName.replace(/\s+/g, '+');
}

// Import Figma export JSON file (authentication removed per user request)
app.post('/api/figma/import', async (req, res) => {
  try {
    if (!req.body.data) {
      return res.status(400).json({ error: 'No JSON data provided' });
    }
    
    const { autoApply = false } = req.body;
    let figmaData;
    
    try {
      figmaData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
    } catch (parseError) {
      return res.status(400).json({ error: 'Invalid JSON data: ' + parseError.message });
    }
    
    // Extract colors from collections
    const colors = [];
    const colorMap = new Map();
    
    if (figmaData.collections && figmaData.collections.Color && figmaData.collections.Color.variables) {
      const colorVariables = figmaData.collections.Color.variables.colors || [];
      colorVariables.forEach((color, index) => {
        if (color.value && !colorMap.has(color.value)) {
          const colorName = color.name || color.token || `color-${index + 1}`;
          colorMap.set(color.value, {
            id: `color-${Date.now()}-${index}`,
            name: colorName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format name nicely
            hex: color.value,
            type: index === 0 ? 'primary' : 'secondary' // First color is primary, rest secondary
          });
          colors.push(colorMap.get(color.value));
        }
      });
    }
    
    // Also check styles.colors if they exist
    if (figmaData.styles && figmaData.styles.colors) {
      figmaData.styles.colors.forEach((colorStyle, index) => {
        // This might reference a variable, but we'll skip for now as we already have the actual colors
      });
    }
    
    // Extract typography from text styles
    const typography = [];
    const typographyMap = new Map();
    
    if (figmaData.styles && figmaData.styles.textStyles) {
      figmaData.styles.textStyles.forEach((textStyle, index) => {
        if (textStyle.fontFamily) {
          const key = `${textStyle.fontFamily}-${textStyle.fontWeight || 'normal'}`;
          if (!typographyMap.has(key)) {
            typographyMap.set(key, {
              fontFamily: textStyle.fontFamily,
              fontSize: parseFloat(textStyle.fontSize) || null,
              fontWeight: textStyle.fontWeight || 'normal',
              lineHeight: textStyle.lineHeight || null,
              letterSpacing: textStyle.letterSpacing || null,
              name: textStyle.name || textStyle.token || `style-${index + 1}`,
              isGoogleFont: isGoogleFont(textStyle.fontFamily)
            });
            typography.push(typographyMap.get(key));
          }
        }
      });
    }
    
    // If autoApply is true, update the content
    if (autoApply) {
      const content = await getContent();
      
      // Update colors if we found any
      if (colors.length > 0) {
        content.colors = colors;
      }
      
      // Update typography if we found any
      if (typography.length > 0) {
        const primaryFont = typography[0]?.fontFamily || content.typography?.primary || '';
        const secondaryFont = typography[1]?.fontFamily || typography[0]?.fontFamily || content.typography?.secondary || primaryFont;
        if (!content.typography) {
          content.typography = {};
        }
        content.typography.primary = primaryFont;
        content.typography.secondary = secondaryFont;
        
      }
      
      await saveContent(content);
      
      // Regenerate CSS if typography was updated
      if (typography.length > 0) {
        await generateTypographyCSSFromPrimarySecondary(content);
      }
    }
    
    res.json({
      success: true,
      colors: colors,
      typography: typography,
      autoApplied: autoApply
    });
  } catch (error) {
    console.error('Error importing Figma export:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract colors and styles from Figma file (keep for API-based sync if needed)
app.post('/api/figma/sync/:fileKey', async (req, res) => {
  try {
    const { fileKey } = req.params;
    const { autoApply = false } = req.body;
    const file = await figmaRequest(`/files/${fileKey}`);
    
    // Extract colors from fills and styles
    const colors = [];
    const colorMap = new Map();
    const typography = [];
    const typographyMap = new Map();
    
    // Also check styles from the file
    const styles = file.styles || {};
    
    function rgbToHex(r, g, b) {
      return `#${Math.round(r * 255).toString(16).padStart(2, '0')}${Math.round(g * 255).toString(16).padStart(2, '0')}${Math.round(b * 255).toString(16).padStart(2, '0')}`;
    }
    
    function traverseNode(node) {
      // Extract colors from fills
      if (node.fills && Array.isArray(node.fills)) {
        node.fills.forEach(fill => {
          if (fill.type === 'SOLID' && fill.color) {
            const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
            
            if (!colorMap.has(hex)) {
              const colorName = (node.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `color-${colors.length + 1}`;
              colorMap.set(hex, {
                name: colorName,
                hex: hex,
                type: 'primary' // Default, can be updated
              });
              colors.push(colorMap.get(hex));
            }
          }
        });
      }
      
      // Extract typography from text nodes
      if (node.type === 'TEXT' && node.style) {
        const fontFamily = node.style.fontFamily;
        const fontSize = node.style.fontSize;
        const fontWeight = node.style.fontWeight;
        const lineHeight = node.style.lineHeightPx || node.style.lineHeightPercentFontSize;
        
        if (fontFamily) {
          const key = `${fontFamily}-${fontWeight || 'normal'}`;
          if (!typographyMap.has(key)) {
            typographyMap.set(key, {
              fontFamily: fontFamily,
              fontSize: fontSize,
              fontWeight: fontWeight || 'normal',
              lineHeight: lineHeight
            });
            typography.push(typographyMap.get(key));
          }
        }
      }
      
      // Check for style references
      if (node.styles) {
        // Handle style references if they exist
      }
      
      // Traverse children
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverseNode(child));
      }
    }
    
    if (file.document) {
      traverseNode(file.document);
    }
    
    // If autoApply is true, update the content
    if (autoApply) {
      const content = await getContent();
      
      // Update colors if we found any
      if (colors.length > 0) {
        content.colors = colors;
      }
      
      // Update typography if we found any
      if (typography.length > 0) {
        const primaryFont = typography[0]?.fontFamily || content.typography?.primary || '';
        const secondaryFont = typography[1]?.fontFamily || content.typography?.secondary || primaryFont;
        if (!content.typography) {
          content.typography = {};
        }
        content.typography.primary = primaryFont;
        content.typography.secondary = secondaryFont;
      }
      
      await saveContent(content);
      
      // Regenerate CSS if typography was updated
      if (typography.length > 0) {
        await generateTypographyCSSFromPrimarySecondary(content);
      }
    }
    
    res.json({
      success: true,
      colors: colors,
      typography: typography,
      file: {
        name: file.name,
        key: fileKey,
        lastModified: file.lastModified,
        version: file.version
      },
      autoApplied: autoApply
    });
  } catch (error) {
    console.error('Error syncing from Figma:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Brand Toolkit server running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
  console.log(`API: http://localhost:${PORT}/api/content`);
  console.log(`Figma API connected for user: annafranques@gmail.com`);
});


