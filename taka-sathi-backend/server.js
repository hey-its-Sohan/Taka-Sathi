require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const gemmaConfig = require('./config/gemmaConfig');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`TakaSathi backend running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(
      `Gemma 4 inference: ${gemmaConfig.mockMode ? 'MOCK MODE (no live model calls)' : `${gemmaConfig.baseUrl} (model: ${gemmaConfig.model})`}`
    );
  });
};

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// Guard against unhandled promise rejections crashing the process silently
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
