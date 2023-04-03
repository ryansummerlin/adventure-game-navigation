const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const returnError = function() {
  const errorTemplate = fs.readFileSync('./views/error.html', 'utf-8');
  const roomId = player.currentRoom.id;
  const errorPage = errorTemplate
    .replace(/#{roomId}/g, roomId)
    .replace(/#{errorMessage}/g, 'Something went wrong');

  return errorPage;
}

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
        const roomItems = room.itemsToString();
        const inventory = player.inventoryToString();
        const exits = room.exitsToString();


        const roomTemplate = fs.readFileSync('./views/room.html', 'utf-8');
        const roomPage = roomTemplate
          .replace(/#{roomName}/g, roomName)
          .replace(/#{roomItems}/g, roomItems)
          .replace(/#{inventory}/g, inventory)
          .replace(/#{exits}/g, exits);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        return res.end(roomPage);
      }
    }

    // Phase 4: GET /rooms/:roomId/:direction
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      const roomId = urlParts[2];
      const direction = urlParts[3][0];
      const possibleDirections = 'nwes';
      if (urlParts.length === 4 && possibleDirections.includes(direction)) {
        try {
          player.move(direction);
        } catch {
          console.log("You can't do that!");
        }
      }

      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${roomId}`);
      return res.end();
    }

    // Phase 5: POST /items/:itemId/:action
    if (req.method === 'POST' && req.url.startsWith('/items/')) {
      const urlParts = req.url.split('/');
      const itemId = urlParts[2];
      const action = urlParts[3];
      const roomId = player.currentRoom.id;

      switch(action) {
        case 'take':
          player.takeItem(itemId);
          break;
        case 'eat':
          try {
            player.eatItem(itemId);
          } catch {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            return res.end(returnError());
          }
          break;
        case 'drop':
          player.dropItem(itemId);
          break;
      }

      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${roomId}`);
      return res.end();
    }

    // Phase 6: Redirect if no matching route handlers

    // const roomId = player.currentRoom.id;
    // res.statusCode = 302;
    // res.setHeader('Location', `/rooms/${roomId}`);
    // return res.end();

  })
});

const port = 3000;

server.listen(port, () => console.log('Server is listening on port', port));
