export class Server {
  to = jest.fn().mockReturnThis();
  emit = jest.fn();
}

export function io() {
  return { on: jest.fn(), disconnect: jest.fn() };
}
