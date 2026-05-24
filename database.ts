import { MongoClient, Collection } from "mongodb";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { Motorcycle, Manufacturer, User } from "./types";

dotenv.config();

export const MONGODB_URI = process.env.MONGODB_URI ?? "";
const client = new MongoClient(MONGODB_URI);

export const motorcycleCollection: Collection<Motorcycle> = client
  .db("motorapp")
  .collection<Motorcycle>("motorcycles");

export const manufacturerCollection: Collection<Manufacturer> = client
  .db("motorapp")
  .collection<Manufacturer>("manufacturers");

export const userCollection: Collection<User> = client
  .db("motorapp")
  .collection<User>("users");

const MOTORCYCLES_URL =
  "https://raw.githubusercontent.com/Alikilic3/motor-api-data/refs/heads/main/motorcycles.json";
const MANUFACTURERS_URL =
  "https://raw.githubusercontent.com/Alikilic3/motor-api-data/refs/heads/main/manufacturers.json";

async function createInitialUsers() {
  if ((await userCollection.countDocuments()) > 0) {
    return;
  }
  await userCollection.insertMany([
    {
      email: "admin@motorapp.be",
      password: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
    {
      email: "user@motorapp.be",
      password: await bcrypt.hash("user123", 10),
      role: "USER",
    },
  ]);
}

async function seed() {
  if ((await motorcycleCollection.countDocuments()) === 0) {
    const response = await fetch(MOTORCYCLES_URL);
    const motorcycles: Motorcycle[] = await response.json();
    await motorcycleCollection.insertMany(motorcycles);
  }

  if ((await manufacturerCollection.countDocuments()) === 0) {
    const response = await fetch(MANUFACTURERS_URL);
    const manufacturers: Manufacturer[] = await response.json();
    await manufacturerCollection.insertMany(manufacturers);
  }
}

export async function login(email: string, password: string) {
  if (email === "" || password === "") {
    throw new Error("Email en wachtwoord zijn verplicht");
  }

  const user = await userCollection.findOne({ email: email });

  if (!user) {
    throw new Error("Gebruiker niet gevonden");
  }

  const isCorrect = await bcrypt.compare(password, user.password!);

  if (!isCorrect) {
    throw new Error("Wachtwoord is incorrect");
  }

  return user;
}
async function exit() {
  await client.close();
  process.exit(0);
}

export async function connecteer() {
  await client.connect();
  await createInitialUsers();
  await seed();
  process.on("SIGINT", exit);
}
