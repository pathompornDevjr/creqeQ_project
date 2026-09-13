/**
 * Redis Client Service
 * สร้างและส่งออก Upstash Redis REST Client สำหรับใช้งาน Caching, Rate Limiting และ Realtime Coordination
 */

import { Redis } from "@upstash/redis";
import envConfig from "../config/env.config";

export const redis = new Redis({
  url: envConfig.redis_url,
  token: envConfig.redis_token,
});
