import axios from "axios";
import { API_ROOT } from "./apiConfig";

export default axios.create({
  baseURL: API_ROOT,
  timeout: 15000,
});


