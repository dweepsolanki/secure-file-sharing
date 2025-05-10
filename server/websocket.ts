import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { storage } from "./storage";
import { FileWithSharing, User } from "@shared/schema";

// Map to track connected clients by userId
const clients = new Map<number, WebSocket[]>();

// Message types
type WebSocketMessage = {
  type: string;
  data: any;
};

// WebSocket event handler
export function setupWebSockets(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log(`WebSocket connection established from ${req.socket.remoteAddress}`);
    
    let userId: number | null = null;
    
    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString()) as WebSocketMessage;
        
        // Handle authentication
        if (parsedMessage.type === 'authenticate') {
          userId = parsedMessage.data.userId;
          
          // Add client to the map
          if (userId) {
            if (!clients.has(userId)) {
              clients.set(userId, []);
            }
            clients.get(userId)?.push(ws);
            
            // Send initial data
            sendInitialData(ws, userId);
            
            console.log(`WebSocket authenticated for user ${userId}`);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          data: { message: 'Invalid message format' } 
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (userId) {
        // Remove client from the map
        const userClients = clients.get(userId) || [];
        const index = userClients.indexOf(ws);
        if (index !== -1) {
          userClients.splice(index, 1);
        }
        
        if (userClients.length === 0) {
          clients.delete(userId);
        }
        
        console.log(`WebSocket connection closed for user ${userId}`);
      }
    });
  });
  
  return wss;
}

// Send initial data to a newly connected client
async function sendInitialData(ws: WebSocket, userId: number) {
  try {
    // Send user's files
    const files = await storage.getFilesByOwnerId(userId);
    sendMessage(ws, 'files', files);
    
    // Send shared files
    const sharedFiles = await storage.getSharedFilesByUserId(userId);
    sendMessage(ws, 'sharedFiles', sharedFiles);
  } catch (error) {
    console.error('Error sending initial data:', error);
  }
}

// Helper to send a message to a WebSocket client
function sendMessage(ws: WebSocket, type: string, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, data }));
  }
}

// Broadcast events to relevant users
export function broadcastFileChange(file: FileWithSharing) {
  try {
    // Send to file owner
    broadcastToUser(file.ownerId, 'fileUpdate', file);
    
    // Send to users with shared access
    if (file.sharedWith) {
      for (const sharedFile of file.sharedWith) {
        broadcastToUser(sharedFile.userId, 'fileUpdate', file);
      }
    }
  } catch (error) {
    console.error('Error broadcasting file change:', error);
  }
}

export function broadcastFileShare(fileId: number, userId: number) {
  try {
    // Get file with sharings
    storage.getFile(fileId).then(file => {
      if (file) {
        broadcastToUser(userId, 'newSharedFile', file);
      }
    });
  } catch (error) {
    console.error('Error broadcasting file share:', error);
  }
}

export function broadcastFileDelete(fileId: number, affectedUserIds: number[]) {
  try {
    for (const userId of affectedUserIds) {
      broadcastToUser(userId, 'fileDeleted', { id: fileId });
    }
  } catch (error) {
    console.error('Error broadcasting file deletion:', error);
  }
}

export function broadcastUserUpdate(user: User) {
  try {
    // Broadcast user updates to admins
    storage.getAllUsers().then(users => {
      const adminIds = users
        .filter(u => u.role === 'admin')
        .map(u => u.id);
      
      for (const adminId of adminIds) {
        broadcastToUser(adminId, 'userUpdate', user);
      }
    });
  } catch (error) {
    console.error('Error broadcasting user update:', error);
  }
}

export function broadcastKeyUpdate(keyId: number) {
  try {
    storage.getAllUsers().then(users => {
      const adminIds = users
        .filter(u => u.role === 'admin')
        .map(u => u.id);
      
      for (const adminId of adminIds) {
        broadcastToUser(adminId, 'keyUpdate', { id: keyId });
      }
    });
  } catch (error) {
    console.error('Error broadcasting key update:', error);
  }
}

// Helper to broadcast a message to a specific user's connected clients
function broadcastToUser(userId: number, type: string, data: any) {
  const userClients = clients.get(userId) || [];
  
  for (const client of userClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type, data }));
    }
  }
}
