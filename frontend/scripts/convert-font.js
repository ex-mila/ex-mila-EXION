// .ttf폰트 -> JS 모듈 형태 변환
const fs = require("fs");

const fontPath = "./fonts/NotoSansKR-Regular.ttf";         
const outputPath = "./fonts/NotoSansKR-normal.js";        

const fontData = fs.readFileSync(fontPath);
const base64 = fontData.toString("base64");

const jsContent = `const font = \`${base64}\`;\nexport default font;\n`;
fs.writeFileSync(outputPath, jsContent);

console.log("✅ 변환 완료: NotoSansKR-normal.js");
