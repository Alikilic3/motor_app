import express from "express";
import path from "path";
import { Motorcycle } from "./types";

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.set("port", 3000);

const MOTORCYCLES_URL =
  "https://raw.githubusercontent.com/Alikilic3/motor-api-data/refs/heads/main/motorcycles.json";

let motorcycles: Motorcycle[] = [];

//Haalt de data op van github en vult die in in de array motorcycles
async function fetchMotorcycles(): Promise<Motorcycle[]> {
  const response = await fetch(MOTORCYCLES_URL);
  if (!response.ok) {
    throw new Error(`Kon data niet ophalen: ${response.status}`);
  }
  const data: Motorcycle[] = await response.json();
  return data;
}

app.get("/", (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const sortField =
    typeof req.query.sortField === "string" ? req.query.sortField : "name";
  const sortDirection =
    typeof req.query.sortDirection === "string"
      ? req.query.sortDirection
      : "asc";

  let filtered = motorcycles.filter((moto) =>
    moto.name.toLowerCase().includes(search.toLowerCase()),
  );

  filtered = filtered.sort((a, b) => {
    if (sortField === "name") {
      return sortDirection === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortField === "engineCapacity") {
      return sortDirection === "asc"
        ? a.engineCapacity - b.engineCapacity
        : b.engineCapacity - a.engineCapacity;
    } else if (sortField === "category") {
      return sortDirection === "asc"
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category);
    }
    return 0;
  });

  res.render("index", {
    motorcycles: filtered,
    search: search,
    sortField: sortField,
    sortDirection: sortDirection,
  });
});

//We laden hierbij de data één keer op bij het opstarten van de server
app.listen(app.get("port"), async () => {
  try {
    motorcycles = await fetchMotorcycles();
    console.log("Data geladen: " + motorcycles.length + " motoren");
    console.log("Server draait op http://localhost:" + app.get("port"));
  } catch (error: any) {
    console.log("Fout bij laden data:", error.message);
  }
});
