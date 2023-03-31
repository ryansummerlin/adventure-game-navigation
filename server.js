const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      newPlayerTemplate = fs.readFileSync('./views/new-player.html', 'utf-8');
      newPlayerPage = newPlayerTemplate
        .replace(/#{availableRooms}/g, world.availableRoomsToString());

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      return res.end(newPlayerPage);
    }

    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === '/player') {
      let [name, roomId] = [req.body.name, req.body.roomId];
      player = new Player(name, world.rooms[roomId]);

      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${roomId}`);
      return res.end();
    }

    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      const roomId = urlParts[2];
      if (urlParts.length === 3 && world.rooms[roomId]) {
        const room = player.currentRoom;
        const roomName = room.name;
        const roomItems = room.items.map(item => item.name);
        const inventory = player.items.map(item => item.name);
        const exits = room.exits;
        let exitsArr = [];
        for (let key in exits) {
          exitsArr.push(key + ": " + exits[key].name);
        }

        const roomTemplate = fs.readFileSync('./views/room.html', 'utf-8');
        const roomPage = roomTemplate
          .replace(/#{roomName}/g, roomName)
          .replace(/#{roomItems}/g, roomItems.join(', '))
          .replace(/#{inventory}/g, inventory.join(', '))
          .replace(/#{exits}/g, exitsArr.join(', '));

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        return res.end(roomPage);
      }
    }

    // Phase 4: GET /rooms/:roomId/:direction

    // Phase 5: POST /items/:itemId/:action

    // Phase 6: Redirect if no matching route handlers
  })
});

const port = 3000;

server.listen(port, () => console.log('Server is listening on port', port));
