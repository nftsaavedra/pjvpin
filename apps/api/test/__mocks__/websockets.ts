export function WebSocketGateway() {
  return function () {};
}

export function WebSocketServer() {
  return function () {};
}

export interface OnGatewayConnection {
  handleConnection: (...args: unknown[]) => void;
}

export interface OnGatewayDisconnect {
  handleDisconnect: (...args: unknown[]) => void;
}
