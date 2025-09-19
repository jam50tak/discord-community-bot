# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create config directory
RUN mkdir -p config

# Expose port (Railway will set PORT env var)
EXPOSE $PORT

# Start the bot
CMD ["npm", "start"]