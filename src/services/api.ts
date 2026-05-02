import axios from "axios";
import { API_ROOT } from "./apiConfig";

const api = axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
});

type CachedEntry = {
  expiresAt: number;
  data: unknown;
};

const GET_CACHE_TTL_MS = 10000;
const getCache = new Map<string, CachedEntry>();
const inflightGet = new Map<string, Promise<any>>();

const buildCacheKey = (config: any) => {
  const method = String(config?.method || "get").toLowerCase();
  const base = String(config?.baseURL || "");
  const url = String(config?.url || "");
  const params = config?.params ? JSON.stringify(config.params) : "";
  return `${method}|${base}|${url}|${params}`;
};

const originalGet = api.get.bind(api);

api.get = (async (url: string, config: any = {}) => {
  const mergedConfig = { ...config, method: "get", url };
  const key = buildCacheKey({ ...mergedConfig, baseURL: api.defaults.baseURL });
  const now = Date.now();

  const cached = getCache.get(key);
  if (cached && cached.expiresAt > now) {
    return Promise.resolve({
      data: cached.data,
      status: 200,
      statusText: "OK",
      headers: {},
      config: mergedConfig,
      request: undefined,
    });
  }

  const ongoing = inflightGet.get(key);
  if (ongoing) {
    return ongoing;
  }

  const request = originalGet(url, config)
    .then((response) => {
      getCache.set(key, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        data: response.data,
      });
      return response;
    })
    .finally(() => {
      inflightGet.delete(key);
    });

  inflightGet.set(key, request);
  return request;
}) as typeof api.get;

export default api;


