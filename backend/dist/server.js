import { createApp } from "./app.js";
import { env } from "./config/env.js";
const app = createApp();
// Starts the HTTP server on the configured port.
app.listen(env.port, () => {
    console.log(`Backend server running on http://localhost:${env.port}`);
});
