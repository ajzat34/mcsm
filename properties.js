const defaultFile = `
#default
spawn-protection=16
max-tick-time=60000
query.port=25565
generator-settings=
sync-chunk-writes=true
force-gamemode=false
allow-nether=true
enforce-whitelist=false
gamemode=survival
broadcast-console-to-ops=true
enable-query=false
player-idle-timeout=0
difficulty=easy
spawn-monsters=true
broadcast-rcon-to-ops=true
op-permission-level=4
pvp=true
entity-broadcast-range-percentage=100
snooper-enabled=true
level-type=default
hardcore=false
enable-status=true
enable-command-block=false
max-players=20
network-compression-threshold=256
resource-pack-sha1=
max-world-size=29999984
function-permission-level=2
rcon.port=25575
server-port=25565
debug=false
server-ip=
spawn-npcs=true
allow-flight=false
level-name=world
view-distance=10
resource-pack=
spawn-animals=true
white-list=false
rcon.password=
generate-structures=true
max-build-height=256
online-mode=true
level-seed=
use-native-transport=true
prevent-proxy-connections=false
enable-jmx-monitoring=false
enable-rcon=false
motd=A Minecraft Server
`;

/**
* parse a server.properties file
* @param {string} file
* @return {object}
*/
function parse(file) {
  const lines = file.split('\n');
  const result = {};
  lines.forEach((line, i) => {
    line = line.trim();
    if (line.length < 1) return;
    if (line.startsWith('#')) return;
    let key; let value;
    [key, value] = line.split('=');
    key = key.trim(); value = value.trim();
    if (value.length < 1) value = null;
    if (key.length) {
      result[key] = value;
    }
  });
  return result;
}

const defaultSettings = parse(defaultFile);
const keys = Object.keys(defaultSettings);

/**
* turn an object into a server.properties file
* @param {object} data
* @return {string}
*/
function serialize(data) {
  let result = `#Minecraft server properties\n#${new Date()}\n\n`;
  keys.forEach((key, i) => {
    let value = data[key] || defaultSettings[key] || null;
    if (value === null) value = '';
    result += `${key}=${value}\n`;
  });
  result += `\n#generated by minecraft server manager\n`;
  return result;
}

module.exports.parse = parse;
module.exports.serialize = serialize;
