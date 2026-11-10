import { createApp } from "./app.js";
import { config } from "./config.js";

// Điểm khởi động server API
createApp().listen(config.port, () => {
  console.log(`API đang chạy tại http://localhost:${config.port}`);
});
