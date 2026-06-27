import fs from "fs";
import zlib from "zlib";
import sax from "sax";

const input = process.env.DISCOGS_RELEASES_XML_GZ;
const output = process.env.OUTPUT_CSV || "/root/collector-intelligence-data/discogs/release_reference_vinyl_10m.csv";
const limit = Number(process.env.LIMIT || 10000000);

if (!input) {
  console.error("Missing DISCOGS_RELEASES_XML_GZ");
  process.exit(1);
}

fs.mkdirSync("/root/collector-intelligence-data/discogs", { recursive: true });

const out = fs.createWriteStream(output);
out.write("discogs_release_id,artist,title,year,country,format,label,catalog_number,genres,styles,master_id\n");

function csv(v) {
  if (v == null) return "";
  return `"${String(v).replaceAll('"', '""').replaceAll("\n", " ").trim()}"`;
}

let count = 0, seen = 0, current = null, text = "", path = [], currentFormat = null, currentLabel = null;
const parser = sax.createStream(true, { trim: true });

parser.on("opentag", node => {
  path.push(node.name);
  text = "";
  if (node.name === "release") {
    seen++;
    current = { id: node.attributes.id || "", artist: "", title: "", year: "", country: "", formats: [], labels: [], catnos: [], genres: [], styles: [], master_id: "" };
  }
  if (current && node.name === "format") currentFormat = node.attributes.name || "";
  if (current && node.name === "label") {
    currentLabel = node.attributes.name || "";
    if (node.attributes.catno) current.catnos.push(node.attributes.catno);
  }
});

parser.on("text", t => { text += t; });

parser.on("closetag", name => {
  if (!current) { path.pop(); return; }

  const parent = path[path.length - 2];

  if (name === "name" && parent === "artist" && !current.artist) current.artist = text;
  if (name === "title" && parent === "release") current.title = text;
  if (name === "released" && parent === "release") {
    const y = String(text).match(/[0-9]{4}/);
    if (y) current.year = y[0];
  }
  if (name === "country" && parent === "release") current.country = text;
  if (name === "format" && currentFormat) { current.formats.push(currentFormat); currentFormat = null; }
  if (name === "label" && currentLabel) { current.labels.push(currentLabel); currentLabel = null; }
  if (name === "genre") current.genres.push(text);
  if (name === "style") current.styles.push(text);
  if (name === "master_id") current.master_id = text;

  if (name === "release") {
    const isVinyl = current.formats.some(f => String(f).toLowerCase().includes("vinyl"));
    if (isVinyl) {
      out.write([
        csv(current.id),
        csv(current.artist),
        csv(current.title),
        csv(current.year),
        csv(current.country),
        csv([...new Set(current.formats)].join("|")),
        csv([...new Set(current.labels)].join("|")),
        csv([...new Set(current.catnos)].join("|")),
        csv([...new Set(current.genres)].join("|")),
        csv([...new Set(current.styles)].join("|")),
        csv(current.master_id)
      ].join(",") + "\n");

      count++;
      if (count % 10000 === 0) console.log(JSON.stringify({ time: new Date().toISOString(), seen, vinyl: count }));
      if (count >= limit) {
        console.log(`DONE vinyl ${count}`);
        out.end();
        process.exit(0);
      }
    }
    current = null;
  }

  text = "";
  path.pop();
});

fs.createReadStream(input)
  .pipe(zlib.createGunzip())
  .pipe(parser);
