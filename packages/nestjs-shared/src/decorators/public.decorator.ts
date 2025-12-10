import 'reflect-metadata';

export const IS_PUBLIC_KEY = 'isPublic';

export function Public(): MethodDecorator & ClassDecorator {
  return (target: object, propertyKey?: string | symbol) => {
    const keyTarget = propertyKey ? target[propertyKey as keyof object] : target;
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, keyTarget);
  };
}
