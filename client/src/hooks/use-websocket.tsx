import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useAuth } from "./use-auth";
import { createWebSocketConnection, sendAuthMessage } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";

type WebSocketContextType = {
  isConnected: boolean;
  reconnect: () => void;
};

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Function to establish a new connection
  const connect = () => {
    const newSocket = createWebSocketConnection();

    newSocket.onopen = () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
      
      // Authenticate if user is available
      if (user) {
        sendAuthMessage(newSocket, user.id);
      }
    };

    newSocket.onclose = () => {
      console.log("WebSocket connection closed");
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (user) {
          connect();
        }
      }, 5000);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    newSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    setSocket(newSocket);
  };

  // Reconnect function exposed to consumers
  const reconnect = () => {
    if (socket) {
      socket.close();
    }
    connect();
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: { type: string; data: any }) => {
    switch (message.type) {
      case "files":
        queryClient.setQueryData(["/api/files"], message.data);
        break;
      case "sharedFiles":
        queryClient.setQueryData(["/api/shared"], message.data);
        break;
      case "fileUpdate":
        queryClient.invalidateQueries({ queryKey: ["/api/files"] });
        queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
        break;
      case "fileDeleted":
        queryClient.invalidateQueries({ queryKey: ["/api/files"] });
        queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
        break;
      case "newSharedFile":
        queryClient.invalidateQueries({ queryKey: ["/api/shared"] });
        break;
      case "userUpdate":
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        break;
      case "keyUpdate":
        queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
        break;
      default:
        console.log("Unhandled WebSocket message type:", message.type);
    }
  };

  // Connect when user changes
  useEffect(() => {
    if (user && !socket) {
      connect();
    } else if (user && socket && isConnected) {
      sendAuthMessage(socket, user.id);
    } else if (!user && socket) {
      socket.close();
      setSocket(null);
    }
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ isConnected, reconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
