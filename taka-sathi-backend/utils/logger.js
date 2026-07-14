/* Lightweight logger — swap for winston/pino post-hackathon if needed. */
const timestamp = () => new Date().toISOString();

module.exports = {
  info: (...args) => console.log(`[INFO ${timestamp()}]`, ...args),
  warn: (...args) => console.warn(`[WARN ${timestamp()}]`, ...args),
  error: (...args) => console.error(`[ERROR ${timestamp()}]`, ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG ${timestamp()}]`, ...args);
    }
  },
};
