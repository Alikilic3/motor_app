import dotenv from "dotenv";
dotenv.config();

import session from "express-session";
import MongoStore from "connect-mongo";
import { User } from "./types";
import { MONGODB_URI } from "./database";

const mongoStore = MongoStore.create({
  mongoUrl: MONGODB_URI,
  dbName: "sessions",
  collectionName: "motorapp",
});

mongoStore.on("error", (error) => {
  console.error(error);
});

declare module "express-session" {
  export interface SessionData {
    user?: User;
  }
}

export default session({
  secret: process.env.SESSION_SECRET ?? "geheim-sleutel",
  store: mongoStore,
  resave: true,
  saveUninitialized: true,
});
