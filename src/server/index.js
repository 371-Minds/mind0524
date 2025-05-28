require('dotenv').config();
const express = require('express');
const path = require('path');
const Joi = require('joi');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const https = require('https');
const fs = require('fs');
const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Global rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000), // Default: 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // Default: 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// API-specific stricter rate limits
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000), // Default: 5 minutes
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || 50), // Default: 50 API requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many API requests, please try again later.'
  }
});

// Apply stricter rate limiting to API routes
app.use('/api/', apiLimiter);

// Middleware for parsing JSON and URL-encoded data
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../build')));

// Input validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    // Validate request based on the schema provided
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Ignore unknown props
      stripUnknown: true // Remove unknown props
    };

    // Validate based on request method
    const dataToValidate = req.method === 'GET' ? req.query : req.body;
    const { error, value } = schema.validate(dataToValidate, validationOptions);
    
    if (error) {
      // Return validation errors
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data',
        details: error.details.map(detail => ({
          message: detail.message,
          path: detail.path
        }))
      });
    }
    
    // Replace request data with validated data
    if (req.method === 'GET') {
      req.query = value;
    } else {
      req.body = value;
    }
    
    next();
  };
};

// Schema definitions for API endpoints
const schemas = {
  systemStatus: Joi.object({}),
  
  // Add more schemas for other endpoints as needed
  agents: {
    create: Joi.object({
      name: Joi.string().required().min(1).max(100),
      type: Joi.string().required(),
      description: Joi.string().allow('').max(500),
      config: Joi.object().unknown(true)
    }),
    update: Joi.object({
      name: Joi.string().min(1).max(100),
      type: Joi.string(),
      description: Joi.string().allow('').max(500),
      config: Joi.object().unknown(true)
    })
  },
  
  knowledgeGraph: {
    addNode: Joi.object({
      label: Joi.string().required().min(1).max(100),
      type: Joi.string().required(),
      properties: Joi.object().unknown(true)
    }),
    addEdge: Joi.object({
      source: Joi.string().required(),
      target: Joi.string().required(),
      label: Joi.string().required().min(1).max(100),
      properties: Joi.object().unknown(true)
    })
  },
  
  tasks: {
    create: Joi.object({
      title: Joi.string().required().min(1).max(200),
      description: Joi.string().allow('').max(1000),
      agentId: Joi.string().required(),
      priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
      deadline: Joi.date().iso().allow(null)
    })
  },
  
  memory: {
    store: Joi.object({
      content: Joi.string().required(),
      metadata: Joi.object().unknown(true),
      tags: Joi.array().items(Joi.string())
    }),
    query: Joi.object({
      query: Joi.string().required().min(1),
      limit: Joi.number().integer().min(1).max(100).default(10)
    })
  }
};

// API routes with validation
app.get('/api/system/status', validateRequest(schemas.systemStatus), (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Example of POST endpoint with validation
app.post('/api/agents', validateRequest(schemas.agents.create), (req, res) => {
  // Process the validated request
  // This is just a placeholder - actual implementation would depend on your business logic
  res.status(201).json({
    id: 'agent-' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString()
  });
});

// Example of PUT endpoint with validation
app.put('/api/agents/:id', validateRequest(schemas.agents.update), (req, res) => {
  const { id } = req.params;
  
  // Validate ID parameter separately
  const idSchema = Joi.string().required().pattern(/^[a-zA-Z0-9-_]+$/);
  const { error } = idSchema.validate(id);
  
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid agent ID format',
      details: error.details
    });
  }
  
  // Process the validated request
  // This is just a placeholder
  res.json({
    id,
    ...req.body,
    updatedAt: new Date().toISOString()
  });
});

// Add more API endpoints with validation here

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../build/index.html'));
});

const port = process.env.PORT || 3001;
const httpsPort = process.env.HTTPS_PORT || 3443;

// Function to check if SSL certificates exist
const sslCertificatesExist = () => {
  try {
    return fs.existsSync(process.env.SSL_KEY_PATH) && fs.existsSync(process.env.SSL_CERT_PATH);
  } catch (error) {
    console.error('Error checking SSL certificates:', error);
    return false;
  }
};

// HTTPS server setup
if (process.env.NODE_ENV === 'production' && sslCertificatesExist()) {
  // HTTPS options
  const httpsOptions = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };

  // Create HTTPS server
  https.createServer(httpsOptions, app).listen(httpsPort, () => {
    console.log(`HTTPS Server running on port ${httpsPort}`);
  });

  // Redirect HTTP to HTTPS in production
  const httpApp = express();
  httpApp.use((req, res) => {
    res.redirect(`https://${req.hostname}:${httpsPort}${req.url}`);
  });
  
  httpApp.listen(port, () => {
    console.log(`HTTP Server running on port ${port} (redirecting to HTTPS)`);
  });
} else {
  // Development or no SSL certificates - use HTTP
  app.listen(port, () => {
    console.log(`HTTP Server running on port ${port}`);
    if (process.env.NODE_ENV === 'production') {
      console.warn('Warning: Running in production without HTTPS. This is not recommended.');
    }
  });
}