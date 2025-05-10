export function createWebSocketConnection() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;
  
  return new WebSocket(wsUrl);
}

export function sendAuthMessage(socket: WebSocket, userId: number) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'authenticate',
      data: { userId }
    }));
  }
}

export function sendMessage(socket: WebSocket, type: string, data: any) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type, data }));
  }
}
