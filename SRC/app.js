require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const appInsights = require('applicationinsights');

const httpsRedirect = require('./middleware/httpsRedirect');
const { securityMiddleware } = require('./middleware/security');
const uploadRoutes = require('./routes/upload');

const app = express();

// App Insights
appInsights.setup(process.env.APPINSIGHTS_CONNECTION_STRING).start();

// Middleware
app.use(securityMiddleware);
app.use(httpsRedirect);

// Routes
app.use('/upload', uploadRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
