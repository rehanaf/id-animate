const fs = require('fs');
const path = 'C:/Users/CENDANA SOLUSINDO/.gemini/antigravity-cli/brain/eba67591-42bc-4da2-b45c-63e81dd26c3a/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(path, 'utf8').split('\n');
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('export function App()') && lines[i].includes('CodeContent')) {
    fs.writeFileSync('app_recovery.json', lines[i]);
    console.log("Found in write_to_file!");
    break;
  }
}
