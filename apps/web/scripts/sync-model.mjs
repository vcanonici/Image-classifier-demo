import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(scriptDir, "..");
const source = resolve(webDir, "../../models/mnist-784-16-16-10.json");
const destination = resolve(webDir, "public/model.json");

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
console.log(`Modelo sincronizado em ${destination}`);
