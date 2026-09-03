import { Module, Global } from "@nestjs/common";

export class EventEmitter2 {
  emit = jest.fn();
  on = jest.fn();
  off = jest.fn();
}

export function OnEvent() {
  return function () {};
}

@Global()
@Module({
  providers: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
  exports: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
})
export class EventEmitterModule {
  static forRoot() {
    return {
      module: EventEmitterModule,
      global: true,
      providers: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
      exports: [{ provide: EventEmitter2, useValue: new EventEmitter2() }],
    };
  }
}
