const fs = require("node:fs");
const path = require("node:path");

const WEB = path.join(__dirname, "..", "web");

function publicDir() {
  const bundled = path.join(WEB, ".next", "standalone", "public");
  if (fs.existsSync(bundled)) return [];
  return [{ from: "../web/public", to: "web/public" }];
}

module.exports = {
  appId: "app.lumen.planner",
  productName: "Lumen",
  directories: { output: "dist", buildResources: "build" },
  files: ["main.mjs", "preload.cjs", "splash.html", "package.json"],
  extraResources: [
    { from: "../web/.next/standalone", to: "web" },
    { from: "../web/.next/static", to: "web/.next/static" },
    ...publicDir(),
  ],
  mac: {
    icon: "build/icon.icns",
    category: "public.app-category.education",
    target: [{ target: "dmg", arch: ["arm64"] }],
  },
  win: {
    icon: "build/icon.ico",
    target: [{ target: "nsis", arch: ["x64"] }],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
  },
};
