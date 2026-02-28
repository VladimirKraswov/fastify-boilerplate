import { Type } from '@sinclair/typebox';

export const RegisterBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 })
});

export const LoginBody = RegisterBody;

export const AuthResponse = Type.Object({
  accessToken: Type.String(),
  refreshToken: Type.Optional(Type.String()),
  sessionId: Type.Optional(Type.String())
});

export const RefreshBody = Type.Object({
  sessionId: Type.String(),
  refreshToken: Type.String()
});
