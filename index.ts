import bcrypt from "bcrypt";
import {
  connecteer,
  motorcycleCollection,
  manufacturerCollection,
  userCollection,
  login,
} from "./database";
import express from "express";
import path from "path";
import { Motorcycle, Manufacturer } from "./types";
import sessionMiddleware from "./session";
import { secureMiddleware } from "./secure";

const app = express();

app.use(sessionMiddleware);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.set("port", 3000);

app.get("/", secureMiddleware, async (req, res) => {
  const zoekTerm = typeof req.query.search === "string" ? req.query.search : "";
  const sorteerVeld =
    typeof req.query.sortField === "string" ? req.query.sortField : "name";
  const sorteerDirectie =
    typeof req.query.sortDirection === "string"
      ? req.query.sortDirection
      : "asc";

  let motorcycles = await motorcycleCollection.find({}).toArray();

  if (zoekTerm) {
    motorcycles = motorcycles.filter((moto) =>
      moto.name.toLowerCase().includes(zoekTerm.toLowerCase()),
    );
  }

  motorcycles = motorcycles.sort((a, b) => {
    if (sorteerVeld === "name") {
      return sorteerDirectie === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sorteerVeld === "engineCapacity") {
      return sorteerDirectie === "asc"
        ? a.engineCapacity - b.engineCapacity
        : b.engineCapacity - a.engineCapacity;
    } else if (sorteerVeld === "category") {
      return sorteerDirectie === "asc"
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category);
    }
    return 0;
  });

  res.render("index", {
    motorcycles: motorcycles,
    search: zoekTerm,
    sortField: sorteerVeld,
    sortDirection: sorteerDirectie,
  });
});

app.get("/detail/:id", secureMiddleware, async (req, res) => {
  const id = req.params.id;
  const motorcycle = await motorcycleCollection.findOne({ id: id });

  if (!motorcycle) {
    res.status(404).send("Motor niet gevonden");
    return;
  }

  res.render("detail", { motorcycle: motorcycle });
});

app.get("/manufacturers", secureMiddleware, async (req, res) => {
  const manufacturers = await manufacturerCollection.find({}).toArray();
  res.render("manufacturers", { manufacturers: manufacturers });
});

app.get("/manufacturers/:id", secureMiddleware, async (req, res) => {
  const id = req.params.id;
  const manufacturer = await manufacturerCollection.findOne({ id: id });

  if (!manufacturer) {
    res.status(404).send("Fabrikant niet gevonden");
    return;
  }

  const manufacturerMotorcycles = await motorcycleCollection
    .find({ "manufacturer.id": id })
    .toArray();

  res.render("manufacturerDetail", {
    manufacturer: manufacturer,
    motorcycles: manufacturerMotorcycles,
  });
});

app.get("/edit/:id", secureMiddleware, async (req, res) => {
  const id = req.params.id;
  const motorcycle = await motorcycleCollection.findOne({ id: id });

  if (!motorcycle) {
    res.status(404).send("Motor niet gevonden");
    return;
  }

  res.render("edit", { motorcycle: motorcycle });
});

app.post("/edit/:id", secureMiddleware, async (req, res) => {
  const id = req.params.id;

  const updatedMotorcycle = {
    name: req.body.name,
    description: req.body.description,
    engineCapacity: parseInt(req.body.engineCapacity),
    category: req.body.category,
    isAvailable: req.body.isAvailable === "true",
  };

  await motorcycleCollection.updateOne({ id: id }, { $set: updatedMotorcycle });
  res.redirect("/detail/" + id);
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
    return;
  }
  res.render("login", { error: "" });
});

app.post("/login", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await login(email, password);
    delete user.password;
    req.session.user = user;
    res.redirect("/");
  } catch (e: any) {
    res.render("login", { error: e.message });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});
app.get("/register", (req, res) => {
  if (req.session.user) {
    res.redirect("/");
    return;
  }
  res.render("register", { error: "" });
});

app.post("/register", async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (await userCollection.findOne({ email: email })) {
    res.render("register", { error: "Dit emailadres is al in gebruik" });
    return;
  }

  await userCollection.insertOne({
    email: email,
    password: await bcrypt.hash(password, 10),
    role: "USER",
  });

  res.redirect("/login");
});
app.listen(app.get("port"), async () => {
  try {
    await connecteer();
    console.log("Server draait op http://localhost:" + app.get("port"));
  } catch (error) {
    console.error(error);
  }
});
