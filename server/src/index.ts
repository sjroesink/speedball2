import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT) || 3000;
const wss = new WebSocketServer({ port: PORT });
console.log(`Speedball 2 server listening on port ${PORT}`);

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});
