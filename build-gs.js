// อัปเดต TYPES/GROUPS ใน apps-script/Code.gs ให้ตรงกับ content.js — รัน: node build-gs.js
const fs = require("fs");
const vm = require("vm");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/content.js", "utf8") + ";this.TYPES=TYPES;this.GROUPS=GROUPS;", ctx);
const p = __dirname + "/apps-script/Code.gs";
let gs = fs.readFileSync(p, "utf8");
gs = gs.replace(/var GROUPS = \/\*GROUPS\*\/[\s\S]*?;\n/, "var GROUPS = /*GROUPS*/" + JSON.stringify(ctx.GROUPS) + ";\n");
gs = gs.replace(/var TYPES = \/\*TYPES\*\/[\s\S]*?\];\n/, "var TYPES = /*TYPES*/" + JSON.stringify(ctx.TYPES, null, 1) + ";\n");
fs.writeFileSync(p, gs);
console.log("updated", ctx.TYPES.length, "types");
