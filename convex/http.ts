import { httpRouter } from "convex/server";
import { auth } from "./auth.ts";

const http = httpRouter();

auth.addHttpRoutes(http);

export default http;
