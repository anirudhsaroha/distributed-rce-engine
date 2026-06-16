API Gateway

- Express API with JWT auth
- MongoDB for application data (users, problems, submissions)
- Postgres available for analytics or relational data (pool exposed)
- Redis + BullMQ for submission queueing
- Socket.IO to push submission updates to clients

Use .env.example as a starting point. The docker-compose in /infrastructure sets up services with correct hostnames for containers.
