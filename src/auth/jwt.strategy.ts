import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultsecret',
    });
  }

  /*async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }*/

  async validate(payload: any) {
    return {
      userId: payload.sub,        //Clave esperada por tus controladores
      email: payload.email,
      role: payload.role,
      nombreCompleto: payload.nombreCompleto, // opcional, ya lo tienes en el token
    };
  }
}
