const axios = require("axios");
const fs = require("fs");
const path = require("path");

axios({
  method: "get",
  url: "https://plus.wikitree.com/Chrome/templatesExp.json",
  responseType: "stream",
}).then((response) => {
  const outputPath = path.join(__dirname, "public", "features", "wtPlus", "templatesExp.json");
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  writer.on("finish", () => {
    console.log("File downloaded and replaced successfully");
  });

  writer.on("error", (err) => {
    console.error("There was an error writing the file", err);
  });
});
